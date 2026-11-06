// Registrerer faktisk utfall (landet/innstilt) for en flyvning. Brukes av både cron og /api/day,
// slik at historikken vokser hver gang noen åpner appen, ikke bare når cron kjører.
import { condRisk } from './model.js';
import { addHistory, getSnapshot } from './store.js';

export async function recordOutcome(ap, f, wx) {
  const outcome = f.status === 'A' ? 'ok' : f.status === 'C' ? 'cancelled' : null;
  if (!outcome) return false;
  // Foretrekk observert vær (METAR nærmest planlagt tid), ellers prognose-snapshot.
  // Utfallet lagres også uten værdata, så månedsstatistikken blir komplett.
  let feat = null, featSrc = null, ruleP = null;
  const near = (wx?.metars || [])
    .map((m) => ({ m, d: Math.abs(m.time - f.sched) }))
    .filter((x) => x.d <= 40 * 60e3)
    .sort((a, b) => a.d - b.d)[0];
  if (near) { const r = condRisk(ap, near.m.cond); feat = r.feat; featSrc = 'METAR'; ruleP = r.p; }
  else {
    const snap = await getSnapshot(f.id).catch(() => null);
    if (snap) { feat = snap.feat; featSrc = 'snapshot'; ruleP = snap.ruleP; }
  }
  return addHistory({ id: f.id, ap: ap.iata, flight: f.flight, from: f.from, sched: f.sched.toISOString(), outcome, feat, featSrc, ruleP });
}
