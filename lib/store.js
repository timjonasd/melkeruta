import { Redis } from '@upstash/redis';

// Finner Upstash-variablene uansett prefiks (melkeruta_REST_API_URL, KV_REST_API_URL, UPSTASH_REDIS_REST_URL o.l.).
function findEnv(suffix) {
  const key = Object.keys(process.env).find((k) => k.toUpperCase().endsWith(suffix) && !k.toUpperCase().includes('READ_ONLY'));
  return key ? process.env[key] : undefined;
}
const url = findEnv('REST_API_URL') || findEnv('REDIS_REST_URL');
const token = findEnv('REST_API_TOKEN') || findEnv('REDIS_REST_TOKEN');
export const redis = url && token ? new Redis({ url, token }) : null;

const HIST = 'history:v1';

// Lagre prognose-snapshot for en flyvning (kun første gang)
export async function saveSnapshot(f, ap, risk) {
  if (!redis || !risk) return;
  await redis.set(`snap:${f.id}`, { ap, flight: f.flight, sched: f.sched.toISOString(), feat: risk.feat, ruleP: risk.p, src: risk.src }, { nx: true, ex: 60 * 60 * 24 * 4 });
}
export const getSnapshot = (id) => (redis ? redis.get(`snap:${id}`) : null);

export async function addHistory(rec) {
  if (!redis) return false;
  const added = await redis.sadd('history:ids', rec.id);
  if (!added) return false; // allerede registrert
  await redis.rpush(HIST, JSON.stringify(rec));
  cache.t = 0; // tving ny lesing
  return true;
}

let cache = { t: 0, data: [] };

// Antall registrerte landinger, rett fra databasen (ikke cache)
export const historyCount = () => (redis ? redis.llen(HIST) : 0);
export async function getHistory() {
  if (!redis) return [];
  if (Date.now() - cache.t < 60e3) return cache.data;
  const rows = await redis.lrange(HIST, 0, -1);
  cache = { t: Date.now(), data: rows.map((r) => (typeof r === 'string' ? JSON.parse(r) : r)) };
  return cache.data;
}
