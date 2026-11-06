import { getHistory } from '../lib/store.js';

// Oversikt over innsamlet historikk per flyplass
export default async function handler(req, res) {
  const h = await getHistory().catch(() => []);
  const per = {};
  for (const r of h) {
    const p = (per[r.ap] ||= { total: 0, cancelled: 0 });
    p.total++;
    if (r.outcome === 'cancelled') p.cancelled++;
  }
  res.setHeader('Cache-Control', 's-maxage=600');
  res.json({ total: h.length, first: h[0]?.sched || null, perAirport: per });
}
