// Widerøe-flyplasser i Finnmark.
//
// Kilde for banedata og minima: AIP Norge, AIRAC 3. sept. 2026 (AD 2.12 og innflygingskart AD 2 xxxx 5-x).
// rwy: [lav ende, høy ende], hdg: sann retning (°T) for lav ende (AD 2.12 BRG GEO), len: banelengde (m).
//
// mins: laveste rett-inn-minimum per baneende, som OCH (ft over terskel) for kat. B (Dash 8-100/200).
//   Der minimum avhenger av klatregradient ved avbrutt innflyging er 3,0 % brukt (ellers laveste gradient).
//   null = ingen rett-inn-innflyging til den enden -> sirkling.
// circ: OCH for sirkling, kat. B (ft over AD ELEV).
// lights: 'FALS' (full innflygingslys) eller 'BALS' (kort innflygingslys, typisk 150 m på kortbanene).
//
// MERK: Sidevind-/kastgrenser er anslag, ikke Widerøes faktiske verdier. Siktkrav er avledet fra
// EASA-tabellen (RVR mot DH og lysanlegg) og er omtrentlige. Widerøe kan ha egne, strengere minima.

const STOL = { xw: 13, gust: 23, tail: 5, lights: 'BALS' };
const LARGE = { xw: 15, gust: 28, tail: 5, lights: 'FALS' };

// [ft, m] ankerpunkter for påkrevd sikt/RVR mot beslutningshøyde (EASA CAT.OP.MPA.110, forenklet)
const VIS_TABLE = {
  FALS: [[200, 550], [250, 550], [300, 650], [350, 900], [400, 1100], [450, 1400], [500, 1500], [600, 1900], [700, 2200], [800, 2400]],
  BALS: [[200, 1000], [250, 1000], [300, 1200], [350, 1400], [400, 1600], [450, 1900], [500, 2100], [600, 2400]],
};
const CIRC_VIS = 1600; // kat. B sirkling
const CIRC_MIN_H = 500; // kat. B laveste sirklingshøyde

export function visFor(dh, lights) {
  const t = VIS_TABLE[lights] || VIS_TABLE.BALS;
  if (dh <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    const [h1, v1] = t[i], [h0, v0] = t[i - 1];
    if (dh <= h1) return Math.round(v0 + ((dh - h0) / (h1 - h0)) * (v1 - v0));
  }
  return t[t.length - 1][1];
}

// Minima for én baneende: rett inn hvis den finnes, ellers sirkling
export function endMinima(ap, end) {
  const si = ap.mins?.[end];
  const circ = ap.circ != null ? { ceil: Math.max(ap.circ, CIRC_MIN_H), vis: CIRC_VIS, type: 'sirkling' } : null;
  if (si == null) return circ || { ceil: 1000, vis: 3000, type: 'ukjent' };
  const s = { ceil: Math.max(si, 200), vis: visFor(Math.max(si, 200), ap.lights), type: 'rett inn' };
  return circ && circ.ceil < s.ceil ? circ : s;
}

