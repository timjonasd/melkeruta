const TZ = 'Europe/Oslo';
const fmtDate = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHM = new Intl.DateTimeFormat('nb-NO', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });

export const osloDate = (d) => fmtDate.format(d); // YYYY-MM-DD
export const osloHM = (d) => fmtHM.format(d);

// Timer siden midnatt i Oslo
export function hoursSinceOsloMidnight(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value]));
  return +parts.hour + +parts.minute / 60;
}
export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
