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
  // Høy sannsynlighet for landing
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

  // Lav sannsynlighet
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

// Vises alltid på lørdager, uansett sannsynlighet
export const SATURDAY_QUOTE = "lite fly på lørdaga, e jo helligdag.";

// Nedre grense (snitt landingssannsynlighet i %) for hvert nivå
export const TIERS = [
  { min: 75, key: "high" },
  { min: 40, key: "medium" },
  { min: 15, key: "low" },
  { min: 0, key: "veryLow" },
];

export function pickQuote(avgProbability) {
  if (new Date().getDay() === 6) return SATURDAY_QUOTE;
  const tier = TIERS.find((t) => avgProbability >= t.min) ?? TIERS[TIERS.length - 1];
  const list = QUOTES[tier.key];
  return list[Math.floor(Math.random() * list.length)];
}
