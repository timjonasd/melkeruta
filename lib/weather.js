// Henting og parsing av METAR/TAF (api.met.no tafmetar) og Locationforecast.
const UA = process.env.MET_USER_AGENT || 'finnmark-landingssjanse/1.0 (privat prosjekt)';
const KT = 0.514444;

async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

// ---------- Felles gruppeparser ----------
// Returnerer delvis tilstand: { dir, spd, gust, vis, ceil } (m/s, m, fot). Kun felt som finnes i gruppene.
export function parseGroups(tokens) {
  const c = {};
  for (const t of tokens) {
    let m;
    if ((m = t.match(/^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/))) {
      const f = m[4] === 'KT' ? KT : 1;
      c.dir = m[1] === 'VRB' ? null : +m[1];
      c.spd = +m[2] * f;
      c.gust = m[3] ? +m[3] * f : null;
    } else if (t === 'CAVOK') {
      c.vis = 10000; c.ceil = 99999;
    } else if (/^\d{4}$/.test(t) && !('vis' in c)) {
      c.vis = +t === 9999 ? 10000 : +t;
    } else if ((m = t.match(/^(BKN|OVC|VV)(\d{3})/))) {
      const h = +m[2] * 100;
      if (!('ceil' in c) || c.ceil === 99999 || h < c.ceil) c.ceil = h;
    } else if (/^(FEW|SCT)\d{3}/.test(t) || t === 'NSC' || t === 'SKC' || t === 'NCD') {
      if (!('ceil' in c)) c.ceil = 99999;
    }
  }
  return c;
}

// ---------- METAR ----------
// metar.txt inneholder flere meldinger; returner liste med tid + tilstand
// Del opp en tekstfil i enkeltmeldinger forankret på ICAO-koden (tåler linjeskift og ulike prefiks)
export function splitReports(txt, icao) {
  const flat = txt.replace(/\s+/g, ' ');
  const re = new RegExp(`(?:(?:TAF|METAR|SPECI)(?: AMD| COR)? )?${icao} \\d{6}Z[^=]*`, 'g');
  return (flat.match(re) || []).map((s) => s.trim());
}

export function parseMetars(txt, icao, now = new Date()) {
  const out = [];
  for (const rep of splitReports(txt, icao)) {
    const m = rep.match(/[A-Z]{4} (\d{2})(\d{2})(\d{2})Z (.*)$/);
    if (!m) continue;
    const t = dayHourToDate(+m[1], +m[2], +m[3], now);
    if (!t || t > new Date(now.getTime() + 3600e3)) continue;
    const body = m[4].split(/\s+(?:TEMPO|BECMG|NOSIG|RMK)\b/)[0];
    out.push({ time: t, raw: rep, cond: parseGroups(body.split(/\s+/)) });
  }
  return out.sort((a, b) => a.time - b.time);
}

// ---------- TAF ----------
function dayHourToDate(day, hour, min, ref) {
  // Finn dato nærmest ref med gitt dag i måneden
  let best = null;
  for (const dm of [-1, 0, 1]) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + dm, day, hour, min));
    if (d.getUTCDate() !== day && hour !== 24) continue;
    if (!best || Math.abs(d - ref) < Math.abs(best - ref)) best = d;
  }
  return best;
}
const ddhh = (s, ref) => dayHourToDate(+s.slice(0, 2), +s.slice(2, 4), 0, ref);

export function parseTaf(raw, now = new Date()) {
  const text = raw.replace(/=\s*$/, '').trim();
  const issue = text.match(/\b(\d{2})(\d{2})(\d{2})Z\b/);
  const ref = issue ? dayHourToDate(+issue[1], +issue[2], +issue[3], now) : now;
  const vm = text.match(/\b(\d{4})\/(\d{4})\b/);
  if (!vm) return null;
  const valid = { from: ddhh(vm[1], ref), to: ddhh(vm[2], ref) };
  const after = text.slice(text.indexOf(vm[0]) + vm[0].length).trim();
  // Del opp i endringsgrupper
  const parts = after.split(/\s+(?=(?:FM\d{6}|BECMG|TEMPO|PROB\d{2}))/);
  const base = parseGroups(parts[0].split(/\s+/));
  const changes = [];
  for (const p of parts.slice(1)) {
    const tok = p.split(/\s+/);
    let m;
    if ((m = tok[0].match(/^FM(\d{2})(\d{2})(\d{2})$/))) {
      changes.push({ type: 'FM', from: dayHourToDate(+m[1], +m[2], +m[3], ref), cond: parseGroups(tok.slice(1)) });
    } else if (tok[0] === 'BECMG') {
      const [a, b] = tok[1].split('/');
      changes.push({ type: 'BECMG', from: ddhh(a, ref), to: ddhh(b, ref), cond: parseGroups(tok.slice(2)) });
    } else {
      let w = 0.5, i = 0;
      if (/^PROB\d{2}$/.test(tok[0])) {
        const pr = +tok[0].slice(4) / 100;
        if (tok[1] === 'TEMPO') { w = pr * 0.5; i = 2; } else { w = pr; i = 1; }
      } else i = 1; // TEMPO
      if (!tok[i] || !tok[i].includes('/')) continue;
      const [a, b] = tok[i].split('/');
      changes.push({ type: 'TEMP', w, from: ddhh(a, ref), to: ddhh(b, ref), cond: parseGroups(tok.slice(i + 1)) });
    }
  }
  return { raw: text, issued: ref, valid, base, changes };
}

