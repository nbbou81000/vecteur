/* =====================================================================
   VECTEUR — moteur épidémique (Web Worker)
   Modèle SEIRD par cellule de 0,25° (≈ 28 km) sur toute la planète :
     S sains · E en incubation · I contagieux · R guéris · D morts
   - contagion locale (mélange de population dans la cellule)
   - contagion de proche en proche (déplacements quotidiens vers les cellules voisines)
   - voyages aériens réels (≈ 37 000 lignes, 12,3 millions de passagers par jour)
   Tirages aléatoires quand les effectifs sont petits : une épidémie peut s'éteindre.
   ===================================================================== */
'use strict';

const W = 1440, H = 720;               // grille 0,25°
let n = 0, cellIdx, N, S, E, I, R, D, Neff, dense;
let nbOff, nbIdx, nbW;                 // voisins (CSR)
let airCell, airLat, airLon, airDep, routeOff, routeTo, routeCum;
let activeList = [], everList = [], isActive, wasActive;
let tex, dirtyR0 = H, dirtyR1 = -1;
let P = null;                          // pathogène
let simT = null, startT = null, started = false;
let peoplePerDot = 6000;
let flights = [];
let totals = { S: 0, E: 0, I: 0, R: 0, D: 0, cases: 0 };
let history = [];
let lastPost = 0;

/* ---------- Aléatoire ---------- */
function poisson(l){
  if (l <= 0) return 0;
  if (l > 40) return Math.max(0, Math.round(l + Math.sqrt(l) * gauss()));
  const L = Math.exp(-l); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
function gauss(){ let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// Nombre de « succès » parmi `count` individus avec probabilité p (binomiale approchée)
function draw(count, p){
  if (count <= 0 || p <= 0) return 0;
  const m = count * p;
  if (count < 1) return Math.random() < m ? count : 0;
  if (m < 40) return Math.min(count, poisson(m));
  if (m > 400) return m;                  // grands effectifs : le hasard devient négligeable
  return Math.min(count, m + Math.sqrt(m * (1 - p)) * gauss());
}

/* ---------- Initialisation ---------- */
async function init(base, ppd){
  peoplePerDot = ppd;
  const [cb, air] = await Promise.all([
    fetch(base + 'data/cells.bin').then(r => r.arrayBuffer()),
    fetch(base + 'data/air.json').then(r => r.json())
  ]);
  n = new Uint32Array(cb, 0, 1)[0];
  cellIdx = new Uint32Array(cb, 4, n);
  const pop = new Float32Array(cb, 4 + 4 * n, n);
  N = new Float64Array(pop);
  S = new Float64Array(pop); E = new Float64Array(n); I = new Float64Array(n); R = new Float64Array(n); D = new Float64Array(n);
  dense = new Int32Array(W * H).fill(-1);
  for (let i = 0; i < n; i++) dense[cellIdx[i]] = i;
  // Voisinage : les 8 cellules autour (déplacements quotidiens)
  const off = [], idx = [], w = [];
  for (let i = 0; i < n; i++) {
    off.push(idx.length);
    const r = Math.floor(cellIdx[i] / W), c = cellIdx[i] % W;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr; if (rr < 0 || rr >= H) continue;
      const j = dense[rr * W + ((c + dc + W) % W)]; if (j < 0) continue;
      idx.push(j); w.push(dr && dc ? 0.03 : 0.045);
    }
  }
  off.push(idx.length);
  nbOff = Int32Array.from(off); nbIdx = Int32Array.from(idx); nbW = Float32Array.from(w);
  Neff = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = N[i]; for (let k = nbOff[i]; k < nbOff[i + 1]; k++) s += nbW[k] * N[nbIdx[k]]; Neff[i] = s; }
  // Aéroports et lignes
  const A = air.airports.length;
  airCell = new Int32Array(A); airLat = new Float32Array(A); airLon = new Float32Array(A); airDep = new Float64Array(A);
  air.airports.forEach((a, i) => { airLat[i] = a[3]; airLon[i] = a[4]; airCell[i] = dense[a[5]]; });
  const by = Array.from({ length: A }, () => []);
  for (const [a, b, f] of air.routes) { by[a].push([b, f]); airDep[a] += f; }
  routeOff = new Int32Array(A + 1); const rt = [], rc = [];
  for (let a = 0; a < A; a++) { routeOff[a] = rt.length; let s = 0; for (const [b, f] of by[a]) { s += f; rt.push(b); rc.push(s); } }
  routeOff[A] = rt.length; routeTo = Int32Array.from(rt); routeCum = Float64Array.from(rc);
  self.airNames = air.airports.map(a => a[1]);
  self.airByCell = new Map(); air.airports.forEach((a, i) => { if (airCell[i] >= 0) { const l = self.airByCell.get(airCell[i]) || []; l.push(i); self.airByCell.set(airCell[i], l); } });
  isActive = new Uint8Array(n); wasActive = new Uint8Array(n);
  tex = new Uint8Array(W * H * 4);
  postMessage({ type: 'ready', cells: n, airports: A, routes: rt.length });
}

