/* =====================================================================
   VECTEUR — moteur épidémique mondial (Web Worker)
   Modèle SEIRD par cellule de 0,25° (≈ 28 km) sur toute la planète :
     S sains · E en incubation · I contagieux · R guéris (ou vaccinés) · D morts
   - contagion locale et de proche en proche (déplacements quotidiens)
   - voyages aériens réels (≈ 37 000 lignes, 12,3 millions de passagers par jour)
   - climat, pauvreté, ruralité, selon les capacités du pathogène (évolution)
   - réaction de chaque pays (231) : surveillance, gestes barrières, fermetures, confinement,
     frontières ; recherche mondiale d'un vaccin puis vaccination ; effondrement des pays
   Tirages aléatoires quand les effectifs sont petits : une épidémie peut s'éteindre.
   ===================================================================== */
'use strict';

const W = 1440, H = 720, DAY = 86400000;
let n = 0, cellIdx, N, S, E, I, R, D, Neff, dense;
let nbOff, nbIdx, nbW;
let airCell, airLat, airLon, airDep, routeOff, routeTo, routeCum;
let activeList = [], everList = [], isActive, wasActive;
let tex, dirtyR0 = H, dirtyR1 = -1;
let P = null, simT = null, startT = null, started = false, ended = false;
let peoplePerDot = 6000, flights = [], events = [];
let totals = { S: 0, E: 0, I: 0, R: 0, D: 0, cases: 0, V: 0 };
let cellLat, cellT, climate, envF, rural, climateDay = -1, lastDay = -1;
let boost = { cell: -1, until: 0, factor: 1 }, trips = [];
// Pays
let cc, CN = 0, cName, cPop, cGdp, cPov, cLevel, cClosed, cCollapsed, cSince, cInfected, cCases, cE, cI, cD, cR, cMult, cIfr, cVac, cQuiet, cBig;
let worldPop = 0, worldGdp = 0;
// Partie
let game = { mode: 'campagne', goal: 'infection', noResponse: false, noCure: false, research: 1 };
let evo = { r0: 1, lethal: 0, severity: 0, stealth: 0, cold: 0, heat: 0, drug: 0, cureSlow: 0, air: 0, water: 0, vector: 0, animal: 0, blood: 0 };
let who = false, cure = 0, cureDone = false, cureDay = 0, infCountries = 0;
// Cellule simulée personne par personne par la ville (le moteur mondial ne la simule plus lui-même)
let ctrl = { cell: -1, until: 0 }, extImports = 0;
// Foyer de chaque cellule : centre (0..1 dans la cellule) ; le rayon grandit avec le nombre de cas
let fcx, fcy, tex2;

/* ---------- Aléatoire ---------- */
function poisson(l){
  if (l <= 0) return 0;
  if (l > 40) return Math.max(0, Math.round(l + Math.sqrt(l) * gauss()));
  const L = Math.exp(-l); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}
