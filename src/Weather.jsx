// Værikoner (à la yr) og animert landingsillustrasjon.
const C = {
  sun: '#F2B544', moon: '#DCE6F0', cloud: '#C9D6E2', cloudDark: '#8EA3B6', rain: '#5BC8F5', snow: '#F4F8FB', bolt: '#F2B544',
};
const r0 = (x) => Math.round(x);
const dir3 = (d) => (d == null ? 'VRB' : String(Math.round(d / 10) * 10 % 360 || 360).padStart(3, '0'));

// ---------- Værikon ----------
const KIND_TEXT = {
  clear: 'Klarvær', fair: 'Lettskyet', partly: 'Delvis skyet', cloudy: 'Skyet', fog: 'Tåke', drizzle: 'Lett regn',
  rain: 'Regn', showers: 'Regnbyger', sleet: 'Sludd', snow: 'Snø', snowshowers: 'Snøbyger', thunder: 'Torden',
};
export const skyText = (sky) => (sky ? KIND_TEXT[sky.kind] || '' : '');

function Cloud({ x = 0, y = 0, s = 1, fill = C.cloud, cls = 'wi-drift' }) {
  return (
    <g className={cls}>
      <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
        <circle cx="8" cy="14" r="4" /><circle cx="12.5" cy="11" r="5" /><circle cx="17" cy="14.5" r="3.5" />
        <rect x="8" y="13" width="9" height="5" />
      </g>
    </g>
  );
}
function Sun({ x = 12, y = 12, r = 4.2 }) {
  return (
    <g>
      <g className="wi-spin" style={{ transformOrigin: `${x}px ${y}px` }} stroke={C.sun} strokeWidth="1.6" strokeLinecap="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
          return <line key={a} x1={x + c * (r + 2)} y1={y + s * (r + 2)} x2={x + c * (r + 4)} y2={y + s * (r + 4)} />;
        })}
      </g>
      <circle cx={x} cy={y} r={r} fill={C.sun} />
    </g>
  );
}
function Moon({ x = 12, y = 12, r = 5 }) {
  return <path className="wi-glow" d={`M${x + r * 0.35} ${y - r} A${r} ${r} 0 1 0 ${x + r} ${y + r * 0.35} A${r * 0.8} ${r * 0.8} 0 0 1 ${x + r * 0.35} ${y - r}Z`} fill={C.moon} />;
}
const Orb = ({ night, ...p }) => (night ? <Moon {...p} /> : <Sun {...p} />);

function Drops({ n = 3, x0 = 8, dx = 4, y = 19, snow = false, mix = false }) {
  return Array.from({ length: n }, (_, i) => {
    const flake = snow || (mix && i % 2 === 1);
    const x = x0 + i * dx;
    return flake
      ? <circle key={i} className="wi-flake" style={{ animationDelay: `${-i * 0.7}s` }} cx={x} cy={y + 1} r="1.1" fill={C.snow} />
      : <line key={i} className="wi-drop" style={{ animationDelay: `${-i * 0.33}s` }} x1={x} y1={y} x2={x - 0.8} y2={y + 2.6} stroke={C.rain} strokeWidth="1.4" strokeLinecap="round" />;
  });
}

