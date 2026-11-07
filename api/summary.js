import { AIRPORTS } from '../lib/airports.js';
import { fetchArrivals } from '../lib/avinor.js';
import { fetchWeather } from '../lib/weather.js';
import { ruleRisk, calibrate } from '../lib/model.js';
import { getHistory } from '../lib/store.js';

// Snitt landingssannsynlighet (%) for gjenstående landinger de neste 24 timene, alle flyplasser.
// Brukes til sitatet ved logoen. Lett endepunkt: lagrer ingenting, caches i 15 min.
export default async function handler(req, res) {
  const now = new Date();
  const history = await getHistory().catch(() => []);

  const per = await Promise.allSettled(AIRPORTS.map(async (ap) => {
    const [flights, wx] = await Promise.all([fetchArrivals(ap.iata, 1, 25), fetchWeather(ap)]);
    const ps = [];
    for (const f of flights) {
      if (f.status || new Date(f.sched) <= now || new Date(f.sched) - now > 24 * 3600e3) continue;
      const rule = ruleRisk(ap, wx, f.sched);
      const cal = rule ? calibrate(rule, history, ap.iata) : null;
      if (cal) ps.push(1 - cal.p);
    }
    return ps;
  }));

  const all = per.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const avg = all.length ? Math.round((all.reduce((a, b) => a + b, 0) / all.length) * 100) : null;

  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
  res.json({ avg, n: all.length, updated: now });
}