function activate(i){
  if (!isActive[i]) { isActive[i] = 1; activeList.push(i); }
  if (!wasActive[i]) { wasActive[i] = 1; everList.push(i); }
}

/* ---------- Un pas de simulation (dt en jours) ---------- */
let accA = null, touched = [], isTouched = null;
function step(dt){
  if (!accA) { accA = new Float64Array(n); isTouched = new Uint8Array(n); }
  const beta = P.beta, sig = 1 - Math.exp(-P.sigma * dt), gam = 1 - Math.exp(-P.gamma * dt);
  // 1. Pression infectieuse : chaque cellule contagieuse « arrose » ses voisines
  for (const j of touched) { accA[j] = 0; isTouched[j] = 0; }
  touched = [];
  for (let q = 0; q < activeList.length; q++) {
    const i = activeList[q], inf = I[i]; if (inf <= 0) continue;
    if (!isTouched[i]) { isTouched[i] = 1; touched.push(i); } accA[i] += inf;
    for (let k = nbOff[i], e = nbOff[i + 1]; k < e; k++) {
      const j = nbIdx[k];
      if (!isTouched[j]) { isTouched[j] = 1; touched.push(j); }
      accA[j] += inf * nbW[k];
    }
  }
  // 2. Nouvelles infections
  for (const j of touched) {
    const a = accA[j];
    if (S[j] <= 0) continue;
    const p = 1 - Math.exp(-beta * (a / Neff[j]) * dt);
    const x = draw(S[j], p);
    if (x > 0) { S[j] -= x; E[j] += x; totals.cases += x; activate(j); }
  }
  // 3. Évolution de la maladie ; les cellules où l'épidémie est terminée sortent de la liste active
  const still = [];
  for (const i of activeList) {
    if (E[i] > 0) { const x = draw(E[i], sig); E[i] -= x; I[i] += x; }
    if (I[i] > 0) {
      const x = draw(I[i], gam);
      if (x > 0) { const d = draw(x, P.ifr); I[i] -= x; D[i] += d; R[i] += x - d; }
    }
    if (E[i] < 0.5 && I[i] < 0.5) { E[i] = I[i] = 0; isActive[i] = 0; } else still.push(i);
  }
  activeList = still;
  // 4. Voyages aériens : les personnes en incubation voyagent normalement, les malades un peu moins
  for (let a = 0; a < airCell.length; a++) {
    const c = airCell[a]; if (c < 0 || !isActive[c]) continue;
    const carriers = (E[c] + 0.4 * I[c]) / N[c];
    if (carriers <= 0) continue;
    const k = poisson(airDep[a] * dt * carriers);
    for (let t = 0; t < k; t++) {
      const r0 = routeOff[a], r1 = routeOff[a + 1]; if (r1 <= r0) break;
      const x = Math.random() * routeCum[r1 - 1];
      let lo = r0, hi = r1 - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (routeCum[m] < x) lo = m + 1; else hi = m; }
      const b = routeTo[lo], cb = airCell[b];
      if (cb < 0 || S[cb] < 1) continue;
      S[cb] -= 1; E[cb] += 1; totals.cases += 1; activate(cb);
      if (flights.length < 60) flights.push([airLon[a], airLat[a], airLon[b], airLat[b], self.airNames[a], self.airNames[b]]);
    }
  }
}

