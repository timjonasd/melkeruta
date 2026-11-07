// ============================================================
// SITATER VED LOGOEN
// Legg til eller endre sitater her. Ingen annen kode må røres.
//
// Regler:
// - Ett sitat per linje, i anførselstegn, med komma bak.
// - Bruk ' (enkel fnutt) inni sitatet hvis du trenger anførselstegn.
// - Grensene (i %) styres av TIERS nederst.
// ============================================================

export const QUOTES = {
  // Høy landingssjanse
  high: [
    "rulleban e så kort, har ikke anna valg enn å lette.",
    "korr høyt kan et lite fly.",
    "vi skal elske sneen.",
    "Du kan ta flyet ut av nordlendingen, men ikke nordlendingen ut av flyet.",
  ],

  // Middels – usikkert
  medium: [
    "'vi får se'",
    "Kanskje flyet lande, kanskje vi bor her nu.",
    "eneste som e sikkert, e fan ikke sikkert.",
    "tjærringa e mer stabil enn det hær.",
    "har en idê: ka hvis vi bare lande allikavel.",
    "Bedre med is i magen enn at flye ikke lande.",
    "ikke skrik fordi det e forsinkelsa, skrik når det e kansellert.",
  ],

  // Lav landingssjanse
  low: [
    "not looking good bestie.",
    "søtt lite håp du har.",
    "bestilte flyturen, fikk baguett.",
    "Baguettan e nais ihvertfall.",
    "Når matkupongen e på 150 å baguetten koste 300.",
    "Melkeruta? Hardly know her.",
  ],

  // Svært lav – ta bussen
  veryLow: [
    "jaja, hyggelig busssjåføra ihværtfall.",
    "tre tima buss, ja koffer ikke?",
    "ska vi ikke bare gå istede?",
    "gangavstand.",
    "det viktigste va vænnan man fikk langs veien.",
    "tjenne du på bolyst?",
  ],
};

// Vises når flyplassen ikke har noen landinger den dagen
export const NO_FLIGHTS_SATURDAY = "Lite fly på lørdaga, e tydeligvis en hellig dag..";
export const NO_FLIGHTS = "ingen fly! e det helligdag??";

// Nedre grense (landingssjanse i %) for hvert nivå
export const TIERS = [
  { min: 75, key: "high" },
  { min: 40, key: "medium" },
  { min: 15, key: "low" },
  { min: 0, key: "veryLow" },
];

// Sitat for én flyvning. Samme flyvning får samme sitat ved oppdatering,
// så lenge den holder seg i samme nivå.
export function flightQuote(prob, flightId = "") {
  const tier = TIERS.find((t) => prob >= t.min) ?? TIERS[TIERS.length - 1];
  const list = QUOTES[tier.key];
  let h = 0;
  for (const c of String(flightId)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

// Sitat når det ikke er noen landinger. daysAhead: 0 = i dag, 1 = i morgen.
export function noFlightsQuote(daysAhead = 0) {
  const d = new Date(Date.now() + daysAhead * 864e5);
  const wd = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Oslo" }).format(d);
  return wd === "Sat" ? NO_FLIGHTS_SATURDAY : NO_FLIGHTS;
}
