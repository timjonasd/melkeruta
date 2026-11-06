// Kjøres av Vercel Cron. Registrerer utfall (landet/innstilt) for siste ~30 timer
// og lagrer prognose-snapshots for kommende landinger.
import { AIRPORTS } from '../lib/airports.js';
import { fetchArrivals } from '../lib/avinor.js';
import { fetchWeather } from '../lib/weather.js';
import { ruleRisk } from '../lib/model.js';
import { saveSnapshot, redis } from '../lib/store.js';
import { recordOutcome } from '../lib/record.js';

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
        if (await recordOutcome(ap, f, wx)) s.added++;
      }
    } catch (e) {
      s.err = String(e.message || e);
    }
    summary[ap.iata] = s;
  }
  res.json({ ok: true, at: now, summary });
}
