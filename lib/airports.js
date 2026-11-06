// Widerøe-flyplasser i Finnmark.
// rwy: magnetiske banebetegnelser (én ende per bane). Sann retning = rwy*10 + DECL.
// MERK: Banebetegnelser, minima og grenser er omtrentlige – verifiser mot AIP Norge (ENR/AD 2) og juster.
export const DECL = 14; // ca. østlig misvisning i Finnmark (grader)

// Standardgrenser (Dash 8, vinter, korte baner). Alle i m/s, fot og meter.
const STOL = { xw: 13, gust: 23, tail: 5, ceil: 400, vis: 1500 };
const LARGE = { xw: 15, gust: 28, tail: 5, ceil: 250, vis: 1000 };

export const AIRPORTS = [
  { iata: 'ALF', icao: 'ENAT', name: 'Alta', lat: 69.976, lon: 23.372, rwy: [11], ...LARGE },
  { iata: 'LKL', icao: 'ENNA', name: 'Lakselv', lat: 70.069, lon: 24.973, rwy: [17], ...LARGE },
  { iata: 'KKN', icao: 'ENKR', name: 'Kirkenes', lat: 69.726, lon: 29.891, rwy: [6], ...LARGE },
  { iata: 'HFT', icao: 'ENHF', name: 'Hammerfest', lat: 70.680, lon: 23.669, rwy: [5], ...STOL },
  { iata: 'HVG', icao: 'ENHV', name: 'Honningsvåg', lat: 71.009, lon: 25.983, rwy: [8], ...STOL },
  { iata: 'HAA', icao: 'ENHK', name: 'Hasvik', lat: 70.487, lon: 22.140, rwy: [10], ...STOL },
  { iata: 'MEH', icao: 'ENMH', name: 'Mehamn', lat: 71.029, lon: 27.827, rwy: [17], ...STOL },
  { iata: 'BVG', icao: 'ENBV', name: 'Berlevåg', lat: 70.871, lon: 29.034, rwy: [6], ...STOL },
  { iata: 'BJF', icao: 'ENBS', name: 'Båtsfjord', lat: 70.600, lon: 29.692, rwy: [3], ...STOL },
  { iata: 'VAW', icao: 'ENSS', name: 'Vardø', lat: 70.355, lon: 31.045, rwy: [15], ...STOL },
  { iata: 'VDS', icao: 'ENVD', name: 'Vadsø', lat: 70.065, lon: 29.845, rwy: [8], ...STOL },
];

export const byIata = Object.fromEntries(AIRPORTS.map((a) => [a.iata, a]));

// Kjente navn for avgangsflyplasser utenfor Finnmark
export const OTHER_NAMES = {
  TOS: 'Tromsø', BOO: 'Bodø', OSL: 'Oslo', SOJ: 'Sørkjosen', EVE: 'Harstad/Narvik', TRD: 'Trondheim', BDU: 'Bardufoss',
};
export const airportName = (code) => byIata[code]?.name || OTHER_NAMES[code] || code;
