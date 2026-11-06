// Widerøe-flyplasser i Finnmark.
// rwy: [lav ende, høy ende], hdg: sann retning (°T) for lav ende. len: banelengde (m).
// Baneretninger kontrollert mot OurAirports-data (terskelkoordinater) nov. 2026 – ikke offisiell AIP.
// MERK: Grenser for sidevind/kast og minima er anslag, ikke Widerøes faktiske verdier.

// Standardgrenser (Dash 8, vinter, korte baner). Alle i m/s, fot og meter.
const STOL = { xw: 13, gust: 23, tail: 5, ceil: 400, vis: 1500 };
const LARGE = { xw: 15, gust: 28, tail: 5, ceil: 250, vis: 1000 };

export const AIRPORTS = [
  { iata: 'ALF', icao: 'ENAT', name: 'Alta', lat: 69.976, lon: 23.372, rwy: ['11', '29'], hdg: 121, len: 2184, ...LARGE },
  { iata: 'LKL', icao: 'ENNA', name: 'Lakselv', lat: 70.069, lon: 24.973, rwy: ['16', '34'], hdg: 175, len: 2788, ...LARGE },
  { iata: 'KKN', icao: 'ENKR', name: 'Kirkenes', lat: 69.726, lon: 29.891, rwy: ['05', '23'], hdg: 69, len: 2115, ...LARGE },
  { iata: 'HFT', icao: 'ENHF', name: 'Hammerfest', lat: 70.680, lon: 23.669, rwy: ['04', '22'], hdg: 56, len: 933, ...STOL },
  { iata: 'HVG', icao: 'ENHV', name: 'Honningsvåg', lat: 71.009, lon: 25.983, rwy: ['08', '26'], hdg: 90, len: 880, ...STOL },
  { iata: 'HAA', icao: 'ENHK', name: 'Hasvik', lat: 70.487, lon: 22.140, rwy: ['11', '29'], hdg: 119, len: 969, ...STOL },
  { iata: 'MEH', icao: 'ENMH', name: 'Mehamn', lat: 71.029, lon: 27.827, rwy: ['17', '35'], hdg: 182, len: 880, ...STOL },
  { iata: 'BVG', icao: 'ENBV', name: 'Berlevåg', lat: 70.871, lon: 29.034, rwy: ['06', '24'], hdg: 75, len: 1028, ...STOL },
  { iata: 'BJF', icao: 'ENBS', name: 'Båtsfjord', lat: 70.600, lon: 29.692, rwy: ['03', '21'], hdg: 44, len: 1000, ...STOL },
  { iata: 'VAW', icao: 'ENSS', name: 'Vardø', lat: 70.355, lon: 31.045, rwy: ['15', '33'], hdg: 163, len: 1130, ...STOL },
  { iata: 'VDS', icao: 'ENVD', name: 'Vadsø', lat: 70.065, lon: 29.845, rwy: ['07', '25'], hdg: 87, len: 999, ...STOL },
];

export const byIata = Object.fromEntries(AIRPORTS.map((a) => [a.iata, a]));

// Kjente navn for avgangsflyplasser utenfor Finnmark
export const OTHER_NAMES = {
  TOS: 'Tromsø', BOO: 'Bodø', OSL: 'Oslo', SOJ: 'Sørkjosen', EVE: 'Harstad/Narvik', TRD: 'Trondheim', BDU: 'Bardufoss',
};
export const airportName = (code) => byIata[code]?.name || OTHER_NAMES[code] || code;
