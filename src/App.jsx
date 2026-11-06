import { useEffect, useMemo, useState } from 'react';
import { AIRPORTS } from '../lib/airports.js';

// ---------- hjelpere ----------
const KEY = 'melkeruta.airport';
const load = () => { try { return localStorage.getItem(KEY) || 'HVG'; } catch { return 'HVG'; } };
const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

const LARGE = new Set(['ALF', 'LKL', 'KKN']);
const GROUPS = [
  ['Kortbaner', AIRPORTS.filter((a) => !LARGE.has(a.iata))],
  ['Stamflyplasser', AIRPORTS.filter((a) => LARGE.has(a.iata))],
];

const isDone = (f) => f.status === 'A' || f.status === 'C';
const pctOf = (f) => (f.pCancel == null ? null : Math.round(f.pCancel * 100));
const riskColor = (p) => (p < 15 ? 'var(--low)' : p < 50 ? 'var(--mid)' : 'var(--high)');
const loadColor = (r) => (r < 0.6 ? 'var(--low)' : r < 0.9 ? 'var(--mid)' : 'var(--high)');
const r0 = (x) => Math.round(x);
const dir3 = (d) => (d == null ? 'VRB' : String(Math.round(d / 10) * 10 % 360 || 360).padStart(3, '0'));
const ceilTxt = (c) => (c >= 99999 ? 'fritt' : `${c} ft`);
const visTxt = (v) => (v >= 10000 ? '10+ km' : v >= 5000 ? `${r0(v / 1000)} km` : `${v} m`);

function verdict(f) {
  if (f.status === 'C') return { cls: 'high', text: 'Innstilt' };
  if (f.status === 'A') return { cls: 'done', text: `Landet ${f.statusTime || ''}`.trim() };
  const p = pctOf(f);
  if (p == null) return { cls: 'muted', text: 'Mangler værdata' };
  if (p < 15) return { cls: 'low', text: 'Flys som normalt' };
  if (p < 50) return { cls: 'mid', text: 'Usikkert' };
  return { cls: 'high', text: 'Sannsynlig innstilt' };
}

function sortFlights(list) {
  const open = list.filter((f) => !isDone(f)).sort((a, b) => new Date(a.sched) - new Date(b.sched));
  const done = list.filter(isDone).sort((a, b) => new Date(b.sched) - new Date(a.sched));
  return [...open, ...done];
}

const route = (f) => `fra ${f.fromName}`;
const via = (f) => (f.viaName ? `via ${f.viaName}` : '');