// Loi gamma (Marsaglia-Tsang) : sert à la super-propagation (contagiosité très inégale)
function gamma(k){
  if (k < 1) return gamma(k + 1) * Math.pow(Math.random() || 1e-12, 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x, v; do { x = gauss(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = Math.random();
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; }
}
function gauss(){ let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function draw(count, p){
  if (count <= 0 || p <= 0) return 0;
  const m = count * p;
  if (count < 1) return Math.random() < m ? count : 0;
  if (m < 40) return Math.min(count, poisson(m));
  if (m > 400) return m;
  return Math.min(count, m + Math.sqrt(m * (1 - p)) * gauss());
}

/* ---------- Initialisation ---------- */
async function init(base, ppd){
  peoplePerDot = ppd;
  const [cb, air, cbin, cjson] = await Promise.all([
    fetch(base + 'data/cells.bin').then(r => r.arrayBuffer()),
    fetch(base + 'data/air.json').then(r => r.json()),
    fetch(base + 'data/cellcountry.bin').then(r => r.arrayBuffer()),
    fetch(base + 'data/countries.json').then(r => r.json())
  ]);
  n = new Uint32Array(cb, 0, 1)[0];
  cellIdx = new Uint32Array(cb, 4, n);
  const pop = new Float32Array(cb, 4 + 4 * n, n);
  N = new Float64Array(pop);
  S = new Float64Array(pop); E = new Float64Array(n); I = new Float64Array(n); R = new Float64Array(n); D = new Float64Array(n);
  cellLat = new Float32Array(n); cellT = new Float32Array(n); climate = new Float32Array(n).fill(1); envF = new Float32Array(n).fill(1); rural = new Float32Array(n);
  for (let i = 0; i < n; i++) { cellLat[i] = 90 - (Math.floor(cellIdx[i] / W) + 0.5) * 0.25; rural[i] = N[i] < 30000 ? 1 : N[i] < 200000 ? 0.5 : 0; }
  dense = new Int32Array(W * H).fill(-1);
  for (let i = 0; i < n; i++) dense[cellIdx[i]] = i;
  // Pays
  cc = new Uint16Array(cbin);
  CN = cjson.length;
  cName = cjson.map(c => c[1]); cPop = new Float64Array(CN); cGdp = new Float64Array(CN); cPov = new Float32Array(CN);
  cjson.forEach((c, k) => { cPop[k] = c[5]; cGdp[k] = c[2] * c[5]; cPov[k] = Math.min(1, Math.max(0, (c[3] - 1) / 4)); });
  worldPop = cPop.reduce((s, x) => s + x, 0); worldGdp = cGdp.reduce((s, x) => s + x, 0);
  cBig = cjson.map(c => c[5] > 20e6 || c[0] === 'FRA');
  const z = () => new Float64Array(CN);
  cLevel = new Uint8Array(CN); cClosed = new Uint8Array(CN); cCollapsed = new Uint8Array(CN); cSince = z(); cInfected = new Uint8Array(CN);
  cCases = z(); cE = z(); cI = z(); cD = z(); cR = z(); cMult = new Float32Array(CN).fill(1); cIfr = new Float32Array(CN); cVac = new Uint8Array(CN); cQuiet = z();
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
  isActive = new Uint8Array(n); wasActive = new Uint8Array(n);
  tex = new Uint8Array(W * H * 4); tex2 = new Uint8Array(W * H * 4);
  fcx = new Float32Array(n).fill(0.5); fcy = new Float32Array(n).fill(0.5);
  postMessage({ type: 'ready', cells: n, airports: A, routes: rt.length, countries: CN });
}

/* ---------- Climat et environnement ---------- */
// Température moyenne approchée (latitude + saison) ; aptitude aux vecteurs ; facteurs liés aux capacités du pathogène
function updateEnv(force){
  const d = new Date(simT), doy = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / DAY);
  if (doy === climateDay && !force) return; climateDay = doy;
  const seas = Math.cos(2 * Math.PI * (doy - 200) / 365);
  const need = P.vecMin || 14;
  for (let i = 0; i < n; i++) {
    const lat = cellLat[i], a = Math.abs(lat);
    const T = 27 - 0.42 * Math.max(0, a - 12) + Math.sign(lat || 1) * seas * Math.min(a, 60) / 60 * 11;
    cellT[i] = T;
    climate[i] = Math.max(0, Math.min(1, (T - need) / 11));
    const cold = Math.max(0, Math.min(1, (10 - T) / 15)), hot = Math.max(0, Math.min(1, (T - 22) / 6));
    const k = cc[i], pov = k < CN ? cPov[k] : 0.5;
    const mos = Math.max(0, Math.min(1, (T - 16) / 11));
    envF[i] = (1 - 0.25 * cold * (1 - evo.cold)) * (1 - 0.2 * hot * (1 - evo.heat))
            * (1 + 0.6 * evo.water * pov) * (1 + 0.8 * evo.vector * mos) * (1 + 0.5 * evo.animal * rural[i])
            * (1 + 0.12 * evo.blood) * (1 + 0.1 * evo.air);
  }
}
function setFocus(i, lon, lat){
  fcx[i] = Math.min(0.98, Math.max(0.02, (lon + 180) * 4 - (cellIdx[i] % W)));
  fcy[i] = Math.min(0.98, Math.max(0.02, (90 - lat) * 4 - Math.floor(cellIdx[i] / W)));
}
// Une cellule touchée par ses voisines : le foyer démarre du côté de la voisine la plus contagieuse
function focusFromNeighbors(j){
  let best = -1, bi = 0;
  for (let k = nbOff[j]; k < nbOff[j + 1]; k++) { const v = nbIdx[k]; if (I[v] > bi) { bi = I[v]; best = v; } }
  if (best < 0) return;
  let dc = (cellIdx[best] % W) - (cellIdx[j] % W); if (dc > 1) dc = -1; if (dc < -1) dc = 1;
  const dr = Math.floor(cellIdx[best] / W) - Math.floor(cellIdx[j] / W);
  fcx[j] = 0.5 + 0.42 * dc + (Math.random() - 0.5) * 0.1; fcy[j] = 0.5 + 0.42 * dr + (Math.random() - 0.5) * 0.1;
}
function activate(i, lon, lat){
  if (!isActive[i]) { isActive[i] = 1; activeList.push(i); }
  if (!wasActive[i]) {
    wasActive[i] = 1; everList.push(i);
    if (lon != null) setFocus(i, lon, lat); else focusFromNeighbors(i);
  }
  const k = cc[i];
  if (k < CN && !cInfected[k]) {
    cInfected[k] = 1; infCountries++;
    const r = Math.floor(cellIdx[i] / W), c = cellIdx[i] % W;
    events.push({ k: 'pays', c: k, text: (cBig[k] ? 'Premier cas : ' : 'Premier cas : ') + cName[k], lat: 90 - (r + .5) * .25, lon: (c + .5) * .25 - 180, big: cBig[k] });
  }
}
// Gravité perçue : plus les symptômes sont visibles, plus les cas sont détectés
const visibility = () => Math.max(0.02, Math.min(1, 0.05 + Math.min(1, P.ifr * 3) * 0.5 + evo.severity * 0.12 - evo.stealth * 0.08));
const sickMobility = () => 1 - 0.4 * Math.min(1, evo.severity / 6);

/* ---------- Un pas de simulation (dt en jours) ---------- */
let accA = null, touched = [], isTouched = null;
function step(dt){
  updateEnv(false);
  if (!P.h2h) { progress(dt); return; }
  if (!accA) { accA = new Float64Array(n); isTouched = new Uint8Array(n); }
  const beta = P.beta * evo.r0, mob = sickMobility();
  for (const j of touched) { accA[j] = 0; isTouched[j] = 0; }
  touched = [];
  for (let q = 0; q < activeList.length; q++) {
    const i = activeList[q], inf = I[i]; if (inf <= 0) continue;
    if (!isTouched[i]) { isTouched[i] = 1; touched.push(i); } accA[i] += inf;
    const ki = cc[i], closedI = ki < CN && cClosed[ki];
    for (let k = nbOff[i], e = nbOff[i + 1]; k < e; k++) {
      const j = nbIdx[k];
      if (!isTouched[j]) { isTouched[j] = 1; touched.push(j); }
      let w = nbW[k] * mob;
      if (cc[j] !== ki && (closedI || (cc[j] < CN && cClosed[cc[j]]))) w *= 0.12;   // frontière fermée
      accA[j] += inf * w;
    }
  }
  const kd = P.k || 1;
  for (const j of touched) {
    if (S[j] <= 0) continue;
    const k = cc[j];
    let b = beta * envF[j] * (P.vec ? climate[j] : 1) * (k < CN ? cMult[k] : 1);
    if (j === boost.cell && simT < boost.until) b *= boost.factor;
    const controlled = j === ctrl.cell && simT < ctrl.until;
    // la ville simule elle-même ses habitants : seuls les contacts venus des cellules voisines comptent ici
    const a = controlled ? Math.max(0, accA[j] - I[j]) : accA[j];
    if (a <= 0) continue;
    let p = 1 - Math.exp(-b * (a / Neff[j]) * dt);
    // super-propagation : avec peu de malades, la contagion se fait par à-coups (clusters)
    if (a < 300) p = Math.min(1, p * gamma(kd * Math.max(a, 0.05)) / (kd * Math.max(a, 0.05)));
    const x = draw(S[j], p);
    if (x <= 0) continue;
    if (controlled) { extImports += x; continue; }
    S[j] -= x; E[j] += x; totals.cases += x; if (k < CN) cCases[k] += x; activate(j);
  }
  progress(dt);
  airTravel(dt);
}

function progress(dt){
  const sig = 1 - Math.exp(-P.sigma * dt), gam = 1 - Math.exp(-P.gamma * dt);
  const still = [];
  for (const i of activeList) {
    if (E[i] > 0) { const x = draw(E[i], sig); E[i] -= x; I[i] += x; }
    if (I[i] > 0) {
      const x = draw(I[i], gam);
      if (x > 0) { const k = cc[i]; const d = draw(x, k < CN ? cIfr[k] : P.ifr); I[i] -= x; D[i] += d; R[i] += x - d; }
    }
    if (E[i] < 0.5 && I[i] < 0.5) { E[i] = I[i] = 0; isActive[i] = 0; } else still.push(i);
  }
  activeList = still;
  for (const t of trips) {
    if (t.done || simT < t.at) continue;
    t.done = true;
    const j = cellAt(t.lat, t.lon);
    if (j >= 0 && S[j] >= 1) { if (j === ctrl.cell && simT < ctrl.until) extImports++; else { S[j] -= 1; E[j] += 1; totals.cases += 1; activate(j, t.lon, t.lat); } if (flights.length < 60) flights.push([t.fromLon, t.fromLat, t.lon, t.lat, 'Patient zéro', t.name]); }
  }
}

function airTravel(dt){
  const carrierF = (1 + evo.air) * sickMobility();
  for (let a = 0; a < airCell.length; a++) {
    const c = airCell[a]; if (c < 0 || !isActive[c]) continue;
    const carriers = (E[c] + 0.4 * I[c]) / N[c] * carrierF;
    if (carriers <= 0) continue;
    const ka = cc[c], closedA = ka < CN && cClosed[ka];
    const k = poisson(airDep[a] * dt * carriers * (closedA ? 0.05 : 1));
    for (let t = 0; t < k; t++) {
      const r0 = routeOff[a], r1 = routeOff[a + 1]; if (r1 <= r0) break;
      const x = Math.random() * routeCum[r1 - 1];
      let lo = r0, hi = r1 - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (routeCum[m] < x) lo = m + 1; else hi = m; }
      const b = routeTo[lo], cb = airCell[b];
      if (cb < 0 || S[cb] < 1) continue;
      if (cc[cb] < CN && cClosed[cc[cb]] && Math.random() < 0.95) continue;   // frontière d'arrivée fermée
      if (cb === ctrl.cell && simT < ctrl.until) extImports++;
      else { S[cb] -= 1; E[cb] += 1; totals.cases += 1; if (cc[cb] < CN) cCases[cc[cb]] += 1; activate(cb, airLon[b], airLat[b]); }
      if (flights.length < 60) flights.push([airLon[a], airLat[a], airLon[b], airLat[b], self.airNames[a], self.airNames[b]]);
    }
  }
}

/* ---------- Une fois par jour simulé : bilans, réactions, recherche, vaccination ---------- */
const LEVELS = ['Aucune mesure', 'Surveillance renforcée', 'Masques et gestes barrières', 'Écoles fermées, frontières fermées', 'Confinement général'];
const MULT = [1, 0.95, 0.8, 0.6, 0.38];
function daily(){
  cE.fill(0); cI.fill(0); cD.fill(0); cR.fill(0);
  for (const i of everList) { const k = cc[i]; if (k >= CN) continue; cE[k] += E[i]; cI[k] += I[i]; cD[k] += D[i]; cR[k] += R[i]; }
  const vis = visibility();
  let detCountries = 0;
  for (let k = 0; k < CN; k++) {
    const pop = cPop[k] || 1, wealth = 1 - cPov[k];
    const detected = cCases[k] * vis + cD[k];
    if (detected >= 1) detCountries++;
    // effondrement
    if (!cCollapsed[k] && cD[k] / pop > 0.25) { cCollapsed[k] = 1; if (pop > 10e6) events.push({ k: 'chaos', c: k, text: `${cName[k]} s’effondre : l’État ne répond plus` }); }
    // réaction
    if (!game.noResponse && !cCollapsed[k]) {
      const dpm = detected / pop * 1e6, slow = 0.5 + cPov[k] * 1.5 / (who ? 2 : 1);
      let target = 0;
      if (detected >= 1 || (who && cE[k] + cI[k] > 0)) target = 1;
      if (dpm >= 5 * slow || cD[k] >= 5 * slow) target = 2;
      if (dpm >= 50 * slow || cD[k] >= 60 * slow) target = 3;
      if (dpm >= 400 * slow || cD[k] / pop >= 2e-5 * slow) target = 4;
      const active = cE[k] + cI[k];
      if (active * vis < 1) cQuiet[k]++; else cQuiet[k] = 0;
      const prev = cLevel[k];
      if (target > prev && simT - cSince[k] >= 3 * DAY) { cLevel[k] = prev + 1; cSince[k] = simT; }
      else if (prev > 0 && simT - cSince[k] >= 14 * DAY && cQuiet[k] > (prev === 1 ? 90 : 21) && target < prev) { cLevel[k] = prev - 1; cSince[k] = simT; cQuiet[k] = 0; }
      if (cLevel[k] !== prev && cBig[k]) events.push({ k: cLevel[k] > prev ? 'mesure' : 'levee', c: k, text: cLevel[k] > prev ? `${cName[k]} : ${LEVELS[cLevel[k]].toLowerCase()}` : `${cName[k]} lève des restrictions` });
      cClosed[k] = cLevel[k] >= 3 ? 1 : 0;
      // efficacité : les pays riches appliquent mieux leurs mesures
      cMult[k] = 1 - (1 - MULT[cLevel[k]]) * (0.55 + 0.45 * wealth);
    } else if (cCollapsed[k]) { cMult[k] = 1; cClosed[k] = 0; }
    // létalité réelle : soins (pays riches, mesures en place), résistance aux médicaments, symptômes mortels
    const care = cCollapsed[k] ? 0 : 0.45 * wealth * (1 - evo.drug) * (cLevel[k] >= 2 ? 1 : 0.6);
    cIfr[k] = 1 - (1 - P.ifr * (1 - care)) * (1 - evo.lethal);
  }
  // Alerte mondiale (OMS)
  if (!who && !game.noResponse && (detCountries >= 3 || totals.D >= 100 || (totals.cases * vis > 2000))) {
    who = true; events.push({ k: 'oms', text: 'L’OMS déclare une urgence de santé publique de portée internationale' });
  }
  // Recherche du vaccin / remède
  if (who && !cureDone && !game.noCure && P.h2h) {
    let contrib = 0;
    for (let k = 0; k < CN; k++) if (!cCollapsed[k]) contrib += cGdp[k] * (cLevel[k] >= 1 ? 1 : 0.3) * Math.max(0, 1 - cD[k] / (cPop[k] || 1) * 3);
    const before = cure;
    cure += 100 / 420 * (contrib / worldGdp) * game.research * (1 - 0.6 * evo.cureSlow) * (1 + Math.min(1, totals.D / 5e6));
    for (const m of [25, 50, 75]) if (before < m && cure >= m) events.push({ k: 'vaccin', text: `Recherche d’un vaccin : ${m} %` });
    if (cure >= 100) { cure = 100; cureDone = true; cureDay = simT; events.push({ k: 'vaccin', text: 'Un vaccin est disponible : la vaccination commence dans le monde entier' }); }
  }
  // Vaccination (après 20 jours de production)
  if (cureDone && simT - cureDay > 20 * DAY) {
    for (let i = 0; i < n; i++) {
      const k = cc[i]; if (k >= CN || cCollapsed[k] || S[i] <= 0) continue;
      const rate = 0.004 + 0.012 * (1 - cPov[k]);
      const v = S[i] * rate; S[i] -= v; R[i] += v; totals.V += v;
      if (!wasActive[i]) { wasActive[i] = 1; everList.push(i); }
    }
  }
  // Paliers de morts
  for (const m of [1e3, 1e5, 1e6, 1e7, 1e8, 1e9]) if (totals.D >= m && !daily.marks.has(m)) { daily.marks.add(m); events.push({ k: 'morts', text: `${fmt(m)} morts dans le monde` }); }
  // Fin de partie (campagne)
  if (game.mode === 'campagne' && !ended && simT - startT > 2 * DAY) {
    const alive = worldPop - totals.D;
    const everInf = totals.cases / worldPop;
    let res = null;
    if (game.goal === 'extinction' && totals.D / worldPop > 0.995) res = ['victoire', 'L’humanité a disparu.'];
    if (game.goal === 'infection' && everInf > 0.95) res = ['victoire', 'Plus de 95 % de l’humanité a été contaminée.'];
    if (!res && totals.E + totals.I < 0.5) res = ['defaite', cureDone ? 'Le vaccin a eu raison du pathogène.' : 'Le pathogène s’est éteint de lui-même.'];
    if (!res && cureDone && simT - cureDay > 200 * DAY) res = ['defaite', 'La vaccination a maîtrisé l’épidémie.'];
    if (res) { ended = true; postMessage({ type: 'end', result: res[0], reason: res[1], day: (simT - startT) / DAY, alive }); }
  }
}
daily.marks = new Set();
const fmt = m => m >= 1e9 ? m / 1e9 + ' milliard' : m >= 1e6 ? m / 1e6 + ' million' + (m >= 2e6 ? 's' : '') : m.toLocaleString('fr-FR');

function cellAt(lat, lon){
  const row = Math.floor((90 - lat) / 0.25), col = Math.floor((lon + 180) / 0.25);
  let best = -1, bd = 1e9;
  for (let dr = -6; dr <= 6; dr++) for (let dc = -6; dc <= 6; dc++) {
    const rr = row + dr; if (rr < 0 || rr >= H) continue;
    const j = dense[rr * W + ((col + dc + W) % W)]; if (j < 0) continue;
    const d = dr * dr + dc * dc; if (d < bd) { bd = d; best = j; }
  }
  return best;
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
    const rad = Math.min(1.5, 0.035 + 2.0 * Math.sqrt(Math.max(0, nn - S[i]) / nn));
    tex2[o] = Math.round(fcx[i] * 255); tex2[o + 1] = Math.round(fcy[i] * 255); tex2[o + 2] = Math.round(rad / 1.5 * 255); tex2[o + 3] = 255;
    const row = (cellIdx[i] / W) | 0;
    if (row < dirtyR0) dirtyR0 = row; if (row + 1 > dirtyR1) dirtyR1 = row + 1;
  }
  totals.S = s; totals.E = e; totals.I = inf; totals.R = r; totals.D = d;
}

