/* =====================================================================
   VECTEUR — contagion personne par personne dans la ville simulée
   Chaque habitant a son propre état (sain, incubation, malade, guéri, mort) et se contamine
   selon ce qu'il fait réellement :
     • air partagé dans les lieux (logement, travail, bar, école, lieu de culte…) : gouttelettes et aérosols
     • croisements dans la rue et trajets en transports en commun
     • contacts physiques rapprochés (foyer surtout)
     • surfaces contaminées (poignées, comptoirs…) qui restent infectieuses un certain temps
     • eau du quartier et aliments (restaurants, marchés, cuisiniers malades)
     • moustiques, tiques, puces et poux qui piquent les malades puis les autres (selon climat et heure)
     • réservoir animal (rongeurs, chauves-souris, bétail…) autour du point de départ
     • partenaires intimes et sang (hôpitaux)
     • nuages de spores ou de produits chimiques poussés par le vent
   Les malades peuvent s'isoler chez eux ou aller à l'hôpital (où ils contaminent soignants et patients).
   ===================================================================== */
(function(){
'use strict';

const KIND = {
  bar: 'nuit', pub: 'nuit', biergarten: 'nuit', nightclub: 'nuit',
  restaurant: 'repas', fast_food: 'repas', cafe: 'repas', food_court: 'repas', ice_cream: 'repas',
  hospital: 'hopital', clinic: 'hopital', doctors: 'hopital',
  school: 'ecole', kindergarten: 'ecole', college: 'ecole', university: 'ecole',
  place_of_worship: 'culte', fitness_centre: 'sport', sports_centre: 'sport', fitness: 'sport', swimming_pool: 'sport',
  stadium: 'foule', theatre: 'foule', cinema: 'foule', arts_centre: 'foule',
  supermarket: 'commerce', marketplace: 'marche', grocery: 'marche', greengrocer: 'marche', mall: 'commerce', shop: 'commerce', department_store: 'commerce',
  railway: 'transport', bus: 'transport', bus_station: 'transport', subway: 'transport'
};
// Intensité des contacts selon le type de lieu
const KIND_W = { nuit: 2.6, foule: 3, culte: 2.2, sport: 2, ecole: 1.8, hopital: 1.7, repas: 1.6, marche: 1.5, commerce: 1.1, transport: 2.2 };

const ss = (e0, e1, x) => { const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1); return t * t * (3 - 2 * t); };
const gammaRand = (mean) => { // durée aléatoire autour de la moyenne (forme ≈ 4)
  let s = 0; for (let k = 0; k < 4; k++) s -= Math.log(Math.random() || 1e-9); return mean * s / 4;
};

window.createCityEpi = function(ctx){
  const { ag, A, places, ratio, lng0, lat0, KX, KY } = ctx;
  const NP = places.length;
  const H = 3600e3, D = 86400e3;
  const E = {
    P: null, running: false, lastT: 0, lastSync: 0, potEMA: 0, vecEMA: 0,
    st: new Uint8Array(A), tEnd: new Float64Array(A), symp: new Uint8Array(A), sev: new Uint8Array(A),
    iso: new Uint8Array(A), age: new Uint8Array(A), social: new Float32Array(A).fill(1),
    mask: new Float32Array(A), hyg: new Float32Array(A).fill(0.5), partner: new Int32Array(A).fill(-1),
    transit: new Uint8Array(A), dose: new Float32Array(A), p0: -1, p0prof: null, agenda: null,
    placeN: new Float32Array(NP), placeInf: new Float32Array(NP), placeCont: new Float32Array(NP), placeKind: new Array(NP),
    clouds: [], hospitals: [], counts: [0, 0, 0, 0, 0], newCases: 0, log: [],
    level: 0, essential: new Uint8Array(A), maskWear: new Uint8Array(A)
  };
  for (let i = 0; i < A; i++) { E.essential[i] = Math.random() < 0.25 ? 1 : 0; E.maskWear[i] = Math.random() < 0.65 ? 1 : 0; }
  // ---- lieux typés
  for (let p = 0; p < NP; p++) E.placeKind[p] = KIND[places[p].cls] || KIND[places[p].cls2] || null;
  for (let p = 0; p < NP; p++) if (E.placeKind[p] === 'hopital') E.hospitals.push(p);
  // ---- âges, partenaires, habitudes
  for (let i = 0; i < A; i++) {
    const t = ag.type[i];
    E.age[i] = t === 1 ? 6 + Math.random() * 16 : t === 0 ? 23 + Math.random() * 42 : (Math.random() < 0.6 ? 65 + Math.random() * 30 : Math.random() * 6);
    E.hyg[i] = 0.3 + Math.random() * 0.5;
    E.social[i] = 0.5 + Math.random();
    E.transit[i] = !ag.car[i] && Math.random() < 0.35 ? 1 : 0;
  }
  // partenaires : deux adultes du même logement
  const byHome = new Map();
  for (let i = 0; i < A; i++) if (E.age[i] >= 18) { const l = byHome.get(ag.home[i]) || []; l.push(i); byHome.set(ag.home[i], l); }
  for (const l of byHome.values()) for (let k = 0; k + 1 < l.length; k += 2) { E.partner[l[k]] = l[k + 1]; E.partner[l[k + 1]] = l[k]; }
  let ageNorm = 0; for (let i = 0; i < A; i++) ageNorm += Math.exp((E.age[i] - 50) / 13); ageNorm /= A;

  // ---- grilles du quartier (eau : 400 m ; vecteurs / animaux : 150 m)
  const half = ctx.HALF;
  const WG = 400, WN = Math.ceil(2 * half / WG) + 1, water = new Float32Array(WN * WN);
  const VG = 150, VN = Math.ceil(2 * half / VG) + 1, vec = new Float32Array(VN * VN), reservoir = new Float32Array(VN * VN);
  const gW = (x, y) => Math.min(WN - 1, Math.max(0, Math.floor((y + half) / WG))) * WN + Math.min(WN - 1, Math.max(0, Math.floor((x + half) / WG)));
  const gV = (x, y) => Math.min(VN - 1, Math.max(0, Math.floor((y + half) / VG))) * VN + Math.min(VN - 1, Math.max(0, Math.floor((x + half) / VG)));

  const has = m => E.P && E.P.modes.includes(m);
  const isInfectious = i => {
    const s = E.st[i];
    if (s === 2) return E.P.h2h ? 1 : 0;
    if (s === 1 && E.P.h2h && E.tEnd[i] - ctx.now() < 2 * D) return 0.5;   // contagieux avant les symptômes
    return 0;
  };

  /* ---------- Initialisation depuis l'état mondial de la cellule ---------- */
  E.fromWorld = function(f, keep){
    const now = ctx.now();
    for (let i = 0; i < A; i++) {
      if (keep && E.st[i] !== 0) continue;   // on ne touche pas aux habitants déjà contaminés (patient zéro…)
      let s = 0;
      if (f) { const u = Math.random(); s = u < f.d ? 4 : u < f.d + f.r ? 3 : u < f.d + f.r + f.i ? 2 : u < f.d + f.r + f.i + f.e ? 1 : 0; }
      E.st[i] = s; E.dose[i] = 0;
      if (s === 1) E.tEnd[i] = now + Math.random() * E.P.inc * D;
      if (s === 2) { E.tEnd[i] = now + Math.random() * E.P.inf * D; E.symp[i] = Math.random() > E.P.asymp ? 1 : 0; decideIso(i); }
    }
  };

  /* ---------- Lancement ---------- */
  E.start = function(P, f){ E.P = P; E.running = true; E.lastT = ctx.now(); E.potEMA = 0; E.placeCont.fill(0); water.fill(0); vec.fill(0); reservoir.fill(0); E.clouds = []; E.fromWorld(f); };
  // État de la cellule mondiale reçu après coup (ville générée pendant une épidémie)
  E.initFrom = function(c){ if (E.running && c.N > 0) E.fromWorld({ e: c.E / c.N, i: c.I / c.N, r: c.R / c.N, d: c.D / c.N }, true); };
  E.setPathogen = function(P){ if (E.running) E.P = P; };
  E.stop = function(){ E.running = false; E.P = null; E.st.fill(0); E.p0 = -1; E.clouds = []; sync(); };

  function decideIso(i){
    // s'isole chez soi si symptômes (comportement moyen de la population : 55 %)
    let pr = 0.55;
    if (i === E.p0 && E.p0prof) pr = E.p0prof.cache ? 0 : E.p0prof.isolement === 'jamais' ? 0 : E.p0prof.isolement === 'premiers' ? 0.95 : (E.sev[i] ? 0.8 : 0.1);
    E.iso[i] = E.symp[i] && Math.random() < pr ? 1 : 0;
    // formes graves → hôpital
    E.sev[i] = E.symp[i] && Math.random() < Math.min(0.6, E.P.ifr * 4 + 0.03) ? 1 : 0;
  }

  /* ---------- Patient zéro ---------- */
  E.setPatientZero = function(prof, x, y, count, releaseKind){
    // habitant dont le logement est le plus proche du point choisi
    let best = 0, bd = Infinity;
    for (let i = 0; i < A; i++) { const p = places[ag.home[i]]; const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } }
    const i = best; E.p0 = i; E.p0prof = prof;
    if (prof) {
      E.age[i] = prof.age; E.social[i] = Math.max(0.1, prof.contacts / 12); E.hyg[i] = prof.hygiene; E.mask[i] = prof.mask;
      ag.car[i] = prof.transport === 'voiture' || prof.transport === 'taxi' ? 1 : 0;
      E.transit[i] = prof.transport === 'transports' ? 1 : 0;
      const pr = (window.PROFESSIONS.find(p => p[0] === prof.prof) || window.PROFESSIONS[0]);
      ag.type[i] = pr[3] === pr[4] ? 2 : 0;
      if (pr[2].length) { const w = nearestOfClass(places[ag.home[i]], pr[2]); if (w >= 0) ag.work[i] = w; }
      ag.dep[i] = pr[3]; ag.ret[i] = pr[4] > pr[3] ? pr[4] : pr[4] + 24;
      if (pr[10]) { ag.dep[i] = pr[3]; ag.ret[i] = 28; }
      // agenda : lieux fréquentés
      E.agenda = [];
      for (const id of prof.lieux || []) {
        const L = window.LIEUX.find(l => l[0] === id); if (!L) continue;
        const p = nearestOfClass(places[ag.home[i]], L[2]); if (p < 0) continue;
        E.agenda.push({ place: p, h0: L[4][0] + Math.random(), h1: L[4][1], w: L[3] });
      }
      // foyer : on regroupe des voisins sous le même toit
      const home = ag.home[i]; let inHome = 0;
      for (let k = 0; k < A; k++) if (ag.home[k] === home) inHome++;
      const want = Math.max(1, Math.round(prof.foyer / Math.max(1, ratio)));
      if (inHome < want) {
        const near = []; for (let k = 0; k < A; k++) if (k !== i) near.push([(places[ag.home[k]].x - x) ** 2 + (places[ag.home[k]].y - y) ** 2, k]);
        near.sort((a, b) => a[0] - b[0]);
        for (let q = 0; q < want - inHome && q < near.length; q++) ag.home[near[q][1]] = home;
      }
      if (prof.partenaires > 0) { const k = (i + 1 + Math.floor(Math.random() * (A - 1))) % A; E.partner[i] = k; E.partner[k] = i; }
      // animaux : réservoir autour du domicile
      if (prof.animaux && prof.animaux !== 'aucun' && has('Z')) reservoir[gV(x, y)] += prof.animaux === 'sauvage' ? 3 : 2;
    }
    if (has('Z') || has('P')) reservoir[gV(x, y)] += 2;   // réservoir animal au point de départ (rongeurs, chauves-souris…)
    if (releaseKind) return i;   // agents chimiques / environnementaux : pas de malade initial
    // contamination initiale : le patient zéro et les plus proches
    const now = ctx.now();
    const infect = k => { E.st[k] = 2; E.tEnd[k] = now + gammaRand(E.P.inf) * D; E.symp[k] = Math.random() > E.P.asymp ? 1 : 0; decideIso(k); };
    infect(i);
    if (count > 1) {
      const near = []; for (let k = 0; k < A; k++) if (k !== i) near.push([(places[ag.home[k]].x - x) ** 2 + (places[ag.home[k]].y - y) ** 2, k]);
      near.sort((a, b) => a[0] - b[0]);
      for (let q = 0; q < Math.min(count - 1, near.length); q++) infect(near[q][1]);
    }
    return i;
  };
  function nearestOfClass(from, classes){
    let best = -1, bd = Infinity;
    for (let p = 0; p < NP; p++) {
      if (!classes.includes(places[p].cls) && !classes.includes(places[p].cls2)) continue;
      const d = (places[p].x - from.x) ** 2 + (places[p].y - from.y) ** 2; if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /* ---------- Rejets : nuage (air) ou contamination d'un lieu (aliments) ---------- */
  E.release = function(x, y, opts){
    const P = E.P;
    if (P.modes.includes('N') && !P.modes.includes('E') && P.cat !== 'chimique') {
      // toxine alimentaire : on contamine le lieu de restauration le plus proche
      let p = nearestOfClass({ x, y }, ['restaurant', 'fast_food', 'cafe', 'marketplace', 'supermarket', 'grocery']);
      if (p < 0) p = 0;
      E.placeCont[p] += 60 * (opts.qty || 1);
      E.foodPlace = p; E.log.push('Aliments contaminés : ' + (places[p].name || 'lieu de restauration'));
      return;
    }
    const ang = opts.dir == null ? Math.random() * 2 * Math.PI : opts.dir;
    E.clouds.push({ x, y, t0: ctx.now(), sigma0: Math.max(60, (P.radius || 0.5) * 1000 * 0.35 * (opts.qty || 1)),
      persist: Math.min(Math.max(0.5, P.surv || 2), 36), cat: P.cat, vx: Math.cos(ang) * (opts.wind ?? 3), vy: Math.sin(ang) * (opts.wind ?? 3), q: opts.qty || 1 });
  };
  function cloudConc(x, y, now, indoor){
    let c = 0;
    for (const cl of E.clouds) {
      const th = (now - cl.t0) / H; if (th < 0) continue;
      const decay = Math.exp(-th / cl.persist); if (decay < 0.01) continue;
      const sig = cl.sigma0 * (1 + th * 0.35);
      const cx = cl.x + cl.vx * th * 3600, cy = cl.y + cl.vy * th * 3600;
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      c += decay * Math.exp(-d2 / (2 * sig * sig)) * (cl.sigma0 / sig) ** 2;
    }
    return indoor ? c * 0.3 : c;
  }
  E.cloudShapes = function(now){
    return E.clouds.map(cl => {
      const th = (now - cl.t0) / H, decay = Math.exp(-th / cl.persist);
      return { x: cl.x + cl.vx * th * 3600, y: cl.y + cl.vy * th * 3600, r: cl.sigma0 * (1 + th * 0.35), a: decay, cat: cl.cat };
    }).filter(c => c.a > 0.02);
  };

  /* ---------- Où doit aller l'habitant ? (isolement, hôpital, agenda du patient zéro) ---------- */
  E.override = function(i, h){
    if (!E.running) return -1;
    const s = E.st[i];
    if (s === 4) return ag.home[i];
    if (s === 2 && E.symp[i]) {
      if (E.sev[i] && E.hospitals.length) return nearestHospital(i);
      if (E.iso[i]) return ag.home[i];
    }
    if (i === E.p0 && E.agenda) {
      for (const a of E.agenda) {
        let hh = h; if (a.h1 > 24 && h < a.h1 - 24) hh = h + 24;
        if (hh >= a.h0 && hh < a.h1) return a.place;
      }
    }
    return -1;
  };
  const hospCache = new Map();
  function nearestHospital(i){
    let r = hospCache.get(i); if (r !== undefined) return r;
    const hp = places[ag.home[i]]; let bd = Infinity; r = E.hospitals[0];
    for (const p of E.hospitals) { const d = (places[p].x - hp.x) ** 2 + (places[p].y - hp.y) ** 2; if (d < bd) { bd = d; r = p; } }
    hospCache.set(i, r); return r;
  }

  /* ---------- Mesures du pays (0 à 4) : masques, fermetures, confinement ---------- */
  const CLOSED_L3 = new Set(['nuit', 'foule', 'culte', 'sport', 'ecole']);
  E.setLevel = function(l){ if (l !== E.level) { E.level = l; } };
  E.restrict = function(i, place){
    if (!E.running || E.level < 3 || place === ag.home[i]) return place;
    if (E.level >= 4 && !E.essential[i] && !(E.st[i] === 2 && E.sev[i])) {
      // confinement : seuls les travailleurs essentiels sortent, plus quelques courses près de chez soi
      const k = E.placeKind[place];
      if (k === 'commerce' || k === 'marche' || k === 'hopital') return place;
      return ag.home[i];
    }
    if (CLOSED_L3.has(E.placeKind[place])) return ag.home[i];
    if (ag.type[i] === 1 && place === ag.work[i]) return ag.home[i];   // écoles fermées
    return place;
  };
  const wearsMask = i => E.mask[i] || (E.level >= 2 && E.maskWear[i]);

  /* ---------- Un pas de contagion ---------- */
  const STREET = 4, streetMap = new Map(), transitMap = new Map();
  E.tick = function(){
    if (!E.running || !E.P) return;
    const now = ctx.now();
    let dtH = (now - E.lastT) / H;
    if (dtH <= 0) { E.lastT = now; return; }
    if (dtH < 1 / 120 && now - E.lastT < 30000) return;      // au moins 30 s de temps simulé
    dtH = Math.min(dtH, 6);
    E.lastT = now;
    const P = E.P, m = P.w;     // poids des modes
    const hour = ctx.localHour();
    const placeN = E.placeN, placeInf = E.placeInf, placeCont = E.placeCont;
    placeN.fill(0); placeInf.fill(0);
    streetMap.clear(); transitMap.clear();
    let inW = new Float32Array(water.length), inV = new Float32Array(vec.length);
    const hostW = new Float32Array(water.length), hostV = new Float32Array(vec.length);
    // 1. Qui est où, qui contamine
    for (let i = 0; i < A; i++) {
      const s = E.st[i]; if (s === 4) continue;
      const inf = isInfectious(i) * (wearsMask(i) && (ag.trip[i] || ag.loc[i] !== ag.home[i]) ? 0.45 : 1) * (i === E.p0 ? E.social[i] : 1);
      if (m.O) hostW[gW(ag.x[i], ag.y[i])]++;
      if (m.V) hostV[gV(ag.x[i], ag.y[i])]++;
      const T = ag.trip[i];
      if (T) {
        if (T.car) continue;
        const k = Math.floor(ag.x[i] / STREET) + ',' + Math.floor(ag.y[i] / STREET);
        if (inf > 0) streetMap.set(k, (streetMap.get(k) || 0) + inf);
        if (E.transit[i]) { const tk = Math.floor(ag.x[i] / 60) + ',' + Math.floor(ag.y[i] / 60); const o = transitMap.get(tk) || [0, 0]; o[0] += inf; o[1]++; transitMap.set(tk, o); }
      } else {
        const p = ag.loc[i]; placeN[p] += 1; placeInf[p] += inf;
      }
      if (inf > 0) {
        if (m.O) inW[gW(ag.x[i], ag.y[i])] += inf;
        if (m.V) inV[gV(ag.x[i], ag.y[i])] += inf;
      }
    }
    // 2. Surfaces, eau, vecteurs, réservoir animal
    const survH = Math.max(0.5, P.surv || 24), keepF = Math.exp(-dtH / survH);
    for (let p = 0; p < NP; p++) { placeCont[p] = placeCont[p] * keepF + placeInf[p] * dtH * (E.placeKind[p] === 'repas' ? 2 : 1); }
    const keepW = Math.exp(-dtH / 72);
    for (let g = 0; g < water.length; g++) water[g] = water[g] * keepW + inW[g] * dtH * 0.5;
    const clim = ctx.climate();
    const biting = has('M') ? (0.4 + 0.6 * (ss(17, 20, hour) + ss(6, 4, hour))) : 1;   // moustiques actifs au crépuscule et la nuit
    const keepV = Math.exp(-dtH / 240);
    for (let g = 0; g < vec.length; g++) vec[g] = vec[g] * keepV + inV[g] * dtH * clim * biting;
    if (m.Z) {   // réservoir animal : croissance lente et diffusion
      const r2 = reservoir.slice();
      for (let g = 0; g < reservoir.length; g++) {
        const v = r2[g]; if (v <= 0.001) continue;
        const grow = v * 0.02 * dtH * (1 - v / 5);
        reservoir[g] = v + grow - v * 0.01 * dtH;
        const gx = g % VN, gy = (g / VN) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + dx, ny = gy + dy; if (nx < 0 || ny < 0 || nx >= VN || ny >= VN) continue;
          reservoir[ny * VN + nx] += v * 0.003 * dtH;
        }
      }
    }
    // 3. Étalonnage : on règle l'intensité pour retrouver le R0 du pathogène
    let pot = 0, cnt = 0;
    for (let i = 0; i < A; i += 7) {
      if (ag.trip[i]) continue; const p = ag.loc[i];
      const n = placeN[p], o = Math.max(0, n - 1);
      pot += placeWeight(p, n) * o * (m.R + m.C * (n < 8 ? 1.5 : 0.3)) + m.A * 6 * o / (n + 5) + 0.15 * (m.F + m.N); cnt++;
    }
    const potH = cnt ? pot / cnt : 1;
    E.potEMA = E.potEMA ? E.potEMA * 0.9 + potH * 0.1 : potH;
    const betaPlace = P.h2h ? P.r0 / (Math.max(0.05, E.potEMA) * 24 * P.inf) * 0.8 : 0;
    // moustiques / eau : les piqûres et l'eau contaminée se répartissent entre les habitants de la zone
    const betaVec = P.r0 / (24 * P.inf * 240 * 0.7);
    const betaWater = P.r0 * 0.6 / (24 * P.inf * 36);
    // 4. Nouvelles contaminations
    for (let i = 0; i < A; i++) {
      if (E.st[i] !== 0) continue;
      const T = ag.trip[i];
      const hyg = 1 - 0.7 * Math.min(1, E.hyg[i] + (E.level >= 2 ? 0.2 : 0)), maskF = wearsMask(i) && (T || ag.loc[i] !== ag.home[i]) ? 0.5 : 1, soc = E.social[i];
      let lam = 0, dose = 0;
      if (!T) {
        const p = ag.loc[i], n = placeN[p], inf = placeInf[p] - (isInfectious(i) ? 1 : 0);
        if (inf > 0 && P.h2h) {
          const w = placeWeight(p, n);
          lam += betaPlace * w * inf * (m.R + m.C * (n < 8 ? 1.5 : 0.3)) * maskF * soc;
          lam += betaPlace * m.A * inf * 6 / (n + 5) * maskF;                      // aérosols : tout l'air du lieu
        }
        if (m.F || m.N) lam += betaPlace * 0.08 * placeCont[p] * hyg * (m.F + (E.placeKind[p] === 'repas' || p === E.foodPlace ? m.N * 2 : 0));
        if (m.S) { const q = E.partner[i]; if (q >= 0 && isInfectious(q) && !ag.trip[q] && ag.loc[q] === ag.loc[i] && (hour > 21 || hour < 7)) lam += betaPlace * m.S * 4; }
        if (m.B && E.placeKind[p] === 'hopital' && inf > 0) lam += betaPlace * m.B * inf * 0.3;
        if (m.L && ag.loc[i] === ag.home[i] && inf > 0) lam += betaPlace * m.L * inf * 3;
      } else if (!T.car) {
        const k = Math.floor(ag.x[i] / STREET) + ',' + Math.floor(ag.y[i] / STREET);
        const si = streetMap.get(k); if (si && P.h2h) lam += betaPlace * (m.R + m.A) * si * 3 * maskF;
        if (E.transit[i]) { const o = transitMap.get(Math.floor(ag.x[i] / 60) + ',' + Math.floor(ag.y[i] / 60)); if (o && o[0] > 0 && P.h2h) lam += betaPlace * (m.R + m.A) * o[0] * 8 / (o[1] + 4) * maskF; }
      }
      if (m.O) { const g = gW(ag.x[i], ag.y[i]); lam += betaWater * water[g] / Math.max(1, hostW[g]) * hyg * m.O; }
      if (m.V) { const g = gV(ag.x[i], ag.y[i]); lam += betaVec * vec[g] / Math.max(1, hostV[g]) * clim * biting * m.V; }
      if (m.Z) lam += 0.02 * reservoir[gV(ag.x[i], ag.y[i])] * m.Z;
      if (E.clouds.length && (m.E || m.K)) { const c = cloudConc(ag.x[i], ag.y[i], now, !T) * (E.mask[i] ? 0.6 : 1); dose = c; lam += c * 25 * Math.max(m.E, m.K); }
      if (lam <= 0) continue;
      if (Math.random() < 1 - Math.exp(-lam * dtH)) {
        E.dose[i] += dose * dtH;
        if (P.cat === 'chimique' || P.cat === 'toxine') { E.st[i] = 2; E.tEnd[i] = now + gammaRand(Math.max(P.inc, 0.02)) * D; E.symp[i] = 1; E.sev[i] = 1; }
        else { E.st[i] = 1; E.tEnd[i] = now + gammaRand(P.inc) * D; }
        E.newCases++;
      }
    }
    // Partenaires occasionnels du patient zéro
    if (m.S && E.p0 >= 0 && isInfectious(E.p0) && E.p0prof && E.p0prof.partenaires > 1 && Math.random() < E.p0prof.partenaires / 7 * dtH / 24) {
      const k = Math.floor(Math.random() * A);
      if (E.st[k] === 0 && Math.random() < 0.3) { E.st[k] = 1; E.tEnd[k] = now + gammaRand(P.inc) * D; E.newCases++; }
    }
    // 5. Évolution de chaque malade
    for (let i = 0; i < A; i++) {
      const s = E.st[i]; if ((s !== 1 && s !== 2) || now < E.tEnd[i]) continue;
      if (s === 1) {
        E.st[i] = 2; E.tEnd[i] = now + gammaRand(P.inf) * D;
        E.symp[i] = Math.random() > P.asymp ? 1 : 0; decideIso(i);
      } else {
        let pDie = P.ifr * Math.exp((E.age[i] - 50) / 13) / ageNorm;
        if (P.cat === 'chimique' || P.cat === 'toxine') pDie = P.ifr * Math.min(2, 0.3 + E.dose[i] * 3);
        E.st[i] = Math.random() < Math.min(0.99, pDie) ? 4 : 3;
        if (E.st[i] === 4 && i === E.p0) E.log.push('Le patient zéro est mort.');
      }
    }
    // 6. Synchronisation avec la planète (toutes les 2 s)
    if (performance.now() - E.lastSync > 2000) sync();
  };
  function placeWeight(p, n){
    const k = E.placeKind[p];
    return (k ? KIND_W[k] : 1) / (1 + n / 10);
  }
  function sync(){
    E.lastSync = performance.now();
    const c = [0, 0, 0, 0, 0]; for (let i = 0; i < A; i++) c[E.st[i]]++;
    E.counts = c;
    if (E.running && ctx.onSync) ctx.onSync({ lat: lat0, lon: lng0, E: c[1] * ratio, I: c[2] * ratio, R: c[3] * ratio, D: c[4] * ratio });
  }
  // Cas importés par la planète (voyageurs, voisins) : si la cellule est plus touchée que la ville, on contamine quelques habitants
  E.importFromWorld = function(fracI){
    if (!E.running || !E.P || !E.P.h2h) return;
    const cityI = (E.counts[1] + E.counts[2]) / A;
    if (fracI < cityI * 1.5 + 1 / A) return;
    const k = Math.floor((fracI - cityI) * A * 0.02 + Math.random());
    for (let q = 0; q < Math.min(k, 10); q++) {
      const i = Math.floor(Math.random() * A); if (E.st[i] !== 0) continue;
      E.st[i] = 1; E.tEnd[i] = ctx.now() + gammaRand(E.P.inc) * D;
    }
  };
  E.hlState = i => E.st[i];
  // ---- Passage de relais quand la caméra quitte le quartier : nuages et patient zéro
  E.exportState = function(toLngLat){
    const out = { clouds: E.clouds.map(c => ({ ...c, ll: toLngLat(c.x, c.y) })), p0: null, sick: [] };
    for (let i = 0; i < A && out.sick.length < 4000; i++) {
      if (E.st[i] === 0 || i === E.p0) continue;
      const hp = places[ag.home[i]];
      out.sick.push([toLngLat(hp.x, hp.y), E.st[i], E.tEnd[i], E.symp[i], E.iso[i], E.sev[i]]);
    }
    if (E.p0 >= 0) {
      const i = E.p0, hp = places[ag.home[i]];
      out.p0 = { home: toLngLat(hp.x, hp.y), st: E.st[i], tEnd: E.tEnd[i], symp: E.symp[i], iso: E.iso[i], sev: E.sev[i], prof: E.p0prof };
    }
    return out;
  };
  E.importState = function(st, toXY){
    for (const c of st.clouds) { const [x, y] = toXY(c.ll[0], c.ll[1]); E.clouds.push({ ...c, x, y }); }
    // les autres contaminés retrouvent un habitant au même endroit (s'il est dans le nouveau quartier)
    if (st.sick.length) {
      const cell = 60, grid = new Map();
      for (let i = 0; i < A; i++) { const p = places[ag.home[i]]; const k = Math.floor(p.x / cell) + ',' + Math.floor(p.y / cell); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(i); }
      for (const [ll, s, tEnd, symp, iso, sev] of st.sick) {
        const [x, y] = toXY(ll[0], ll[1]); if (Math.abs(x) > half || Math.abs(y) > half) continue;
        const a = grid.get(Math.floor(x / cell) + ',' + Math.floor(y / cell)); if (!a) continue;
        const i = a.find(k => E.st[k] === 0); if (i === undefined) continue;
        E.st[i] = s; E.tEnd[i] = tEnd; E.symp[i] = symp; E.iso[i] = iso; E.sev[i] = sev;
      }
    }
    if (st.p0) {
      const [x, y] = toXY(st.p0.home[0], st.p0.home[1]);
      const i = E.setPatientZero(st.p0.prof, x, y, 0, true);
      E.st[i] = st.p0.st; E.tEnd[i] = st.p0.tEnd; E.symp[i] = st.p0.symp; E.iso[i] = st.p0.iso; E.sev[i] = st.p0.sev;
    }
  };
  return E;
};
})();