// ---------- ikoner ----------
const Icon = ({ d, size = 20, label, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
    {d.map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const I = {
  refresh: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
  chevDown: ['M6 9l6 6 6-6'],
  back: ['M15 18l-6-6 6-6'],
  check: ['M20 6L9 17l-5-5'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
};

// ---------- komponenter ----------
function Ring({ p }) {
  return (
    <div className="ring-wrap">
      <div className="ring" style={{ background: `conic-gradient(${riskColor(p)} ${Math.max(p, 2)}%, var(--track) 0)` }}>
        <span>{p}%</span>
      </div>
      <span className="ring-label">risiko</span>
    </div>
  );
}

function NowPanel({ data }) {
  const c = data.current;
  const L = data.airport.limits;
  if (!c) return <section className="panel now"><p className="muted">Ingen METAR tilgjengelig – bruker værprognose.</p></section>;
  const cells = [
    ['Vind', r0(c.spd), 'm/s', c.gust > c.spd + 2 ? `fra ${dir3(c.dir)}°, kast ${r0(c.gust)}` : `fra ${dir3(c.dir)}°`],
    [`Sidevind${c.rwy ? ` ${c.rwy}` : ''}`, r0(c.xw), 'm/s', `grense ${L.xw}`],
    ['Skytak', c.ceil >= 99999 ? 'fritt' : c.ceil, c.ceil >= 99999 ? '' : 'ft', `min ${c.minCeil ?? L.ceil}${c.apch === 'sirkling' ? ' (sirkling)' : ''}`],
    ['Sikt', c.vis >= 10000 ? '10+' : c.vis >= 5000 ? r0(c.vis / 1000) : c.vis, c.vis >= 5000 ? 'km' : 'm', c.phrase || `min ${c.minVis ?? L.vis} m`],
  ];
  return (
    <section className="panel now">
      <div className="panel-head">
        <span className="eyebrow">Nå · METAR {c.time}</span>
        {c.rwy && <span className="muted small">Bane {c.rwy} i bruk</span>}
      </div>
      <div className="now-grid">
        {cells.map(([label, val, unit, sub]) => (
          <div key={label} className="now-cell">
            <span className="muted xs">{label}</span>
            <span className="mono big">{val}{unit && <span className="unit"> {unit}</span>}</span>
            <span className="muted xs">{sub}</span>
          </div>
        ))}
      </div>
      {data.metar && <p className="mono raw">{data.metar}</p>}
    </section>
  );
}

function FlightCard({ f, onOpen }) {
  const v = verdict(f);
  const p = pctOf(f);
  if (isDone(f)) {
    return (
      <li className="card done">
        <div className="card-time">
          <span className="mono time">{f.time}</span>
          <span className={`xs ${f.status === 'C' ? 'c-high strong' : 'muted'}`}>{v.text}</span>
        </div>
        <div className="card-body">
          <span className="strong">{f.flight} <span className="muted normal">{route(f)}</span></span>
          {via(f) && <span className="muted xs">{via(f)}</span>}
        </div>
        {f.status === 'C'
          ? <Icon d={I.x} size={24} color="var(--high)" label="Innstilt" />
          : <Icon d={I.check} size={24} color="var(--accent)" label="Landet" />}
      </li>
    );
  }
  return (
    <li>
      <button className="card open" onClick={() => onOpen(f.id)}>
        <div className="card-time">
          <span className="mono time">{f.time}</span>
          {f.status === 'E' && f.statusTime && <span className="xs c-mid strong">ny tid {f.statusTime}</span>}
        </div>
        <div className="card-body">
          <span className="strong">{f.flight} <span className="muted normal">{route(f)}</span></span>
          <span className="muted xs">{[via(f), f.src].filter(Boolean).join(' · ')}</span>
          <span className={`xs c-${v.cls}`}>{v.text}</span>
        </div>
        {p != null && <Ring p={p} />}
      </button>
    </li>
  );
}

function FlightTable({ flights, onOpen }) {
  return (
    <div className="table-box">
      <table>
        <thead>
          <tr><th>Tid</th><th>Flight</th><th>Fra</th><th>Status</th><th>Vær ved landing</th><th className="right">Risiko</th></tr>
        </thead>
        <tbody>
          {flights.map((f) => {
            const v = verdict(f), p = pctOf(f), done = isDone(f), w = f.wx;
            return (
              <tr key={f.id} className={done ? 'done' : ''}>
                <td className="mono time-sm">{f.time}</td>
                <td className="strong">{done ? f.flight : <button className="linklike" onClick={() => onOpen(f.id)}>{f.flight}</button>}</td>
                <td>{f.fromName}{f.viaName ? ` via ${f.viaName}` : ''}</td>
                <td className={`strong c-${f.status === 'E' ? 'mid' : v.cls}`}>
                  {f.status === 'E' && f.statusTime ? `Ny tid ${f.statusTime}` : done ? v.text : v.text}
                </td>
                <td>{!done && w ? `${dir3(w.dir)}° ${r0(w.spd)} m/s${w.gust > w.spd + 2 ? `, kast ${r0(w.gust)}` : ''}${f.worstWx ? ` · TEMPO ${r0(f.worstWx.spd)} m/s` : ''}` : '–'}</td>
                <td className="right">
                  {!done && p != null ? (
                    <span className="mini">
                      <span className="mini-bar"><span style={{ width: `${Math.max(p, 2)}%`, background: riskColor(p) }} /></span>
                      <span className="mono">{p}%</span>
                    </span>
                  ) : '–'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WindRose({ ap, w }) {
  const pt = (deg, r) => [56 + r * Math.sin((deg * Math.PI) / 180), 56 - r * Math.cos((deg * Math.PI) / 180)];
  const [lx, ly] = pt(ap.hdg + 180, 30);
  const [hx, hy] = pt(ap.hdg, 30);
  const hasDir = w.dir != null;
  const [ax, ay] = pt(w.dir ?? 0, 50);
  const [bx, by] = pt(w.dir ?? 0, 16);
  const ang = (((w.dir ?? 0) + 180) * Math.PI) / 180;
  const head = (s) => [bx - 8 * Math.sin(ang + s), by + 8 * Math.cos(ang + s)];
  const [h1x, h1y] = head(0.5), [h2x, h2y] = head(-0.5);
  return (
    <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`Vind fra ${dir3(w.dir)} grader, bane ${ap.rwy.join('/')}`}>
      <circle cx="56" cy="56" r="50" fill="none" stroke="var(--track)" strokeWidth="2" />
      <text x="56" y="16" fill="var(--muted)" fontSize="10" textAnchor="middle">N</text>
      <rect x="20" y="51" width="72" height="10" rx="2" fill="var(--line)" transform={`rotate(${ap.hdg - 90} 56 56)`} />
      <text x={lx} y={ly + 3} fill="var(--muted)" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">{ap.rwy[0]}</text>
      <text x={hx} y={hy + 3} fill="var(--muted)" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">{ap.rwy[1]}</text>
      {hasDir && <>
        <path d={`M${ax} ${ay} L${bx} ${by}`} stroke="var(--mid)" strokeWidth="3" strokeLinecap="round" />
        <path d={`M${h1x} ${h1y} L${bx} ${by} L${h2x} ${h2y}`} fill="none" stroke="var(--mid)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>}
    </svg>
  );
}

function Bar({ label, value, ratio }) {
  return (
    <div className="bar-row">
      <div className="bar-head"><span>{label}</span><span className="mono">{value}</span></div>
      <div className="bar"><span style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%`, background: loadColor(ratio) }} /></div>
    </div>
  );
}

function Detail({ f, data, onBack }) {
  const ap = data.airport, L = ap.limits, w = f.wx, t = f.worstWx;
  const p = pctOf(f);
  const v = verdict(f);
  const path = [f.fromName, ...(f.viaName ? f.viaName.split(', ') : []), ap.name].join(' → ');
  return (
    <div className="detail">
      <button className="back" onClick={onBack}><Icon d={I.back} size={18} />{ap.name}</button>
      <div className="detail-title">
        <h1>{f.flight} · <span className="mono normal">{f.time}</span></h1>
        <span className="muted small">{path}{f.status === 'E' && f.statusTime ? <> · <span className="c-mid strong">ny tid {f.statusTime}</span></> : null}</span>
      </div>

      {p != null && (
        <section className="panel">
          <div className="risk-head">
            <div className="stack-2">
              <span className="eyebrow">Risiko for innstilling</span>
              <span className={`strong c-${v.cls}`}>{v.text}</span>
            </div>
            <span className="mono huge">{p}<span className="unit-l">%</span></span>
          </div>
          <div className="scale">
            <span className="fill" style={{ width: `${Math.max(p, 1)}%`, background: riskColor(p) }} />
            <span className="tick" style={{ left: '15%' }} /><span className="tick" style={{ left: '50%' }} />
          </div>
          <div className="scale-labels xs muted"><span>Normalt &lt;15 %</span><span>Usikkert</span><span className="right">Innstilt &gt;50 %</span></div>
        </section>
      )}

      {w && (
        <section className="panel wind">
          <WindRose ap={ap} w={w} />
          <div className="stack-6">
            <span className="eyebrow">Vind ved landing · {f.src}</span>
            <span className="mono mid-size">{dir3(w.dir)}° {r0(w.spd)} m/s</span>
            <span className="small soft">{w.rwy ? `Bane ${w.rwy}` : ''}{w.gust > w.spd + 2 ? ` · kast ${r0(w.gust)} m/s` : ''}</span>
            {t && <span className="xs c-mid">TEMPO: {r0(t.spd)} m/s, kast {r0(t.gust)}{t.ceil < 99999 ? `, tak ${t.ceil} ft` : ''}</span>}
          </div>
        </section>
      )}

      {w && (
        <section className="panel stack-14">
          <span className="eyebrow">Mot grensene</span>
          <Bar label="Kast" value={`${w.gust.toFixed(1)} / ${L.gust} m/s`} ratio={(t ? Math.max(w.gust, t.gust) : w.gust) / L.gust} />
          <Bar label="Sidevind" value={`${w.xw.toFixed(1)} / ${L.xw} m/s`} ratio={(t ? Math.max(w.xw, t.xw) : w.xw) / L.xw} />
          {w.tail > 0 && <Bar label="Medvind" value={`${w.tail.toFixed(1)} / ${L.tail} m/s`} ratio={w.tail / L.tail} />}
          <Bar label="Skytak" value={`${ceilTxt(w.ceil)} · min ${w.minCeil ?? L.ceil}${w.apch === 'sirkling' ? ' (sirkling)' : ''}`} ratio={(w.minCeil ?? L.ceil) / Math.max(50, t ? Math.min(w.ceil, t.ceil) : w.ceil)} />
          <Bar label="Sikt" value={`${visTxt(w.vis)} · min ${w.minVis ?? L.vis} m`} ratio={(w.minVis ?? L.vis) / Math.max(50, t ? Math.min(w.vis, t.vis) : w.vis)} />
        </section>
      )}

      <section className="panel dashed stack-4">
        <span className="strong small">Lignende forhold: {f.similar?.n || 0} registrert{f.similar?.n ? ` · ${f.similar.cancels} innstilt` : ''}</span>
        <span className="xs muted">{f.similar?.n ? 'Estimatet er justert mot historikken.' : 'Estimatet er regelbasert til historikken har bygd seg opp.'}</span>
      </section>
    </div>
  );
}

// ---------- app ----------
export default function App() {
  const [ap, setAp] = useState(load);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState('today');
  const [openId, setOpenId] = useState(null);

  async function fetchDay(code) {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/day?airport=${code}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      setData(j);
    } catch (e) { setErr(String(e.message || e)); setData(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { save(ap); setOpenId(null); fetchDay(ap); }, [ap]);

  const lists = useMemo(() => {
    const fl = data?.flights || [];
    return { today: sortFlights(fl.filter((f) => f.day === 'today')), tomorrow: sortFlights(fl.filter((f) => f.day === 'tomorrow')) };
  }, [data]);
  const shown = lists[day];
  const open = data?.flights.find((f) => f.id === openId);
  const name = AIRPORTS.find((a) => a.iata === ap)?.name;
  const updated = data ? new Date(data.updated).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="eyebrow accent">Melkeruta</span>
          <label className="picker">
            <span className="sr-only">Velg flyplass</span>
            <select value={ap} onChange={(e) => setAp(e.target.value)}>
              {GROUPS.map(([g, list]) => (
                <optgroup key={g} label={g}>{list.map((a) => <option key={a.iata} value={a.iata}>{a.name}</option>)}</optgroup>
              ))}
            </select>
            <span className="picker-label">{name}</span>
            <Icon d={I.chevDown} size={18} color="var(--muted)" />
          </label>
          <span className="desk-only muted small">Widerøe-landinger i Finnmark{updated ? ` · oppdatert ${updated}` : ''}</span>
        </div>
        <button className="icon-btn" onClick={() => fetchDay(ap)} disabled={loading} aria-label="Oppdater">
          <Icon d={I.refresh} size={20} /><span className="desk-only">{loading ? 'Henter…' : 'Oppdater'}</span>
        </button>
      </header>

      <div className="layout">
        <nav className="sidebar" aria-label="Flyplasser">
          {GROUPS.map(([g, list]) => (
            <div key={g} className="side-group">
              <span className="eyebrow side-head">{g}</span>
              {list.map((a) => (
                <button key={a.iata} className={`side-item${a.iata === ap ? ' active' : ''}`} onClick={() => setAp(a.iata)} aria-current={a.iata === ap ? 'page' : undefined}>
                  {a.name}<span className="mono xs">{a.iata}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <main className="main">
          {err && <p className="panel c-high">Kunne ikke hente data: {err}</p>}
          {!data && !err && <p className="muted pad">Henter landinger og vær…</p>}

          {data && open && <Detail f={open} data={data} onBack={() => setOpenId(null)} />}

          {data && !open && (
            <>
              <div className="main-head">
                <h1 className="desk-only title">{data.airport.name}</h1>
                <div className="tabs" role="tablist">
                  {[['today', 'I dag'], ['tomorrow', 'I morgen']].map(([k, l]) => (
                    <button key={k} role="tab" aria-selected={day === k} className={day === k ? 'on' : ''} onClick={() => setDay(k)}>
                      {l}{lists[k].length ? ` · ${lists[k].length}` : ''}
                    </button>
                  ))}
                </div>
              </div>

              <NowPanel data={data} />

              {shown.length ? (
                <>
                  <ul className="cards mob-only">{shown.map((f) => <FlightCard key={f.id} f={f} onOpen={setOpenId} />)}</ul>
                  <div className="desk-only"><FlightTable flights={shown} onOpen={setOpenId} /></div>
                </>
              ) : <p className="muted pad">Ingen Widerøe-ankomster {day === 'today' ? 'i dag' : 'i morgen'}.</p>}

              {data.taf && (
                <section className="panel soft-bg stack-8">
                  <span className="eyebrow">TAF</span>
                  <p className="mono raw no-border">{data.taf}</p>
                </section>
              )}
            </>
          )}

          <footer className="xs muted foot">
            Estimat fra TAF og regelmodell · {data?.storage ? `historikk: ${data.historyCount} landinger` : 'database ikke koblet til'}. Ikke offisiell informasjon – sjekk widerøe.no.
          </footer>
        </main>
      </div>
    </div>
  );
}
