import { byIata } from '../lib/airports.js';
import { getHistory } from '../lib/store.js';
import { osloDate } from '../lib/time.js';

// Månedsstatistikk for én flyplass: landet / innstilt per måned
export default async function handler(req, res) {
  const iata = String(req.query.airport || '').toUpperCase();
  if (!byIata[iata]) return res.status(400).json({ error: 'Ukjent flyplass' });
  const h = (await getHistory().catch(() => [])).filter((r) => r.ap === iata);
  const months = {};
  for (const r of h) {
    const m = osloDate(new Date(r.sched)).slice(0, 7);
    const x = (months[m] ||= { month: m, total: 0, ok: 0, cancelled: 0, days: new Set() });
    x.total++;
    x[r.outcome === 'cancelled' ? 'cancelled' : 'ok']++;
    x.days.add(osloDate(new Date(r.sched)));
  }
  const list = Object.values(months)
    .map(({ days, ...x }) => ({ ...x, days: days.size }))
    .sort((a, b) => b.month.localeCompare(a.month));
  const sum = list.reduce((a, x) => ({ total: a.total + x.total, ok: a.ok + x.ok, cancelled: a.cancelled + x.cancelled }), { total: 0, ok: 0, cancelled: 0 });
  res.setHeader('Cache-Control', 's-maxage=300');
  res.json({ airport: iata, first: h[0]?.sched || null, sum, months: list });
}
