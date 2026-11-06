import { useEffect, useMemo, useRef, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { api } from './api.js';
import { AIRPORTS } from '../lib/airports.js';
import { WeatherIcon, LandingScene, sceneFacts, skyText } from './Weather.jsx';

// ---------- hjelpere ----------
const KEY = 'melkeruten.airport';
const OLD_KEY = 'melkeruta.airport'; // før navnebytte – beholder brukerens valgte flyplass
const load = () => { try { return localStorage.getItem(KEY) || localStorage.getItem(OLD_KEY) || 'HVG'; } catch { return 'HVG'; } };
const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

const LARGE = new Set(['ALF', 'LKL', 'KKN']);
const GROUPS = [
  ['Kortbaner', AIRPORTS.filter((a) => !LARGE.has(a.iata))],
  ['Stamflyplasser', AIRPORTS.filter((a) => LARGE.has(a.iata))],
];

const isDone = (f) => f.status === 'A' || f.status === 'C';
// Sjanse for landing i prosent (1 - risiko for innstilling)
const pctOf = (f) => (f.pCancel == null ? null : Math.round((1 - f.pCancel) * 100));
const chanceLevel = (p) => (p >= 85 ? { cls: 'low', word: 'Stor' } : p >= 50 ? { cls: 'mid', word: 'Medium' } : { cls: 'high', word: 'Liten' });
const riskColor = (p) => `var(--${chanceLevel(p).cls})`;
const r0 = (x) => Math.round(x);
const dir3 = (d) => (d == null ? 'VRB' : String(Math.round(d / 10) * 10 % 360 || 360).padStart(3, '0'));
const ceilTxt = (c) => (c >= 99999 ? 'fritt' : `${c} ft`);
const visTxt = (v) => (v >= 10000 ? '10+ km' : v >= 5000 ? `${r0(v / 1000)} km` : `${v} m`);

function verdict(f) {
  if (f.status === 'C') return { cls: 'high', text: 'Innstilt' };
  if (f.status === 'A') return { cls: 'done', text: `Landet ${f.statusTime || ''}`.trim() };
  const p = pctOf(f);
  if (p == null) return { cls: 'muted', text: 'Mangler værdata' };
  const l = chanceLevel(p);
  return { cls: l.cls, word: l.word, text: `${l.word} sjanse for landing · ${p} %` };
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
  chevRight: ['M9 6l6 6-6 6'],
  back: ['M15 18l-6-6 6-6'],
  check: ['M20 6L9 17l-5-5'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
};

// ---------- komponenter ----------
function NowIcon({ now, big }) {
  if (!now?.sky) return null;
  return (
    <span className={`now-icon${big ? ' big-ic' : ''}`} title={`Nå: ${skyText(now.sky)}`}>
      <WeatherIcon sky={now.sky} size={big ? 40 : 30} />
      {now.temp != null && <span className={`mono ${now.temp < 0 ? 'c-low' : 'c-high'}`}>{r0(now.temp)}°</span>}
    </span>
  );
}

function Ring({ p }) {
  return (
    <div className="ring-wrap">
      <div className="ring" style={{ background: `conic-gradient(${riskColor(p)} ${Math.max(p, 2)}%, var(--track) 0)` }}>
        <span>{p}%</span>
      </div>
      <span className="ring-label">landing</span>
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
  const done = isDone(f);
  return (
    <li>
      <button className={`card ${done ? 'done' : 'open'}`} onClick={() => onOpen(f.id)} aria-label={`${f.flight} ${f.time}, ${v.text}. Vis detaljer`}>
        <div className="card-time">
          <span className="mono time">{f.time}</span>
          {done
            ? <span className={`xs ${f.status === 'C' ? 'c-high strong' : 'muted'}`}>{v.text}</span>
            : f.status === 'E' && f.statusTime && <span className="xs c-mid strong">ny tid {f.statusTime}</span>}
        </div>
        <div className="card-body">
          <span className="strong">{f.flight} <span className="muted normal">{route(f)}</span></span>
          <span className="muted xs">{done ? via(f) : [via(f), f.src].filter(Boolean).join(' · ')}</span>
          {!done && <span className={`xs c-${v.cls}`}>{v.text}</span>}
        </div>
        {done
          ? (f.status === 'C' ? <Icon d={I.x} size={24} color="var(--high)" label="Innstilt" /> : <Icon d={I.check} size={24} color="var(--accent)" label="Landet" />)
          : p != null && <Ring p={p} />}
        <Icon d={I.chevRight} size={18} color="var(--muted)" />
      </button>
    </li>
  );
}

function FlightTable({ flights, onOpen }) {
  return (
    <div className="table-box">
      <table>
        <thead>
          <tr><th>Tid</th><th>Flight</th><th>Fra</th><th>Status</th><th className="right">Sjanse for landing</th></tr>
        </thead>
        <tbody>
          {flights.map((f) => {
            const v = verdict(f), p = pctOf(f), done = isDone(f);
            return (
              <tr key={f.id} className={`row-link${done ? ' done' : ''}`} tabIndex={0} onClick={() => onOpen(f.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(f.id); } }}
                aria-label={`${f.flight} ${f.time}. Vis detaljer`}>
                <td className="mono time-sm">{f.time}</td>
                <td className="strong">{f.flight}</td>
                <td>{f.fromName}{f.viaName ? ` via ${f.viaName}` : ''}</td>
                <td className={`strong c-${f.status === 'E' ? 'mid' : v.cls}`}>
                  {f.status === 'E' && f.statusTime ? `Ny tid ${f.statusTime}` : done ? v.text : v.text}
                </td>
                <td className="right">
                  {!done && p != null ? (
                    <span className="mini">
                      <span className="mini-bar"><span style={{ width: `${Math.max(p, 2)}%`, background: riskColor(p) }} /></span>
                      <span className="mono">{chanceLevel(p).word} · {p}%</span>
                    </span>
                  ) : '–'}
                  <Icon d={I.chevRight} size={16} color="var(--muted)" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Margin: 1 = langt innenfor, 0 = på grensen, <0 = utenfor. Samme retning for alle parametere.
const marginOf = (val, lim, kind) => (kind === 'max' ? (lim - val) / lim : val >= 99999 ? 1 : (val - lim) / Math.max(val, 1));
const LIMIT_AT = 22; // grensemarkørens plass på skalaen (%)
const posOf = (m) => (m >= 0 ? LIMIT_AT + Math.min(m, 1) * (100 - LIMIT_AT) : Math.max(0, LIMIT_AT + Math.max(m, -1) * LIMIT_AT));
const marginState = (m) => (m < 0 ? { cls: 'high', text: 'Utenfor' } : m < 0.15 ? { cls: 'mid', text: 'Nær grensen' } : { cls: 'low', text: 'Innenfor' });

function MarginRow({ label, kind, val, tval, lim, unit, fmt, note }) {
  const m = marginOf(val, lim, kind);
  const mt = tval != null ? marginOf(tval, lim, kind) : null;
  const worst = mt != null ? Math.min(m, mt) : m;
  const st = marginState(worst);
  const diff = kind === 'max' ? lim - val : val - lim;
  const rel = val >= 99999 ? 'ingen skytak' : diff >= 0
    ? `${fmt(diff)} ${kind === 'max' ? 'under' : 'over'} ${kind === 'max' ? 'grensen' : 'minimum'}`
    : `${fmt(-diff)} ${kind === 'max' ? 'over grensen' : 'under minimum'}`;
  return (
    <div className="m-row">
      <div className="m-head">
        <span className="strong small">{label}</span>
        <span className={`m-chip c-${st.cls}`}>{st.text}</span>
      </div>
      <div className="m-track" aria-hidden="true">
        <span className="m-out" style={{ width: `${LIMIT_AT}%` }} />
        <span className="m-limit" style={{ left: `${LIMIT_AT}%` }} />
        {mt != null && Math.abs(posOf(mt) - posOf(m)) > 1 && <span className={`m-dot hollow b-${marginState(mt).cls}`} style={{ left: `${posOf(mt)}%` }} title="TEMPO" />}
        <span className={`m-dot bg-${marginState(m).cls}`} style={{ left: `${posOf(m)}%` }} />
      </div>
      <div className="m-foot xs">
        <span><span className="mono strong">{val >= 99999 ? 'fritt' : `${fmt(val)}`}</span> <span className="muted">{rel}</span></span>
        <span className="muted mono">{kind === 'max' ? 'maks' : 'min'} {fmt(lim)}{note ? ` ${note}` : ''}</span>
      </div>
      {mt != null && mt < m && <span className="xs c-mid">TEMPO: {tval >= 99999 ? 'fritt' : fmt(tval)}</span>}
    </div>
  );
}

function Margins({ f, ap }) {
  const L = ap.limits, w = f.wx, t = f.worstWx;
  const ms = (v) => `${v.toFixed(1).replace('.', ',').replace(',0', '')} m/s`;
  const ft = (v) => `${Math.round(v)} ft`;
  const m = (v) => visTxt(Math.round(v));
  const rows = [
    { label: 'Vindkast', kind: 'max', val: w.gust, tval: t?.gust, lim: L.gust, fmt: ms },
    { label: `Sidevind${w.rwy ? ` · bane ${w.rwy}` : ''}`, kind: 'max', val: w.xw, tval: t?.xw, lim: L.xw, fmt: ms },
    ...(w.tail > 0 || t?.tail > 0 ? [{ label: 'Medvind', kind: 'max', val: w.tail, tval: t?.tail, lim: L.tail, fmt: ms }] : []),
    { label: `Skytak${w.apch === 'sirkling' ? ' · sirkling' : ''}`, kind: 'min', val: w.ceil, tval: t?.ceil, lim: w.minCeil ?? L.ceil, fmt: ft },
    { label: 'Sikt', kind: 'min', val: w.vis, tval: t?.vis, lim: w.minVis ?? L.vis, fmt: m },
  ];
  const worst = Math.min(...rows.map((r) => Math.min(marginOf(r.val, r.lim, r.kind), r.tval != null ? marginOf(r.tval, r.lim, r.kind) : 1)));
  const out = rows.filter((r) => marginOf(r.val, r.lim, r.kind) < 0).map((r) => r.label.split(' ·')[0].toLowerCase());
  const st = marginState(worst);
  const summary = out.length ? `Utenfor grensene: ${out.join(', ')}` : st.cls === 'mid' ? 'Innenfor, men nær grensen' : 'Alle forhold innenfor grensene';
  return (
    <section className="panel stack-14">
      <div className="panel-head">
        <span className="eyebrow">Mot grensene</span>
        <span className={`small strong c-${st.cls}`}>{summary}</span>
      </div>
      <div className="m-legend xs muted" aria-hidden="true">
        <span style={{ left: `${LIMIT_AT}%` }}>grense</span><span className="m-good">god margin →</span>
      </div>
      {rows.map((r) => <MarginRow key={r.label} {...r} />)}
      {t && <span className="xs muted">Hul prikk = periodevis (TEMPO).</span>}
    </section>
  );
}

function WeatherPanel({ f, ap }) {
  const [tempo, setTempo] = useState(false);
  const t = f.worstWx;
  const w = tempo && t ? t : f.wx;
  const sky = tempo && t ? f.worstSky || f.sky : f.sky;
  const L = ap.limits;
  const { head, side } = sceneFacts(ap, w);
  const ceilLow = w.ceil < 99999 && w.ceil < (w.minCeil ?? L.ceil);
  const visLow = w.vis < (w.minVis ?? L.vis);
  const facts = [
    ['Vind', w.dir == null ? `VRB ${r0(w.spd)} m/s` : `${dir3(w.dir)}° ${r0(w.spd)} m/s`, w.gust > w.spd + 2 ? `kast ${r0(w.gust)} m/s` : 'jevn', w.gust / L.gust >= 0.9],
    [w.rwy ? `Bane ${w.rwy}` : 'Bane', head == null ? '–' : head >= 0 ? `motvind ${r0(head)}` : `medvind ${r0(-head)}`,
      side ? `sidevind ${w.xw.toFixed(0)} fra ${side}` : `sidevind ${w.xw.toFixed(0)}`, w.xw / L.xw >= 0.9 || w.tail / L.tail >= 0.9],
    ['Skytak', w.ceil >= 99999 ? 'fritt' : `${w.ceil} ft`, `min ${w.minCeil ?? L.ceil} ft`, ceilLow],
    ['Sikt', visTxt(w.vis), [skyText(sky), w.temp != null ? `${r0(w.temp)}°` : ''].filter(Boolean).join(' · ') || `min ${w.minVis ?? L.vis} m`, visLow],
  ];
  return (
    <section className="panel scene-panel">
      <div className="panel-head">
        <span className="eyebrow">Vær ved landing · {f.src}</span>
        {t && (
          <div className="seg" role="tablist" aria-label="Prognose">
            <button role="tab" aria-selected={!tempo} className={!tempo ? 'on' : ''} onClick={() => setTempo(false)}>Normalt</button>
            <button role="tab" aria-selected={tempo} className={tempo ? 'on' : ''} onClick={() => setTempo(true)}>TEMPO</button>
          </div>
        )}
      </div>
      <LandingScene ap={ap} w={w} sky={sky} />
      <div className="facts">
        {facts.map(([label, val, sub, warn]) => (
          <div key={label} className="fact">
            <span className="muted xs">{label}</span>
            <span className={`mono strong${warn ? ' c-high' : ''}`}>{val}</span>
            <span className="muted xs">{sub}</span>
          </div>
        ))}
      </div>
      {t && !tempo && <span className="xs c-mid">Periodevis (TEMPO): {r0(t.spd)} m/s, kast {r0(t.gust)}{t.ceil < 99999 ? `, tak ${t.ceil} ft` : ''}{t.vis < 10000 ? `, sikt ${visTxt(t.vis)}` : ''}</span>}
    </section>
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

      {isDone(f) && (
        <section className={`panel status-panel ${f.status === 'C' ? 'b-high' : 'b-low'}`}>
          <Icon d={f.status === 'C' ? I.x : I.check} size={28} color={f.status === 'C' ? 'var(--high)' : 'var(--accent)'} />
          <div className="stack-2">
            <span className="strong">{f.status === 'C' ? 'Innstilt' : `Landet${f.statusTime ? ` kl. ${f.statusTime}` : ''}`}</span>
            {p != null && <span className="xs muted">Estimatet var {chanceLevel(p).word.toLowerCase()} sjanse for landing ({p} %)</span>}
          </div>
        </section>
      )}

      {!isDone(f) && p != null && (
        <section className="panel">
          <div className="risk-head">
            <div className="stack-2">
              <span className="eyebrow">Sjanse for landing</span>
              <span className={`strong c-${v.cls}`}>{v.word} sjanse</span>
            </div>
            <span className="mono huge">{p}<span className="unit-l">%</span></span>
          </div>
          <div className="scale">
            <span className="fill" style={{ width: `${Math.max(p, 1)}%`, background: riskColor(p) }} />
            <span className="tick" style={{ left: '50%' }} /><span className="tick" style={{ left: '85%' }} />
          </div>
          <div className="scale-labels xs muted"><span>Liten &lt;50 %</span><span>Medium</span><span className="right">Stor ≥85 %</span></div>
        </section>
      )}

      {w && <WeatherPanel key={f.id} f={f} ap={ap} />}

      {w && <Margins f={f} ap={ap} />}

      <section className="panel dashed stack-4">
        <span className="strong small">Lignende forhold: {f.similar?.n || 0} registrert{f.similar?.n ? ` · ${f.similar.cancels} innstilt` : ''}</span>
        <span className="xs muted">{f.similar?.n ? 'Estimatet er justert mot historikken.' : 'Estimatet er regelbasert til historikken har bygd seg opp.'}</span>
      </section>
    </div>
  );
}

function AirportSheet({ current, onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('.sheet-item.active, .sheet-item')?.focus();
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Velg flyplass" ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <span className="strong">Velg flyplass</span>
          <button className="icon-btn sm" onClick={onClose} aria-label="Lukk"><Icon d={I.x} size={18} /></button>
        </div>
        {GROUPS.map(([g, list]) => (
          <div key={g} className="sheet-group">
            <span className="eyebrow side-head">{g}</span>
            {list.map((a) => (
              <button key={a.iata} className={`sheet-item${a.iata === current ? ' active' : ''}`} onClick={() => onPick(a.iata)} aria-current={a.iata === current ? 'true' : undefined}>
                <span className="mono xs sheet-code">{a.iata}</span>
                <span className="sheet-name">{a.name}</span>
                {a.iata === current && <Icon d={I.check} size={18} color="var(--accent)" />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- statistikk ----------
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const monthName = (m) => { const [y, mm] = m.split('-'); return `${MONTHS[+mm - 1]} ${y}`; };

function Stats({ code, name }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let live = true;
    setSt(null); setErr(null);
    fetch(api(`/api/stats?airport=${code}`)).then((r) => r.json()).then((j) => live && (j.error ? setErr(j.error) : setSt(j))).catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [code]);
  if (err) return <p className="panel c-high">Kunne ikke hente statistikk: {err}</p>;
  if (!st) return <p className="muted pad">Henter statistikk…</p>;
  if (!st.months.length) return (
    <section className="panel dashed stack-4">
      <span className="strong small">Ingen registrerte landinger for {name} ennå</span>
      <span className="xs muted">Statistikken bygger seg opp automatisk etter hvert som landinger og innstillinger registreres.</span>
    </section>
  );
  const reg = (x) => (x.total ? String(Math.round((x.ok / x.total) * 1000) / 10).replace('.', ',') : 0);
  const max = Math.max(...st.months.map((x) => x.total));
  return (
    <>
      <section className="panel">
        <span className="eyebrow">Totalt registrert</span>
        <div className="stat-grid">
          <div className="stack-2"><span className="mono big">{st.sum.total}</span><span className="xs muted">ankomster</span></div>
          <div className="stack-2"><span className="mono big c-low">{st.sum.ok}</span><span className="xs muted">landet</span></div>
          <div className="stack-2"><span className="mono big c-high">{st.sum.cancelled}</span><span className="xs muted">innstilt</span></div>
          <div className="stack-2"><span className="mono big">{reg(st.sum)} %</span><span className="xs muted">regularitet</span></div>
        </div>
        {st.first && <span className="xs muted">Data fra {new Date(st.first).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
      </section>
      <section className="panel stack-14">
        <span className="eyebrow">Per måned</span>
        {st.months.map((x) => (
          <div key={x.month} className="month">
            <div className="bar-head">
              <span className="strong" style={{ textTransform: 'capitalize' }}>{monthName(x.month)}</span>
              <span className="mono small">{reg(x)} % landet</span>
            </div>
            <div className="month-bar" style={{ width: `${Math.max(8, (x.total / max) * 100)}%` }} aria-hidden="true">
              <span style={{ flex: x.ok, background: 'var(--low)' }} />
              <span style={{ flex: x.cancelled, background: 'var(--high)' }} />
            </div>
            <span className="xs muted">{x.total} ankomster · <span className="c-low">{x.ok} landet</span> · <span className={x.cancelled ? 'c-high' : ''}>{x.cancelled} innstilt</span> · {x.days} dager med data</span>
          </div>
        ))}
      </section>
    </>
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
  const [picking, setPicking] = useState(false);

  async function fetchDay(code) {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(api(`/api/day?airport=${code}`));
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.status);
      setData(j);
    } catch (e) { setErr(String(e.message || e)); setData(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { save(ap); setOpenId(null); fetchDay(ap); }, [ap]);

  // Android tilbakeknapp: lukk flyplassvelger/detaljvisning før appen avsluttes.
  useEffect(() => {
    const h = NativeApp.addListener('backButton', () => {
      if (picking) setPicking(false);
      else if (openId) setOpenId(null);
      else if (day !== 'today') setDay('today');
      else NativeApp.exitApp();
    });
    return () => { h.then((l) => l.remove()); };
  }, [picking, openId, day]);

  // Hent ferske data når appen kommer tilbake i forgrunnen.
  useEffect(() => {
    const h = NativeApp.addListener('resume', () => fetchDay(ap));
    return () => { h.then((l) => l.remove()); };
  }, [ap]);
  const refresh = () => { setOpenId(null); fetchDay(ap); };

  const lists = useMemo(() => {
    const fl = data?.flights || [];
    return { today: sortFlights(fl.filter((f) => f.day === 'today')), tomorrow: sortFlights(fl.filter((f) => f.day === 'tomorrow')) };
  }, [data]);
  const shown = lists[day] || [];
  const open = data?.flights.find((f) => f.id === openId);
  const name = AIRPORTS.find((a) => a.iata === ap)?.name;
  const updated = data ? new Date(data.updated).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <button className="eyebrow accent brand-btn" onClick={refresh} title="Oppdater">Melkeruten</button>
          <div className="picker">
            <span className="picker-label">{name}</span>
            {data?.airport.iata === ap && <NowIcon now={data.now} />}
          </div>
          <button className="switch-btn mob-only" onClick={() => setPicking(true)} aria-haspopup="dialog">
            <span className="mono xs">{ap}</span>Bytt flyplass<Icon d={I.chevDown} size={16} />
          </button>
          <span className="desk-only muted small">Widerøe-landinger i Finnmark{updated ? ` · oppdatert ${updated}` : ''}</span>
        </div>
        <button className="icon-btn" onClick={() => fetchDay(ap)} disabled={loading} aria-label="Oppdater">
          <Icon d={I.refresh} size={20} /><span className="desk-only">{loading ? 'Henter…' : 'Oppdater'}</span>
        </button>
      </header>

      {picking && <AirportSheet current={ap} onPick={(c) => { setAp(c); setPicking(false); setDay((d) => (d === 'stats' ? d : 'today')); }} onClose={() => setPicking(false)} />}

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
                <h1 className="desk-only title">{data.airport.name}<NowIcon now={data.now} big /></h1>
                <div className="tabs" role="tablist">
                  {[['today', 'I dag'], ['tomorrow', 'I morgen'], ['stats', 'Statistikk']].map(([k, l]) => (
                    <button key={k} role="tab" aria-selected={day === k} className={day === k ? 'on' : ''} onClick={() => setDay(k)}>
                      {l}{lists[k]?.length ? ` · ${lists[k].length}` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {day === 'stats' ? <Stats code={ap} name={data.airport.name} /> : <>
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
              </>}
            </>
          )}

          <footer className="xs muted foot">
            Estimat fra TAF og regelmodell · {data?.storage ? `historikk: ${data.historyCount} registrerte ankomster${data.historyHere != null ? ` (${data.historyHere} her)` : ''}` : 'database ikke koblet til'}. Ikke offisiell informasjon – sjekk widerøe.no. Melkeruten er ikke tilknyttet Widerøe eller Avinor.
          </footer>
        </main>
      </div>
    </div>
  );
}
