import assert from 'node:assert';
import { parseTaf, tafAt, parseMetars } from '../lib/weather.js';
import { ruleRisk, calibrate } from '../lib/model.js';
import { byIata } from '../lib/airports.js';

const now = new Date('2026-11-05T10:00:00Z');
const taf = parseTaf('TAF ENHV 050500Z 0506/0515 24015G28KT 9999 FEW020 BKN035 TEMPO 0506/0512 2000 SHSN BKN008 BECMG 0512/0514 30030G45KT PROB30 0512/0515 0800 SN VV004=', now);
assert.equal(taf.valid.from.toISOString(), '2026-11-05T06:00:00.000Z');
assert.equal(taf.changes.length, 3);
const at9 = tafAt(taf, new Date('2026-11-05T09:00:00Z'));
assert.ok(Math.abs(at9.main.spd - 15 * 0.514444) < 0.01);
assert.equal(at9.main.ceil, 3500);
assert.equal(at9.temps.length, 1);
assert.equal(at9.temps[0].cond.ceil, 800);

const metars = parseMetars('2026-11-05T09:50 METAR ENHV 050950Z 25012KT 9999 -SHSN SCT015 BKN025 M02/M05 Q1002=\n2026-11-05T09:20 METAR ENHV 050920Z 25010KT 9999 FEW015 M02/M05 Q1002=', 'ENHV', now);
assert.equal(metars.length, 2);
assert.equal(metars[1].cond.ceil, 2500);

const ap = byIata.HVG;
const wx = { taf, metars, lf: null };
const calm = ruleRisk(ap, wx, new Date('2026-11-05T08:00:00Z'));
const storm = ruleRisk(ap, wx, new Date('2026-11-05T14:00:00Z'));
console.log('08Z', calm.p.toFixed(3), calm.wx, calm.drivers);
console.log('14Z', storm.p.toFixed(3), storm.wx, storm.drivers);
assert.ok(calm.p < storm.p && storm.p > 0.6);

const hist = Array.from({ length: 20 }, (_, i) => ({ ap: 'HVG', outcome: i < 2 ? 'cancelled' : 'ok', feat: calm.feat }));
const c = calibrate(calm, hist, 'HVG');
console.log('calibrated', c);
assert.equal(c.n, 20);
console.log('OK');

// Minima per baneende fra AIP
import { endMinima, AIRPORTS } from '../lib/airports.js';
assert.equal(endMinima(byIata.HVG, '08').type, 'sirkling');
assert.equal(endMinima(byIata.HVG, '26').ceil, 1225);
assert.equal(endMinima(byIata.VDS, '07').type, 'rett inn');
assert.equal(endMinima(byIata.ALF, '29').ceil, 1510);
for (const a of AIRPORTS) console.log(a.iata, a.rwy.map((e) => { const m = endMinima(a, e); return `${e}: ${m.ceil} ft/${m.vis} m ${m.type}`; }).join(' | '));
// Vind fra vest ved Vadsø skal velge bane 25
import { condRisk } from '../lib/model.js';
assert.equal(condRisk(byIata.VDS, { dir: 260, spd: 8, gust: 10, ceil: 2000, vis: 9999 }).wx.rwy, '25');
console.log('OK minima');
