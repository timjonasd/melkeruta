import { byIata, airportName } from '../lib/airports.js';
import { fetchArrivals } from '../lib/avinor.js';
import { fetchWeather, wxPhrase, iconFrom, lfAt } from '../lib/weather.js';
import { ruleRisk, calibrate, condRisk } from '../lib/model.js';
import { getHistory, saveSnapshot, redis } from '../lib/store.js';
import { osloDate, osloHM, hoursSinceOsloMidnight, addDays } from '../lib/time.js';

export default async function handler(req, res) {
  const iata = String(req.query.airport || '').toUpperCase();
  const ap = byIata[iata];
  if (!ap) return res.status(400).json({ error: 'Ukjent flyplass' });

  const now = new Date();
  const today = osloDate(now);
  const tomorrow = addDays(today, 1);
  const since = hoursSinceOsloMidnight(now);
  const timeFrom = Math.min(36, Math.ceil(since) + 1);
  const timeTo = Math.ceil(48 - since) + 1;

  try {
    const [flights, wx, history] = await Promise.all([
      fetchArrivals(iata, timeFrom, timeTo),
      fetchWeather(ap),
      getHistory().catch(() => []),
    ]);

    const out = [];
    const snaps = [];
    for (const f of flights) {
      const day = osloDate(f.sched);
      if (day !== today && day !== tomorrow) continue;
      const rule = ruleRisk(ap, wx, f.sched);
      const cal = rule ? calibrate(rule, history, iata) : null;
      if (rule && f.sched > now && !f.status) snaps.push(saveSnapshot(f, iata, rule));
      out.push({
        id: f.id,
        flight: f.flight,
        from: f.from,
        fromName: airportName(f.from),
        via: f.via,
        viaName: f.via ? f.via.split(',').map((c) => airportName(c.trim())).join(', ') : null,
        day: day === today ? 'today' : 'tomorrow',
        time: osloHM(f.sched),
        sched: f.sched,
        status: f.status,
        statusTime: f.statusTime ? osloHM(f.statusTime) : null,
        pCancel: cal ? +cal.p.toFixed(3) : null,
        pRule: rule ? +rule.p.toFixed(3) : null,
        similar: cal ? { n: cal.n, cancels: cal.cancels } : null,
        src: rule?.src || null,
        wx: rule?.wx || null,
        worstWx: rule?.worstWx || null,
        sky: rule ? iconFrom(rule.wx, rule.sym) : null,
        worstSky: rule?.worstWx ? iconFrom(rule.worstWx, rule.sym) : null,
        drivers: rule?.drivers || [],
      });
    }
    await Promise.allSettled(snaps);
    out.sort((a, b) => new Date(a.sched) - new Date(b.sched));

    const last = wx.metars.at(-1);
    const current = last
      ? { time: osloHM(last.time), ...condRisk(ap, last.cond).wx, phrase: wxPhrase(last.raw) }
      : null;
    // Været akkurat nå (ikon ved flyplassnavnet): METAR hvis den finnes, ellers prognosen
    const lfNow = lfAt(wx.lf, now);
    const nowWx = {
      sky: last ? iconFrom(last.cond, lfNow?.sym) : lfNow ? iconFrom(lfNow, lfNow.sym) : null,
      temp: last?.cond.temp ?? (lfNow ? Math.round(lfNow.temp) : null),
    };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.json({
      airport: { iata, name: ap.name, icao: ap.icao, rwy: ap.rwy, hdg: ap.hdg, limits: { xw: ap.xw, gust: ap.gust, tail: ap.tail, ceil: ap.ceil, vis: ap.vis } },
      current,
      now: nowWx,
      updated: now,
      metar: wx.metars.at(-1)?.raw || null,
      taf: wx.taf?.raw || null,
      historyCount: history.length,
      storage: !!redis,
      flights: out,
    });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
