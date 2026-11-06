import { useEffect, useState } from 'react';
import { AIRPORTS } from '../lib/airports.js';

const KEY = 'landingssjanse.airport';
const load = () => { try { return localStorage.getItem(KEY) || 'HVG'; } catch { return 'HVG'; } };
const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

function verdict(f) {
  if (f.status === 'C') return { cls: 'bad', text: 'Innstilt' };
  if (f.status === 'A') return { cls: 'done', text: `Landet ${f.statusTime || ''}`.trim() };
  if (f.pCancel == null) return { cls: 'na', text: 'Ingen værdata' };
  if (f.pCancel < 0.15) return { cls: 'good', text: 'Flys som normalt' };
  if (f.pCancel < 0.5) return { cls: 'warn', text: 'Usikkert' };
  return { cls: 'bad', text: 'Sannsynlig innstilt' };
}

const dirTxt = (d) => (d == null ? 'VRB' : String(Math.round(d / 10) * 10).padStart(3, '0'));
const ceilTxt = (c) => (c >= 99999 ? 'fritt' : `${c} ft`);
const visTxt = (v) => (v >= 10000 ? '10 km+' : v >= 5000 ? `${(v / 1000).toFixed(0)} km` : `${v} m`);

function Flight({ f }) {
  const v = verdict(f);
  const pct = f.status === 'C' ? 100 : f.pCancel != null ? Math.round(f.pCancel * 100) : null;
  const w = f.wx;
  return (
    <li className={`flight ${v.cls}`}>
      <div className="row1">
        <span className="time">{f.time}</span>
        <span className="fid">{f.flight}</span>
        <span className="from">fra {f.fromName}{f.via ? ` via ${f.viaName}` : ''}</span>
      </div>
      <div className="row2">
        <span className={`badge ${v.cls}`}>{v.text}</span>
        {pct != null && f.status !== 'A' && (
          <span className="pct" title="Sannsynlighet for innstilling">{pct}% risiko</span>
        )}
      </div>
      {pct != null && f.status !== 'A' && f.status !== 'C' && (
        <div className="bar"><div style={{ width: `${Math.max(2, pct)}%` }} /></div>
      )}
      {w && f.status !== 'A' && (
        <div className="wx">
          <span>Vind {dirTxt(w.dir)}° {w.spd} m/s{w.gust > w.spd + 2 ? `, kast ${w.gust}` : ''}</span>
          <span>Sidevind {w.xw} m/s{w.rwy ? ` (bane ${w.rwy})` : ''}</span>
          <span>Tak {ceilTxt(w.ceil)}</span>
          <span>Sikt {visTxt(w.vis)}</span>
          {f.worstWx && <span className="tempo">TEMPO: {f.worstWx.gust} m/s, tak {ceilTxt(f.worstWx.ceil)}, sikt {visTxt(f.worstWx.vis)}</span>}
        </div>
      )}
      {f.status !== 'A' && f.status !== 'C' && (
        <div className="meta">
          {f.drivers.length > 0 && <span>Begrenser: {f.drivers.join(', ')}</span>}
          <span>{f.src}{f.similar?.n ? ` · ${f.similar.n} lignende (${f.similar.cancels} innstilt)` : ' · ingen historikk ennå'}</span>
        </div>
      )}
    </li>
  );
}

export default function App() {
  const [ap, setAp] = useState(load);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => { save(ap); fetchDay(ap); }, [ap]);

  const groups = data ? [['today', 'I dag'], ['tomorrow', 'I morgen']].map(([k, l]) => [l, data.flights.filter((f) => f.day === k)]) : [];

  return (
    <main>
      <header>
        <h1>Landingssjanse</h1>
        <p className="sub">Widerøe-ankomster i Finnmark</p>
        <div className="controls">
          <select value={ap} onChange={(e) => setAp(e.target.value)} aria-label="Velg flyplass">
            {AIRPORTS.map((a) => <option key={a.iata} value={a.iata}>{a.name} ({a.iata})</option>)}
          </select>
          <button onClick={() => fetchDay(ap)} disabled={loading}>{loading ? 'Henter…' : 'Oppdater'}</button>
        </div>
      </header>

      {err && <p className="error">Kunne ikke hente data: {err}</p>}

      {data && (
        <>
          <section className="obs">
            {data.metar && <pre>{data.metar}</pre>}
            {data.taf && <pre>{data.taf}</pre>}
            {!data.metar && !data.taf && <p className="muted">Ingen METAR/TAF – bruker værprognose.</p>}
            <p className="muted small">
              Grenser brukt: sidevind {data.airport.limits.xw} m/s · kast {data.airport.limits.gust} m/s · tak {data.airport.limits.ceil} ft · sikt {data.airport.limits.vis} m
            </p>
          </section>

          {groups.map(([label, list]) => (
            <section key={label}>
              <h2>{label}</h2>
              {list.length ? <ul>{list.map((f) => <Flight key={f.id} f={f} />)}</ul> : <p className="muted">Ingen Widerøe-ankomster.</p>}
            </section>
          ))}

          <footer className="muted small">
            {data.storage ? `Historikk: ${data.historyCount} registrerte landinger.` : 'Database ikke koblet til – kun regelbasert estimat.'}{' '}
            Estimat, ikke offisiell informasjon. Sjekk alltid widerøe.no.
          </footer>
        </>
      )}
    </main>
  );
}