function post(extra){
  writeTex();
  const cs = new Float32Array(CN * 6);
  for (let k = 0; k < CN; k++) { cs[k * 6] = cE[k] + cI[k]; cs[k * 6 + 1] = cD[k]; cs[k * 6 + 2] = cCases[k]; cs[k * 6 + 3] = cLevel[k]; cs[k * 6 + 4] = cClosed[k]; cs[k * 6 + 5] = cCollapsed[k]; }
  const msg = { type: 'state', t: simT, day: (simT - startT) / DAY, totals: { ...totals }, flights, events, active: activeList.length,
    cure, cureDone, who, infCountries, countries: cs, vis: visibility(), ...(extra || {}) };
  const hot = [];
  for (let q = 0; q < 3 && activeList.length; q++) { const i = activeList[Math.floor(Math.random() * activeList.length)]; hot.push([(cellIdx[i] % W + .5) * .25 - 180, 90 - (Math.floor(cellIdx[i] / W) + .5) * .25]); }
  msg.hot = hot;
  const transfer = [cs.buffer];
  if (dirtyR1 > dirtyR0) {
    const rows = tex.slice(dirtyR0 * W * 4, dirtyR1 * W * 4), rows2 = tex2.slice(dirtyR0 * W * 4, dirtyR1 * W * 4);
    msg.r0 = dirtyR0; msg.r1 = dirtyR1; msg.rows = rows; msg.rows2 = rows2; transfer.push(rows.buffer, rows2.buffer);
  }
  postMessage(msg, transfer);
  dirtyR0 = H; dirtyR1 = -1; flights = []; events = [];
}