export function WeatherIcon({ sky, size = 28 }) {
  if (!sky) return null;
  const { kind, night } = sky;
  const label = `${skyText(sky)}${night ? ' (natt)' : ''}`;
  let body;
  switch (kind) {
    case 'clear': body = <Orb night={night} r={night ? 6 : 5} />; break;
    case 'fair': body = <><Orb night={night} x={10} y={10} r={night ? 5 : 4.5} /><Cloud x={7} y={6} s={0.7} /></>; break;
    case 'partly': body = <><Orb night={night} x={8} y={8} r={night ? 4.2 : 3.6} /><Cloud x={2} y={2} s={0.95} /></>; break;
    case 'cloudy': body = <><Cloud x={4} y={-3} s={0.75} fill={C.cloudDark} cls="wi-drift slow" /><Cloud x={0} y={1} s={0.95} /></>; break;
    case 'fog': body = <>
      <Cloud x={1} y={-3} s={0.95} />
      {[17, 20.5].map((y, i) => <line key={y} className="wi-fog" style={{ animationDelay: `${-i}s` }} x1="4" y1={y} x2="20" y2={y} stroke={C.cloudDark} strokeWidth="1.6" strokeLinecap="round" />)}
    </>; break;
    case 'drizzle': body = <><Cloud x={1} y={-3} s={0.95} /><Drops n={2} x0={10} dx={5} y={17} /></>; break;
    case 'rain': body = <><Cloud x={1} y={-3} s={0.95} fill={C.cloudDark} /><Drops n={3} x0={8} dx={4} y={17} /></>; break;
    case 'showers': body = <><Orb night={night} x={7} y={6} r={3.4} /><Cloud x={2} y={-1} s={0.9} /><Drops n={2} x0={11} dx={4.5} y={18} /></>; break;
    case 'sleet': body = <><Cloud x={1} y={-3} s={0.95} fill={C.cloudDark} /><Drops n={3} x0={8} dx={4} y={17} mix /></>; break;
    case 'snow': body = <><Cloud x={1} y={-3} s={0.95} /><Drops n={3} x0={8} dx={4} y={17} snow /></>; break;
    case 'snowshowers': body = <><Orb night={night} x={7} y={6} r={3.4} /><Cloud x={2} y={-1} s={0.9} /><Drops n={2} x0={11} dx={4.5} y={18} snow /></>; break;
    case 'thunder': body = <>
      <Cloud x={1} y={-4} s={0.95} fill={C.cloudDark} />
      <path className="wi-flash" d="M12.5 13.5l-2.5 4.5h3l-1.5 4.5 4.5-6h-3l1.5-3z" fill={C.bolt} />
    </>; break;
    default: body = <Cloud x={0} y={0} s={1} />;
  }
  return (
    <svg className="wi" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
      <title>{label}</title>{body}
    </svg>
  );
}

// ---------- Landingsillustrasjon ----------
// Sett fra siden av banen med fast geografi: lav baneende (rwy[0]) til venstre, høy til høyre.
// Flyet kommer inn mot terskelen til banen i bruk, så det bytter side og retning når banen byttes.
// Vindpølsen viser vinden mot banen,
// skydekket er tegnet i riktig høyde mot en høydeskala, og nedbør/tåke legges oppå.
const W = 372, H = 230;
const GY = 196;        // banens senterlinje på skjermen (0 ft)
const TOP = 16;        // toppen av høydeskalaen
const HMAX = 5000;     // ft øverst på skalaen
const CX = 192, HL = 112; // banens midtpunkt og halve lengde (px)
const DEPTH = 26;      // dybde (px) for v = ±1 på bakkeplanet
const AXIS = 340;

const yOf = (ft) => GY - (GY - TOP) * Math.sqrt(Math.min(Math.max(ft, 0), HMAX) / HMAX);
// Bakkeplan -> skjerm. u: langs banen (+ = retningen til lav baneende, mot høyre), v: på tvers (+ = høyre for flyet = nærmest oss)
const P = (u, v) => { const k = 1 + 0.16 * v; return [CX + u * HL * k, GY + v * DEPTH]; };

