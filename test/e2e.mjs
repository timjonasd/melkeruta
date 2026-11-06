const xml = `<?xml version="1.0"?><airport name="HVG"><flights lastUpdate="2026-11-05T10:00:00Z">
<flight uniqueID="1"><airline>WF</airline><flight_id>WF920</flight_id><dom_int>D</dom_int><schedule_time>2026-11-05T07:10:00Z</schedule_time><arr_dep>A</arr_dep><airport>HFT</airport><status code="A" time="2026-11-05T07:14:00Z"/></flight>
<flight uniqueID="2"><airline>WF</airline><flight_id>WF922</flight_id><dom_int>D</dom_int><schedule_time>2026-11-05T13:40:00Z</schedule_time><arr_dep>A</arr_dep><airport>TOS</airport><via_airport>HFT</via_airport></flight>
<flight uniqueID="3"><airline>WF</airline><flight_id>WF924</flight_id><dom_int>D</dom_int><schedule_time>2026-11-06T08:00:00Z</schedule_time><arr_dep>A</arr_dep><airport>MEH</airport></flight>
<flight uniqueID="4"><airline>DY</airline><flight_id>DY1</flight_id><dom_int>D</dom_int><schedule_time>2026-11-05T12:00:00Z</schedule_time><arr_dep>A</arr_dep><airport>OSL</airport></flight>
</flights></airport>`;
const taf = '2026-11-05T05:00 TAF ENHV 050500Z 0506/0515 24015G28KT 9999 FEW020 BKN035 TEMPO 0506/0512 2000 SHSN BKN008 BECMG 0512/0514 30030G45KT=';
const metar = 'METAR ENHV 050950Z 25012KT 9999 -SHSN SCT015 BKN025 M02/M05 Q1002=';
const ts = []; for (let h = 0; h < 72; h++) ts.push({ time: new Date(Date.UTC(2026,10,5,h)).toISOString(), data: { instant: { details: { wind_from_direction: 320, wind_speed: 12, wind_speed_of_gust: 20, fog_area_fraction: 0, cloud_area_fraction_low: 50, air_temperature: -2 } }, next_1_hours: { summary: { symbol_code: 'snowshowers_day' }, details: { precipitation_amount: 0.5 } } } });
globalThis.fetch = async (u) => {
  const body = u.includes('avinor') ? xml : u.includes('taf.txt') ? taf : u.includes('metar.txt') ? metar : JSON.stringify({ properties: { timeseries: ts } });
  return { ok: true, status: 200, text: async () => body };
};
const RealDate = Date; const fixed = new RealDate('2026-11-05T10:00:00Z').getTime();
globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
const { default: h } = await import('../api/day.js');
const res = { code: 200, status(c) { this.code = c; return this; }, setHeader() {}, json(j) { console.log(this.code, JSON.stringify(j, null, 1).slice(0, 2500)); } };
await h({ query: { airport: 'hvg' } }, res);
