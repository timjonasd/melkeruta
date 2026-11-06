// Kjøres av Vercel Cron. Registrerer utfall (landet/innstilt) for siste ~30 timer
// og lagrer prognose-snapshots for kommende landinger.
import { AIRPORTS } from '../lib/airports.js';
import { fetchArrivals } from '../lib/avinor.js';
import { fetchWeather } from '../lib/weather.js';
import { ruleRisk, condRisk } from '../lib/model.js';
import { addHistory, getSnapshot, saveSnapshot, redis } from '../lib/store.js';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) return res.status(401).end();
  if (!redis) return res.status(500).json({ error: 'Ingen database konfigurert' });

  const now = new Date();
  const summary = {};
  for (const ap of AIRPORTS) {
    const s = { added: 0, snaps: 0, err: null };
    try {
      const [flights, wx] = await Promise.all([fetchArrivals(ap.iata, 30, 30), fetchWeather(ap)]);
      for (const f of flights) {
        if (f.sched > now) {
          const r = ruleRisk(ap, wx, f.sched);
          if (r && !f.status) { await saveSnapshot(f, ap.iata, r); s.snaps++; }
          continue;
        }
        if (now - f.sched < 3600e3) continue; // vent til status er avklart
        const outcome = f.status === 'A' ? 'ok' : f.status === 'C' ? 'cancelled' : null;
        if (!outcome) continue;
        // Foretrekk observert vær (METAR nærmest planlagt tid), ellers prognose-snapshot
        let feat = null, featSrc = null, ruleP = null;
        const near = wx.metars
          .map((m) => ({ m, d: Math.abs(m.time - f.sched) }))
          .filter((x) => x.d <= 40 * 60e3)
          .sort((a, b) => a.d - b.d)[0];
        if (near) { const r = condRisk(ap, near.m.cond); feat = r.feat; featSrc = 'METAR'; ruleP = r.p; }
        else {
          const snap = await getSnapshot(f.id);
          if (snap) { feat = snap.feat; featSrc = 'snapshot'; ruleP = snap.ruleP; }
        }
        if (!feat) continue;
        if (await addHistory({ id: f.id, ap: ap.iata, flight: f.flight, sched: f.sched.toISOString(), outcome, feat, featSrc, ruleP })) s.added++;
      }
    } catch (e) {
      s.err = String(e.message || e);
    }
    summary[ap.iata] = s;
  }
  res.json({ ok: true, at: now, summary });
}