// Deterministisk "tilfeldig" tall slik at illustrasjonen ikke hopper ved hver rendering
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function Windsock({ rel, e, amp, period, vrb, end = -1 }) {
  // Pæl på nær side av banen, ved terskelen til banen i bruk
  const [bx, by] = P(0.72 * end, 0.85);
  const tx = bx, ty = by - 34;
  // Retning med vinden (medvinds), projisert. Henger rett ned når det er stille.
  const du = Math.cos(rel), dv = Math.sin(rel);
  let sx = du * e, sy = dv * 0.42 * e + (1 - e) * 0.95 + 0.06;
  const n = Math.hypot(sx, sy) || 1; sx /= n; sy /= n;
  const L = 42 * (e * Math.max(0.35, Math.hypot(du, dv * 0.42)) + (1 - e) * 0.7);
  const px = -sy, py = sx; // normal
  const segs = [];
  for (let i = 0; i < 5; i++) {
    const a = i / 5, b = (i + 1) / 5;
    const wa = 5 - a * 2.2, wb = 5 - b * 2.2;
    const ax = tx + sx * L * a, ay = ty + sy * L * a, bx2 = tx + sx * L * b, by2 = ty + sy * L * b;
    segs.push(
      <path key={i} d={`M${ax + px * wa} ${ay + py * wa} L${bx2 + px * wb} ${by2 + py * wb} L${bx2 - px * wb} ${by2 - py * wb} L${ax - px * wa} ${ay - py * wa}Z`}
        fill={i % 2 ? '#EAF1F7' : '#FF8A5B'} />,
    );
  }
  return (
    <g>
      <ellipse cx={bx} cy={by} rx="6" ry="2" fill="#000" opacity=".25" />
      <line x1={bx} y1={by} x2={tx} y2={ty - 2} stroke="#C9D6E2" strokeWidth="2" strokeLinecap="round" />
      <g className={vrb ? 'sock vrb' : 'sock'} style={{ transformOrigin: `${tx}px ${ty}px`, '--amp': `${amp}deg`, animationDuration: `${period}s` }}>
        <ellipse cx={tx} cy={ty} rx={1.6} ry={5.2} fill="none" stroke="#C9D6E2" strokeWidth="1.2"
          transform={`rotate(${(Math.atan2(sy, sx) * 180) / Math.PI} ${tx} ${ty})`} />
        {segs}
      </g>
    </g>
  );
}

function CloudLayer({ base, cover, night, drift, low }) {
  if (base == null || !cover) return null;
  const y = yOf(base);
  const fill = night ? '#5E738A' : '#B8C7D6';
  const shade = night ? '#4A5D72' : '#9DB0C2';
  const puffs = [];
  const span = 2 * AXIS; // to kopier for sømløs drift
  const count = [0, 3, 5, 9, 12][cover];
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < count; i++) {
      const gapOk = cover >= 4 || rnd(i + 7) < [0, 0.9, 0.85, 0.75][cover];
      if (!gapOk) continue;
      const x = k * AXIS + (i + 0.5) * (AXIS / count) + (rnd(i) - 0.5) * 18;
      const r = 9 + rnd(i + 3) * (cover >= 3 ? 9 : 6);
      puffs.push(<g key={`${k}-${i}`}>
        <circle cx={x} cy={y - r * 0.55} r={r} fill={fill} />
        <circle cx={x - r * 0.8} cy={y - r * 0.35} r={r * 0.62} fill={fill} />
        <circle cx={x + r * 0.85} cy={y - r * 0.3} r={r * 0.55} fill={fill} />
        <rect x={x - r * 1.35} y={y - r * 0.5} width={r * 2.7} height={r * 0.5} fill={fill} />
      </g>);
    }
  }
  const band = cover >= 3;
  return (
    <g>
      {band && <rect x="0" y={TOP - 20} width={AXIS} height={Math.max(0, y - 14 - TOP + 20)} fill={shade} opacity={cover >= 4 ? 0.9 : 0.55} />}
      <g className="drift" style={{ '--dist': `${-AXIS}px`, animationDuration: `${drift.dur}s`, animationDirection: drift.dir }}>
        {puffs}
        {band && <rect x="0" y={y - 18} width={span} height="6" fill={fill} opacity=".8" />}
      </g>
      {low && <line x1="0" x2={AXIS} y1={y} y2={y} stroke="var(--high)" strokeWidth="1" opacity=".5" />}
    </g>
  );
}