/* ---------- Sauvegarde / restauration ---------- */
function exportState(){
  const f32 = a => Float32Array.from(a);
  return {
    v: 1, S: f32(S), E: f32(E), I: f32(I), R: f32(R), D: f32(D), fcx: fcx.slice(), fcy: fcy.slice(),
    active: Int32Array.from(activeList), ever: Int32Array.from(everList),
    cLevel: cLevel.slice(), cClosed: cClosed.slice(), cCollapsed: cCollapsed.slice(), cSince: cSince.slice(), cInfected: cInfected.slice(),
    cCases: cCases.slice(), cQuiet: cQuiet.slice(), cMult: cMult.slice(), cIfr: cIfr.slice(),
    totals: { ...totals }, who, cure, cureDone, cureDay, infCountries, ended, simT, startT, lastDay, P, game: { ...game }, evo: { ...evo },
    boost: { ...boost }, trips: trips.map(t => ({ ...t })), marks: [...daily.marks], extImports
  };
}
function importState(st){
  S.set(st.S); E.set(st.E); I.set(st.I); R.set(st.R); D.set(st.D); fcx.set(st.fcx); fcy.set(st.fcy);
  isActive.fill(0); wasActive.fill(0);
  activeList = Array.from(st.active); everList = Array.from(st.ever);
  for (const i of activeList) isActive[i] = 1;
  for (const i of everList) wasActive[i] = 1;
  cLevel.set(st.cLevel); cClosed.set(st.cClosed); cCollapsed.set(st.cCollapsed); cSince.set(st.cSince); cInfected.set(st.cInfected);
  cCases.set(st.cCases); cQuiet.set(st.cQuiet); cMult.set(st.cMult); cIfr.set(st.cIfr);
  totals = { ...st.totals }; who = st.who; cure = st.cure; cureDone = st.cureDone; cureDay = st.cureDay; infCountries = st.infCountries; ended = st.ended;
  simT = st.simT; startT = st.startT; lastDay = st.lastDay; P = st.P; game = { ...game, ...st.game }; evo = { ...evo, ...st.evo };
  boost = st.boost; trips = st.trips; daily.marks = new Set(st.marks); extImports = st.extImports || 0;
  ctrl = { cell: -1, until: 0 }; climateDay = -1; accA = null; touched = []; events = []; flights = [];
  tex.fill(0); tex2.fill(0); dirtyR0 = 0; dirtyR1 = H; started = true;
  updateEnv(true);
}
// Avance la simulation jusqu'à « target ». Les longues périodes (onglet en arrière-plan, absence)
// sont rattrapées par pas d'un jour au plus, avec un message de progression.
let stopCatchUp = false;
async function advanceTo(target){
  const remaining = (target - simT) / DAY;
  const long = remaining > 3;
  const maxDt = long ? 1 : 6 / 24;
  const steps = long ? Math.ceil(remaining / maxDt) : Math.min(Math.ceil(remaining / maxDt), 24);
  const dt = remaining / steps;
  const t0 = performance.now(); stopCatchUp = false;
  for (let s = 0; s < steps; s++) {
    step(dt); simT += dt * DAY;
    const d = Math.floor((simT - startT) / DAY);
    if (d !== lastDay) { lastDay = d; daily(); }
    if (long && (s % 10 === 9)) {
      postMessage({ type: 'progress', done: s + 1, total: steps, day: (simT - startT) / DAY, totals: { ...totals }, ms: performance.now() - t0 });
      await new Promise(r => setTimeout(r, 0));     // laisse passer un éventuel « stop »
      if (stopCatchUp || ended) break;
    }
  }
  const stopped = stopCatchUp;
  if (!stopped) simT = Math.max(simT, target);
  post(long ? { caught: true, stopped } : null);
}