/* ---------- Texture d'état (4 octets par cellule) ---------- */
const enc = p => p <= 0 ? 0 : Math.min(255, Math.max(1, Math.round(Math.sqrt(Math.min(p, 1)) * 255)));
function writeTex(){
  let s = 0, e = 0, inf = 0, r = 0, d = 0;
  for (let i = 0; i < n; i++) { s += S[i]; }
  for (const i of everList) {
    e += E[i]; inf += I[i]; r += R[i]; d += D[i];
    const nn = N[i], minVis = Math.min(1, peoplePerDot / nn);
    const pI = I[i] >= 0.5 ? Math.max(I[i] / nn, minVis) : 0;
    const pE = E[i] >= 0.5 ? Math.max(E[i] / nn, minVis * 0.7) : 0;
    const o = cellIdx[i] * 4;
    tex[o] = enc(pI); tex[o + 1] = enc(pE); tex[o + 2] = enc(R[i] / nn); tex[o + 3] = enc(D[i] / nn);
    const row = (cellIdx[i] / W) | 0;
    if (row < dirtyR0) dirtyR0 = row; if (row + 1 > dirtyR1) dirtyR1 = row + 1;
  }
  totals.S = s; totals.E = e; totals.I = inf; totals.R = r; totals.D = d;
}

function post(){
  writeTex();
  const msg = { type: 'state', t: simT, day: (simT - startT) / 86400000, totals: { ...totals }, flights, active: activeList.length, touchedCells: everList.length };
  if (dirtyR1 > dirtyR0) {
    const rows = tex.slice(dirtyR0 * W * 4, dirtyR1 * W * 4);
    msg.r0 = dirtyR0; msg.r1 = dirtyR1; msg.rows = rows;
    postMessage(msg, [rows.buffer]);
  } else postMessage(msg);
  dirtyR0 = H; dirtyR1 = -1; flights = [];
}

/* ---------- Messages ---------- */
self.onmessage = async ev => {
  const m = ev.data;
  if (m.type === 'init') await init(m.base, m.peoplePerDot);
  else if (m.type === 'start') {
    P = m.pathogen;
    // remise à zéro
    S.set(N); E.fill(0); I.fill(0); R.fill(0); D.fill(0);
    for (const i of everList) { const o = cellIdx[i] * 4; tex[o] = tex[o + 1] = tex[o + 2] = tex[o + 3] = 0; }
    dirtyR0 = 0; dirtyR1 = H;
    isActive.fill(0); wasActive.fill(0); activeList = []; everList = []; totals = { S: 0, E: 0, I: 0, R: 0, D: 0, cases: 0 }; history = [];
    // patient zéro : cellule habitée la plus proche
    const row = Math.floor((90 - m.lat) / 0.25), col = Math.floor((m.lon + 180) / 0.25);
    let best = -1, bd = 1e9;
    for (let dr = -6; dr <= 6; dr++) for (let dc = -6; dc <= 6; dc++) {
      const rr = row + dr; if (rr < 0 || rr >= H) continue;
      const j = dense[rr * W + ((col + dc + W) % W)]; if (j < 0) continue;
      const d = dr * dr + dc * dc; if (d < bd) { bd = d; best = j; }
    }
    if (best < 0) { postMessage({ type: 'error', message: 'Aucune population à cet endroit : choisissez une zone habitée.' }); return; }
    const k = Math.min(m.count || 1, S[best]);
    S[best] -= k; I[best] += k; totals.cases = k; activate(best);
    simT = startT = m.t; started = true;
    post();
  }
  else if (m.type === 'stop') { started = false; }
  else if (m.type === 'advance' && started && P) {
    let target = m.t;
    if (target <= simT) return;
    // pas de 6 h ; si la simulation prend du retard (vitesse très élevée), les pas s'allongent
    const remaining = (target - simT) / 86400000;
    const steps = Math.min(Math.ceil(remaining / (6 / 24)), 24);
    const dt = remaining / steps;
    for (let s = 0; s < steps; s++) step(dt);
    simT = target;
    post();
  }
};