const RAW = [
  // Alta: ILS/LPV kun til 11. 29 bare via sirkling (RNP-A, kat. B 1510).
  { iata: 'ALF', icao: 'ENAT', name: 'Alta', lat: 69.976, lon: 23.372, rwy: ['11', '29'], hdg: 121.17, len: 2254, ...LARGE, mins: { 11: 530, 29: null }, circ: 1510 },
  // Lakselv: LPV 16 (RNP X) 262, ILS 34 277.
  { iata: 'LKL', icao: 'ENNA', name: 'Lakselv', lat: 70.069, lon: 24.973, rwy: ['16', '34'], hdg: 175.42, len: 2785, ...LARGE, mins: { 16: 262, 34: 277 }, circ: 954 },
  // Kirkenes: LPV 05 740, ILS 23 255.
  { iata: 'KKN', icao: 'ENKR', name: 'Kirkenes', lat: 69.726, lon: 29.891, rwy: ['05', '23'], hdg: 69.04, len: 2355, ...LARGE, mins: { '05': 740, 23: 255 }, circ: 865 },
  // Hammerfest: LOC Z 04 (3,0 %) 848, GLS Z 22 (3,0 %) 982.
  { iata: 'HFT', icao: 'ENHF', name: 'Hammerfest', lat: 70.680, lon: 23.669, rwy: ['04', '22'], hdg: 55.94, len: 933, ...STOL, mins: { '04': 848, 22: 982 }, circ: 1607 },
  // Honningsvåg: ingen rett-inn-innflyging, kun sirkling (RNP-A/RNP-D LNAV 1225), nord for AD.
  { iata: 'HVG', icao: 'ENHV', name: 'Honningsvåg', lat: 71.009, lon: 25.983, rwy: ['08', '26'], hdg: 90.5, len: 921, ...STOL, mins: { '08': null, 26: null }, circ: 1225 },
  // Hasvik: LPV 11 (3,0 %) 552, GLS/LPV 29 (3,0 %) 305.
  { iata: 'HAA', icao: 'ENHK', name: 'Hasvik', lat: 70.487, lon: 22.140, rwy: ['11', '29'], hdg: 118.84, len: 1039, ...STOL, mins: { 11: 552, 29: 305 }, circ: 917 },
  // Mehamn: LOC 17 678, GLS 35 912.
  { iata: 'MEH', icao: 'ENMH', name: 'Mehamn', lat: 71.029, lon: 27.827, rwy: ['17', '35'], hdg: 182.37, len: 970, ...STOL, mins: { 17: 678, 35: 912 }, circ: 1207 },
  // Berlevåg: GLS 06 248, LNAV/VNAV 24 (2,5 %) ca. 640.
  { iata: 'BVG', icao: 'ENBV', name: 'Berlevåg', lat: 70.871, lon: 29.034, rwy: ['06', '24'], hdg: 74.76, len: 1029, ...STOL, mins: { '06': 248, 24: 640 }, circ: 1247 },
  // Båtsfjord: LNAV/VNAV 03 520, GLS 21 (3,0 %) 244. AD ELEV ca. 490 ft.
  { iata: 'BJF', icao: 'ENBS', name: 'Båtsfjord', lat: 70.600, lon: 29.692, rwy: ['03', '21'], hdg: 44.02, len: 1000, ...STOL, mins: { '03': 520, 21: 244 }, circ: 1020 },
  // Vardø: GLS 15 (3,0 %) 565, GLS 33 241. Sirkling kun publisert for kat. A (998).
  { iata: 'VAW', icao: 'ENSS', name: 'Vardø', lat: 70.355, lon: 31.045, rwy: ['15', '33'], hdg: 163.28, len: 1146, ...STOL, mins: { 15: 565, 33: 241 }, circ: null },
  // Vadsø: GLS 07 229, GLS 25 246.
  { iata: 'VDS', icao: 'ENVD', name: 'Vadsø', lat: 70.065, lon: 29.845, rwy: ['07', '25'], hdg: 87.41, len: 999, ...STOL, mins: { '07': 229, 25: 246 }, circ: 501 },
];

// ceil/vis på flyplassnivå = beste (laveste) minimum, brukt til visning
export const AIRPORTS = RAW.map((a) => {
  const ends = a.rwy.map((e) => endMinima(a, e));
  const best = ends.reduce((b, m) => (m.ceil < b.ceil ? m : b));
  return { ...a, ceil: best.ceil, vis: best.vis };
});

export const byIata = Object.fromEntries(AIRPORTS.map((a) => [a.iata, a]));

// Kjente navn for avgangsflyplasser utenfor Finnmark
export const OTHER_NAMES = {
  TOS: 'Tromsø', BOO: 'Bodø', OSL: 'Oslo', SOJ: 'Sørkjosen', EVE: 'Harstad/Narvik', TRD: 'Trondheim', BDU: 'Bardufoss',
};
export const airportName = (code) => byIata[code]?.name || OTHER_NAMES[code] || code;