function Precip({ phen, base, slant }) {
  if (!phen || !['ts', 'sl', 'sn', 'shsn', 'ra', 'shra', 'dz'].includes(phen)) return null;
  const y0 = yOf(base ?? 2500) - 2;
  const fall = GY + 30 - y0;
  const snowy = ['sn', 'shsn'].includes(phen);
  const n = phen === 'dz' ? 18 : phen.startsWith('sh') ? 26 : 38;
  const items = [];
  for (let i = 0; i < n; i++) {
    const flake = snowy || (phen === 'sl' && i % 2);
    const x = rnd(i + 50) * (AXIS + 60) - 30;
    const y = y0 + rnd(i + 90) * 10;
    const dur = flake ? 3.2 + rnd(i) * 1.6 : 0.8 + rnd(i) * 0.4;
    const st = { '--dx': `${slant * (flake ? 2.4 : 0.8) * fall}px`, '--dy': `${fall}px`, animationDuration: `${dur}s`, animationDelay: `${-rnd(i + 20) * dur}s` };
    items.push(flake
      ? <circle key={i} className="fall" style={st} cx={x} cy={y} r={1.4 + rnd(i + 4)} fill={C.snow} opacity=".85" />
      : <line key={i} className="fall" style={st} x1={x} y1={y} x2={x + slant * 7} y2={y + 7} stroke={C.rain} strokeWidth={phen === 'dz' ? 1 : 1.4} opacity=".75" strokeLinecap="round" />);
  }
  return <g>{items}</g>;
}

const hazeOf = (vis) => (vis <= 800 ? 0.8 : vis <= 1500 ? 0.62 : vis <= 3000 ? 0.45 : vis <= 5000 ? 0.28 : vis < 8000 ? 0.14 : 0);