/* ---------- Messages ---------- */
self.onmessage = async ev => {
  const m = ev.data;
  if (m.type === 'init') await init(m.base, m.peoplePerDot);
  else if (m.type === 'start') {
    P = m.pathogen;
    Object.assign(game, m.game || {});
    evo = Object.assign({ r0: 1, lethal: 0, severity: 0, stealth: 0, cold: 0, heat: 0, drug: 0, cureSlow: 0, air: 0, water: 0, vector: 0, animal: 0, blood: 0 }, m.evo || {});
    S.set(N); E.fill(0); I.fill(0); R.fill(0); D.fill(0);
    for (const i of everList) { const o = cellIdx[i] * 4; tex[o] = tex[o + 1] = tex[o + 2] = tex[o + 3] = 0; tex2[o + 3] = 0; fcx[i] = fcy[i] = 0.5; }
    ctrl = { cell: -1, until: 0 }; extImports = 0;
    dirtyR0 = 0; dirtyR1 = H;
    isActive.fill(0); wasActive.fill(0); activeList = []; everList = []; totals = { S: 0, E: 0, I: 0, R: 0, D: 0, cases: 0, V: 0 };
    cLevel.fill(0); cClosed.fill(0); cCollapsed.fill(0); cSince.fill(0); cInfected.fill(0); cCases.fill(0); cMult.fill(1); cQuiet.fill(0);
    who = false; cure = 0; cureDone = false; infCountries = 0; ended = false; daily.marks = new Set(); events = [];
    climateDay = -1; lastDay = -1;
    const best = cellAt(m.lat, m.lon);
    if (best < 0) { postMessage({ type: 'error', message: 'Aucune population à cet endroit : choisissez une zone habitée.' }); return; }
    simT = startT = m.t; started = true;
    updateEnv(true);
    for (let k = 0; k < CN; k++) cIfr[k] = P.ifr;
    if (P.h2h) {
      const k = Math.min(m.count || 1, S[best]);
      S[best] -= k; I[best] += k; totals.cases = k; if (cc[best] < CN) cCases[cc[best]] += k; activate(best, m.lon, m.lat);
    }
    const p0 = m.p0 || {};
    boost = { cell: best, until: simT + (1 / P.sigma + 1 / P.gamma) * DAY, factor: Math.max(0.3, p0.boost || 1) };
    trips = (p0.trips || []).map(t => ({ ...t, at: simT + t.day * DAY, fromLat: m.lat, fromLon: m.lon, done: false }));
    daily();
    post();
  }
  else if (m.type === 'stop') { started = false; }
  else if (m.type === 'evolve') { evo = Object.assign(evo, m.evo); if (P) { updateEnv(true); daily(); } }
  else if (m.type === 'game') { Object.assign(game, m.game); }
  else if (m.type === 'cure') { cure = Math.max(0, Math.min(100, cure + m.delta)); if (m.done && !cureDone) { cure = 100; cureDone = true; cureDay = simT; events.push({ k: 'vaccin', text: 'Un vaccin est disponible : la vaccination commence dans le monde entier' }); } }
  else if (m.type === 'country' && started) {   // bac à sable : forcer les mesures d'un pays
    const k = m.c; if (k < 0 || k >= CN) return;
    cLevel[k] = m.level; cSince[k] = simT + 3650 * DAY * (m.lock ? 1 : 0); cClosed[k] = m.level >= 3 ? 1 : 0;
    cMult[k] = 1 - (1 - MULT[cLevel[k]]) * (0.55 + 0.45 * (1 - cPov[k]));
    events.push({ k: 'mesure', c: k, text: `${cName[k]} : ${LEVELS[m.level].toLowerCase()} (décision du joueur)` });
  }
  else if (m.type === 'citySync' && started) {
    const j = cellAt(m.lat, m.lon); if (j < 0) return;
    // la cellule est désormais simulée personne par personne : la ville fait foi
    if (ctrl.cell !== j) extImports = 0;
    ctrl = { cell: j, until: simT + 0.5 * DAY };
    const before = E[j] + I[j] + R[j] + D[j];
    E[j] = Math.max(m.E, 0); I[j] = Math.max(m.I, 0); R[j] = Math.max(R[j], m.R); D[j] = Math.max(D[j], m.D);
    const tot = E[j] + I[j] + R[j] + D[j];
    if (tot > N[j]) { const f = N[j] / tot; E[j] *= f; I[j] *= f; R[j] *= f; D[j] *= f; }
    S[j] = Math.max(0, N[j] - E[j] - I[j] - R[j] - D[j]);
    const gained = E[j] + I[j] + R[j] + D[j] - before;
    if (gained > 0) { totals.cases += gained; if (cc[j] < CN) cCases[cc[j]] += gained; }
    if (E[j] + I[j] > 0.5) activate(j, m.lon, m.lat); else if (!wasActive[j] && R[j] + D[j] > 0) { wasActive[j] = 1; everList.push(j); setFocus(j, m.lon, m.lat); }
    const k = cc[j], imports = Math.floor(extImports); extImports -= imports;
    postMessage({ type: 'cellInfo', id: 'sync', N: N[j], E: E[j], I: I[j], R: R[j], D: D[j], level: k < CN ? cLevel[k] : 0, imports });
  }
  else if (m.type === 'cellQuery' && n) {
    const j = cellAt(m.lat, m.lon); if (j < 0) return;
    const k = cc[j];
    const rad = Math.min(1.5, 0.035 + 2.0 * Math.sqrt(Math.max(0, N[j] - S[j]) / N[j]));
    const flon = ((cellIdx[j] % W) + fcx[j]) * 0.25 - 180, flat = 90 - (Math.floor(cellIdx[j] / W) + fcy[j]) * 0.25;
    postMessage({ type: 'cellInfo', id: m.id, N: N[j], E: E[j], I: I[j], R: R[j], D: D[j], country: k < CN ? k : -1, level: k < CN ? cLevel[k] : 0,
      focus: wasActive[j] ? [flon, flat, rad * 27.8] : null });
  }
  else if (m.type === 'advance' && started && P) {
    if (m.t <= simT) { postMessage({ type: 'idle' }); return; }
    await advanceTo(m.t);
  }
  else if (m.type === 'stopCatchUp') stopCatchUp = true;
  else if (m.type === 'save') {
    if (!started || !P) { postMessage({ type: 'saved', id: m.id, state: null }); return; }
    const st = exportState();
    postMessage({ type: 'saved', id: m.id, state: st }, [st.S.buffer, st.E.buffer, st.I.buffer, st.R.buffer, st.D.buffer]);
  }
  else if (m.type === 'load') { importState(m.state); post(); postMessage({ type: 'loaded', id: m.id }); }
};
