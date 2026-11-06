import { endMinima } from './airports.js';
import { tafAt, lfAt } from './weather.js';

const sig = (x) => 1 / (1 + Math.exp(-x));
const BASE_P = 0.02; // grunnrisiko for innstilling (teknisk, mannskap osv.)

// Vindkomponenter mot én baneende (hdg = sann retning for den enden)
function endWind(dir, spd, gust, hdg) {
  if (dir == null) return { xw: spd * 0.5, xwG: (gust ?? spd) * 0.5, hw: 0 }; // VRB
  const a = ((dir - hdg) * Math.PI) / 180;
  return { xw: Math.abs(spd * Math.sin(a)), xwG: Math.abs((gust ?? spd) * Math.sin(a)), hw: spd * Math.cos(a) };
}

// Vindkomponenter mot baneenden med mest motvind (brukes til visning)
export function windComponents(ap, dir, spd, gust) {
  let best = null;
  for (const [end, hdg] of [[ap.rwy[0], ap.hdg], [ap.rwy[1], (ap.hdg + 180) % 360]]) {
    const w = { ...endWind(dir, spd, gust, hdg), rwy: dir == null ? null : end };
    if (!best || w.hw > best.hw) best = w;
  }
  return best;
}

// Risiko for én baneende med dens egne minima
function endRisk(ap, end, hdg, c) {
  const spd = c.spd ?? 0, gust = c.gust ?? spd;
  const w = endWind(c.dir ?? null, spd, gust, hdg);
  const mn = endMinima(ap, end);
  const xwEff = Math.max(w.xw, w.xwG * 0.85);
  const tail = Math.max(0, -w.hw);
  const ceil = c.ceil ?? 99999, vis = c.vis ?? 10000;
  const parts = {
    sidevind: sig(((xwEff / ap.xw) - 0.97) * 12),
    kast: sig(((gust / ap.gust) - 1) * 10),
    medvind: sig(((tail / ap.tail) - 1) * 8),
    skyhøyde: ceil >= 99999 ? 0 : sig(((mn.ceil / Math.max(ceil, 50)) - 1) * 8),
    sikt: sig(((mn.vis / Math.max(vis, 50)) - 1) * 9),
  };
  let keep = 1;
  for (const v of Object.values(parts)) keep *= 1 - v;
  return { p: 1 - keep, parts, w, mn, xwEff, tail, spd, gust, ceil, vis };
}

// Faktorer for én værtilstand -> { p, drivers, feat }. Velger baneenden med lavest risiko.
export function condRisk(ap, c) {
  let r = null;
  for (const [end, hdg] of [[ap.rwy[0], ap.hdg], [ap.rwy[1], (ap.hdg + 180) % 360]]) {
    const e = { ...endRisk(ap, end, hdg, c), end };
    if (!r || e.p < r.p - 1e-9 || (Math.abs(e.p - r.p) < 1e-9 && e.w.hw > r.w.hw)) r = e;
  }
  const { mn } = r;
  const feat = {
    xw: +(r.xwEff / ap.xw).toFixed(3),
    gust: +(r.gust / ap.gust).toFixed(3),
    ceil: +Math.min(3, mn.ceil / Math.max(r.ceil, 50)).toFixed(3),
    vis: +Math.min(3, mn.vis / Math.max(r.vis, 50)).toFixed(3),
  };
  return {
    p: r.p,
    parts: r.parts,
    feat,
    wx: {
      dir: c.dir ?? null, spd: +r.spd.toFixed(1), gust: +r.gust.toFixed(1), xw: +r.xwEff.toFixed(1), tail: +r.tail.toFixed(1),
      rwy: c.dir == null ? null : r.end, ceil: r.ceil, vis: r.vis, minCeil: mn.ceil, minVis: mn.vis, apch: mn.type,
      phen: c.phen ?? null, cover: c.cover ?? null, base: c.base ?? (r.ceil < 99999 ? r.ceil : null), temp: c.temp ?? null,
    },
  };
}

// Regelbasert sannsynlighet for innstilling ved tid t
export function ruleRisk(ap, wx, t) {
  const tf = tafAt(wx.taf, t);
  const lf = lfAt(wx.lf, t);
  let src, main, temps = [];
  if (tf) {
    src = 'TAF';
    main = tf.main;
    temps = tf.temps;
    // TAF mangler kast -> bruk prognosens kast hvis høyere
    if (lf && (main.gust == null || main.gust < lf.gust)) main = { ...main, gust: Math.max(main.gust ?? 0, lf.gust * 0.9) };
    // TAF uten værfenomen/skydekke -> fyll inn fra prognosen (kun til visning)
    if (lf && main.phen === undefined) main = { ...main, phen: lf.phen };
    if (lf && main.cover == null) main = { ...main, cover: lf.cover };
    if (lf && main.temp == null) main = { ...main, temp: lf.temp };
  } else if (lf) {
    src = 'Prognose';
    main = lf;
  } else return null;

  const m = condRisk(ap, main);
  let keep = 1 - m.p;
  let worst = m;
  for (const tp of temps) {
    const r = condRisk(ap, tp.cond);
    keep *= 1 - tp.w * r.p;
    if (r.p > worst.p) worst = r;
  }
  const p = 1 - (1 - BASE_P) * keep;
  // Feature-vektor for historikk: hovedtilstand, med TEMPO vektet inn
  const feat = {};
  for (const k of Object.keys(m.feat)) feat[k] = +(m.feat[k] + (worst.feat[k] - m.feat[k]) * 0.5).toFixed(3);
  const drivers = Object.entries(worst.parts).filter(([, v]) => v > 0.1).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  return { p, src, wx: m.wx, worstWx: worst !== m ? worst.wx : null, feat, drivers, sym: lf?.sym || '' };
}

// Kalibrering mot historikk: nærmeste naboer i feature-rommet, Beta-prior fra regelmodellen
export function calibrate(rule, history, iata) {
  if (!history?.length) return { p: rule.p, n: 0, cancels: 0 };
  const d = (a, b) => Math.hypot(a.xw - b.xw, a.gust - b.gust, (a.ceil - b.ceil) * 0.7, (a.vis - b.vis) * 0.7);
  const scored = history
    .filter((h) => h.feat && (h.outcome === 'ok' || h.outcome === 'cancelled'))
    .map((h) => ({ h, dist: d(rule.feat, h.feat) + (h.ap === iata ? 0 : 0.15) }))
    .filter((x) => x.dist < 0.35)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 30);
  const n = scored.length;
  const cancels = scored.filter((x) => x.h.outcome === 'cancelled').length;
  const PRIOR = 8;
  return { p: (cancels + PRIOR * rule.p) / (n + PRIOR), n, cancels };
}
