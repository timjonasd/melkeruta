import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

// Henter Widerøe-ankomster. timeFrom: timer bakover (maks 36), timeTo: timer fremover.
export async function fetchArrivals(iata, timeFrom = 24, timeTo = 48) {
  const url = `https://asrv.avinor.no/XmlFeed/v1.0?airport=${iata}&direction=A&TimeFrom=${timeFrom}&TimeTo=${timeTo}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Avinor ${r.status}`);
  const x = parser.parse(await r.text());
  let fl = x?.airport?.flights?.flight ?? [];
  if (!Array.isArray(fl)) fl = [fl];
  return fl
    .filter((f) => f.airline === 'WF' && f.arr_dep === 'A')
    .map((f) => ({
      id: String(f.uniqueID),
      flight: f.flight_id,
      from: f.airport,
      via: f.via_airport || null,
      sched: new Date(f.schedule_time),
      status: f.status?.code || null, // A=landet, C=innstilt, E=ny tid, N=ny info
      statusTime: f.status?.time ? new Date(f.status.time) : null,
    }));
}