export function LandingScene({ ap, w, sky }) {
  const night = !!sky?.night;
  const useHigh = w.rwy && w.rwy === ap.rwy[1];
  const inUse = useHigh ? ap.rwy[1] : ap.rwy[0];
  const end = useHigh ? 1 : -1; // terskelen til banen i bruk: venstre (lav ende) eller høyre (høy ende)
  const H0 = ap.hdg; // skjermens +u-retning (°T) = retningen til lav baneende
  const vrb = w.dir == null;
  const spd = w.spd ?? 0, gust = w.gust ?? spd;
  // Luftens bevegelse (mot) relativt til skjermens +u-retning
  const rel = vrb ? Math.PI / 2 : (((w.dir + 180 - H0) % 360) * Math.PI) / 180;
  const e = vrb ? 0.15 : Math.min(1, spd / 7.7); // vindpølse er full ved ca. 15 kt
  const amp = vrb ? 35 : 2 + Math.min(10, Math.max(0, gust - spd) * 1.1) + (spd < 3 ? 4 : 0);
  const period = vrb ? 4 : Math.max(0.35, 1.6 - spd * 0.08);
  const du = Math.cos(rel), dv = Math.sin(rel);
  const drift = { dur: Math.max(18, 260 / (Math.abs(du) * spd + 1)), dir: du >= 0 ? 'reverse' : 'normal' };

  const base = w.ceil < 99999 ? w.ceil : w.base ?? (w.cover ? 4500 : null);
  const cover = w.ceil < 99999 ? Math.max(w.cover ?? 3, 3) : w.cover ?? (base ? 2 : 0);
  const minCeil = w.minCeil ?? ap.limits?.ceil;
  const low = w.ceil < 99999 && w.ceil < minCeil;
  // Minimumslinjen: mørk tekst når den ligger over lys sky (overskyet), ellers gul mot mørk himmel
  const onLight = !night && base != null && cover >= 3 && minCeil >= base - 150;
  const minCol = onLight ? '#5A3B00' : 'var(--mid)';
  const haze = Math.max(hazeOf(w.vis ?? 10000), w.phen === 'fg' ? 0.55 : w.phen === 'br' ? 0.2 : 0);

  // Bane (trapes på bakkeplanet)
  const hw = 0.13;
  const corners = [P(-1, -hw), P(1, -hw), P(1, hw), P(-1, hw)];
  const [lx, ly] = P(-1, 0), [hx, hy] = P(1, 0);
  const [thx, thy] = useHigh ? [hx, hy] : [lx, ly];
  // Vindstreker på bakken
  const streaks = vrb || spd < 1 ? [] : Array.from({ length: 9 }, (_, i) => {
    const u = -1.25 + rnd(i + 200) * 2.4, v = -0.95 + rnd(i + 300) * 1.9;
    const [x, y] = P(u, v);
    const [x2, y2] = P(u + du * 0.12, v + dv * 0.12);
    const [mx, my] = P(u + du * 0.45, v + dv * 0.45);
    const dur = Math.max(0.7, 3 - spd * 0.13);
    return <line key={i} className="streak" x1={x} y1={y} x2={x2} y2={y2}
      style={{ '--dx': `${mx - x}px`, '--dy': `${my - y}px`, animationDuration: `${dur}s`, animationDelay: `${-rnd(i) * dur}s` }}
      stroke="#EAF1F7" strokeWidth="1.3" strokeLinecap="round" />;
  });
  const slant = vrb ? 0 : du * Math.min(1, spd / 14);
  const ticks = [500, 1000, 2000, 3000, 5000];

  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Bane ${inUse}. Vind ${vrb ? 'variabel' : `fra ${dir3(w.dir)} grader`} ${r0(spd)} meter per sekund. ${w.ceil < 99999 ? `Skytak ${w.ceil} fot` : 'Ingen skytak'}.`}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#060E18' : '#1C3A57'} />
          <stop offset="1" stopColor={night ? '#14283C' : '#3B6788'} />
        </linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9D6E2" stopOpacity="0" />
          <stop offset=".45" stopColor="#C9D6E2" stopOpacity=".6" />
          <stop offset="1" stopColor="#C9D6E2" stopOpacity="1" />
        </linearGradient>
        <clipPath id="sceneClip"><rect width={AXIS} height={H} /></clipPath>
      </defs>

      <g clipPath="url(#sceneClip)">
        <rect width={AXIS} height={H} fill="url(#sky)" />
        {night && cover < 3 && Array.from({ length: 14 }, (_, i) => (
          <circle key={i} className="star" style={{ animationDelay: `${-rnd(i + 400) * 4}s` }} cx={rnd(i + 500) * AXIS} cy={TOP + rnd(i + 600) * 90} r={0.5 + rnd(i) * 0.8} fill="#fff" />
        ))}
        {w.phen === 'ts' && <rect className="sky-flash" width={AXIS} height={H} fill="#fff" />}

        {/* fjell i horisonten */}
        <path d={`M0 172 L28 150 L52 160 L84 138 L118 158 L150 146 L178 162 L214 140 L252 157 L286 144 L318 160 L${AXIS} 150 L${AXIS} 176 L0 176Z`} fill={night ? '#0E1B28' : '#22394F'} />
        <path d={`M84 138 L76 145 L92 146Z M214 140 L206 147 L222 148Z M286 144 L279 150 L293 151Z`} fill="#DCE6F0" opacity={night ? 0.35 : 0.6} />
        <rect y="168" width={AXIS} height={H - 168} fill={night ? '#0D1925' : '#1A2C3D'} />

        {/* bane */}
        <path d={`M${corners.map((c) => c.join(' ')).join(' L')}Z`} fill="#33475A" stroke="#56708A" strokeWidth=".8" />
        <line x1={lx + 12} y1={ly} x2={hx - 12} y2={hy} stroke="#EAF1F7" strokeWidth="1" strokeDasharray="7 7" opacity=".7" />
        {/* innflygingslys (blitz) før terskel */}
        {[0, 1, 2, 3].map((i) => {
          const [x, y] = P(end * (1.08 + i * 0.07), 0);
          return <circle key={i} className="rabbit" style={{ animationDelay: `${(3 - i) * 0.12}s` }} cx={x} cy={y} r="1.6" fill="#FFF6D0" />;
        })}
        <text x={lx + 4} y={ly + 22} className="rwy-num" opacity={useHigh ? 0.55 : 1}>{ap.rwy[0]}</text>
        <text x={hx - 4} y={hy + 22} className="rwy-num" textAnchor="end" opacity={useHigh ? 1 : 0.55}>{ap.rwy[1]}</text>

        {/* fly på innflyging */}
        <g className="plane" style={{ '--tx': `${thx + 24 * end}px`, '--ty': `${thy - 32}px`, '--sx': -end }}>
          <path d="M-11 0 Q-11 -2.4 -7 -2.6 L7 -2.6 Q11 -2.4 12 0 Q11 1.6 7 1.6 L-7 1.6 Q-11 1.6 -11 0Z" fill="#EAF1F7" />
          <path d="M-9 -2.4 L-12 -8 L-9.5 -8 L-5.5 -2.4Z" fill="#EAF1F7" />
          <rect x="-3" y="-4" width="9" height="1.6" rx=".8" fill="#C9D6E2" />
          <circle cx="1.5" cy="-1.6" r="1" fill="#C9D6E2" />
        </g>

        {streaks}
        <CloudLayer base={base} cover={cover} night={night} drift={drift} low={low} />
        <Precip phen={w.phen} base={base} slant={slant} />
        <Windsock rel={rel} e={e} amp={amp} period={period} vrb={vrb} end={end} />
        {haze > 0 && <rect className="haze" y={70} width={AXIS} height={H - 70} fill="url(#haze)" opacity={haze} />}

        {/* minimum skytak */}
        {minCeil && <g>
          <line x1="0" x2={AXIS} y1={yOf(minCeil)} y2={yOf(minCeil)} stroke={minCol} strokeWidth="1.2" strokeDasharray="5 4" />
          <text x="8" y={yOf(minCeil) - 5} className="scene-lbl" fill={minCol}>min {minCeil} ft{w.apch === 'sirkling' ? ' (sirkling)' : ''}</text>
        </g>}
      </g>

      {/* høydeskala */}
      <line x1={AXIS + 4} x2={AXIS + 4} y1={TOP} y2={GY} stroke="var(--track)" strokeWidth="1" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={AXIS + 1} x2={AXIS + 7} y1={yOf(t)} y2={yOf(t)} stroke="var(--line)" />
          <text x={AXIS + 9} y={yOf(t) + 3} className="axis-lbl">{t >= 1000 ? `${t / 1000}k` : t}</text>
        </g>
      ))}
      <text x={AXIS + 9} y={GY + 3} className="axis-lbl">0</text>
      {base != null && cover > 0 && (
        <g>
          <path d={`M${AXIS - 2} ${yOf(base)} l6 -4 v8z`} fill={low ? 'var(--high)' : 'var(--text)'} />
        </g>
      )}
    </svg>
  );
}

// Tekstlinjer under illustrasjonen ("vær ved landing")
export function sceneFacts(ap, w) {
  const useHigh = w.rwy && w.rwy === ap.rwy[1];
  const H0 = useHigh ? (ap.hdg + 180) % 360 : ap.hdg;
  const spd = w.spd ?? 0;
  const a = w.dir == null ? null : (((w.dir - H0) % 360) + 360) % 360 * (Math.PI / 180);
  const head = a == null ? null : spd * Math.cos(a);
  const side = a == null ? null : Math.sin(a) >= 0 ? 'høyre' : 'venstre';
  return { head, side };
}
