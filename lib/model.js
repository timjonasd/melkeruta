import { DECL } from './airports.js';
import { tafAt, lfAt } from './weather.js';

const sig = (x) => 1 / (1 + Math.exp(-x));
const BASE_P = 0.02; // grunnrisiko for innstilling (teknisk, mannskap osv.)

// Vindkomponenter mot beste baneende
export function windComponents(ap, dir, spd, gust) {
  if (dir == null) return { xw: spd * 0.5, xwG: (gust ?? spd) * 0.5, hw: 0, rwy: null }; // VRB
  let best = null;
  for (const r of ap.rwy) {
    for (const end of [r, (r + 18 - 1) % 36 + 1]) {
      const hdg = (end * 10 + DECL) % 360;
      const a = ((dir - hdg) * Math.PI) / 180;
      const hw = spd * Math.cos(a);
      const xw = Math.abs(spd * Math.sin(a));
      const xwG = Math.abs((gust ?? spd) * Math.sin(a));
      if (!best || hw > best.hw) best = { xw, xwG, hw, rwy: String(end).padStart(2, '0') };
    }
  }
  return best;
}

// Faktorer for én værtilstand -> { p, drivers, feat }
export function condRisk(ap, c) {
  const spd = c.spd ?? 0, gust = c.gust ?? spd;
  const w = windComponents(ap, c.dir ?? null, spd, gust);
  const xwEff = Math.max(w.xw, w.xwG * 0.85);
  const tail = Math.max(0, -w.hw);
  const ceil = c.ceil ?? 99999, vis = c.vis ?? 10000;
  const parts = {
    sidevind: sig(((xwEff / ap.xw) - 0.97) * 12),
    kast: sig(((gust / ap.gust) - 1) * 10),
    medvind: sig(((tail / ap.tail) - 1) * 8),
    skyhøyde: ceil >= 99999 ? 0 : sig(((ap.ceil / Math.max(ceil, 50)) - 1) * 8),
    sikt: sig(((ap.vis / Math.max(vis, 50)) - 1) * 9),
  };
  let keep = 1;
  for (const v of Object.values(parts)) keep *= 1 - v;
  const feat = {
    xw: +(xwEff / ap.xw).toFixed(3),
    gust: +(gust / ap.gust).toFixed(3),
    ceil: +Math.min(3, ap.ceil / Math.max(ceil, 50)).toFixed(3),
    vis: +Math.min(3, ap.vis / Math.max(vis, 50)).toFixed(3),
  };
  return {
    p: 1 - keep,
    parts,
    feat,
    wx: { dir: c.dir ?? null, spd: +spd.toFixed(1), gust: +gust.toFixed(1), xw: +xwEff.toFixed(1), tail: +tail.toFixed(1), rwy: w.rwy, ceil, vis },
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
  return { p, src, wx: m.wx, worstWx: worst !== m ? worst.wx : null, feat, drivers };
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