// Tilstand ved tid t: { main, temps:[{w,cond}] } eller null hvis utenfor gyldighet
export function tafAt(taf, t) {
  if (!taf || t < taf.valid.from || t >= taf.valid.to) return null;
  let main = { ...taf.base };
  for (const c of taf.changes) {
    if (c.type === 'FM' && c.from <= t) main = { ...main, ...c.cond };
    if (c.type === 'BECMG' && c.from <= t) main = { ...main, ...c.cond };
  }
  const temps = taf.changes
    .filter((c) => c.type === 'TEMP' && c.from <= t && t < c.to)
    .map((c) => ({ w: c.w, cond: { ...main, ...c.cond } }));
  return { main, temps };
}

// ---------- Locationforecast ----------
export function lfAt(lf, t) {
  if (!lf) return null;
  const ts = lf.properties.timeseries;
  let best = null;
  for (const s of ts) {
    const d = Math.abs(new Date(s.time) - t);
    if (!best || d < best.d) best = { d, s };
  }
  if (!best || best.d > 3 * 3600e3) return null;
  const i = best.s.data.instant.details;
  const n1 = best.s.data.next_1_hours || best.s.data.next_6_hours;
  const sym = n1?.summary?.symbol_code || '';
  const precip = n1?.details?.precipitation_amount ?? 0;
  const fog = i.fog_area_fraction ?? 0;
  const low = i.cloud_area_fraction_low ?? 0;
  // Grove proxyer for sikt og skyhøyde (Locationforecast gir ikke disse direkte)
  let vis = 10000;
  if (fog > 50) vis = 800; else if (fog > 20) vis = 3000;
  if (/heavysnow|heavysleet/.test(sym) || (precip >= 2 && i.air_temperature < 1)) vis = Math.min(vis, 1200);
  else if (/snow/.test(sym)) vis = Math.min(vis, 4000);
  let ceil = 99999;
  if (low > 87) ceil = fog > 30 ? 200 : 900; else if (low > 60) ceil = 1500;
  return {
    dir: i.wind_from_direction, spd: i.wind_speed, gust: i.wind_speed_of_gust ?? i.wind_speed * 1.4,
    vis, ceil, temp: i.air_temperature, sym,
  };
}

// ---------- Henting ----------
export async function fetchWeather(ap) {
  const base = 'https://api.met.no/weatherapi';
  const [taf, metar, lf] = await Promise.allSettled([
    getText(`${base}/tafmetar/1.0/taf.txt?icao=${ap.icao}`),
    getText(`${base}/tafmetar/1.0/metar.txt?icao=${ap.icao}`),
    getText(`${base}/locationforecast/2.0/complete?lat=${ap.lat}&lon=${ap.lon}`),
  ]);
  const now = new Date();
  let tafObj = null;
  if (taf.status === 'fulfilled') {
    // Nyeste gyldige TAF (høyest utstedelsestid)
    const reps = splitReports(taf.value, ap.icao).map((r) => parseTaf(r, now)).filter((p) => p && p.valid.to > now);
    tafObj = reps.sort((a, b) => b.issued - a.issued)[0] || null;
  }
  const metars = metar.status === 'fulfilled' ? parseMetars(metar.value, ap.icao, now) : [];
  return {
    taf: tafObj,
    metars,
    lf: lf.status === 'fulfilled' ? JSON.parse(lf.value) : null,
  };
}
