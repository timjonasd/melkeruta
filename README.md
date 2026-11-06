# Melkeruta – landingssjanse Finnmark

Viser Widerøe-ankomster i dag og i morgen for valgt flyplass i Finnmark, med estimert sjanse for innstilling basert på TAF/METAR, værprognose og (etter hvert) egen historikk.

## Datakilder
- **Avinor flydata** (`asrv.avinor.no/XmlFeed/v1.0`): planlagte ankomster og status (A = landet, C = innstilt).
- **MET Norway** (`api.met.no`): TAF/METAR (`tafmetar/1.0`) og `locationforecast/2.0/complete` for vind, kast, tåke og skydekke.

## Modell
1. **Regelbasert:** For hver landing beregnes sidevind (inkl. kast) mot beste baneende, kast, medvind, skyhøyde og sikt mot grensene i `lib/airports.js`. TEMPO/PROB-grupper i TAF vektes inn. Innenfor TAF-perioden brukes TAF, ellers prognose.
2. **Historikk:** Cron-jobben lagrer faktisk utfall (landet/innstilt) sammen med værforholdene (METAR nær landingstid, ellers prognose-snapshot). Estimatet justeres mot de 30 mest like tilfellene (Beta-prior: regelmodellen veier som 8 observasjoner).

## Oppsett (Vercel)
1. Push mappen til et GitHub-repo og importer det i Vercel (Framework: Vite).
2. Vercel → Storage → Marketplace → **Upstash Redis** (gratisnivå) → koble til prosjektet. Variablene (f.eks. `melkeruta_REST_API_URL` / `melkeruta_REST_API_TOKEN`) settes automatisk, og koden finner dem uansett prefiks.
3. Miljøvariabler:
   - `MET_USER_AGENT` – MET krever identifiserende User-Agent, f.eks. `landingssjanse/1.0 din@epost.no`
   - `CRON_SECRET` – valgfri tilfeldig streng (Vercel sender den automatisk til cron).
4. Deploy. Cron kjører 04:00 og 22:30 UTC (Hobby-plan tillater én kjøring per cron per dag).
5. Sjekk innsamling: `/api/history`. Kjør cron manuelt: `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron`.

## Juster
`lib/airports.js`: banebetegnelser, sann baneretning, grenser for sidevind/kast/medvind og minima per flyplass. **Verdiene er omtrentlige – verifiser mot AIP Norge.**

## Test
`npm test` (modell/TAF-parser) · `node test/e2e.mjs` (API med mock-data) · lokalt: `vercel dev`.
