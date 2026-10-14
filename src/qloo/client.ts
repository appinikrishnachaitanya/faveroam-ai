import { debugEvent } from "../agent/debug.ts";
import { fetchWithRetry, paced } from './transport.ts';
import { parseEntities } from './types.ts';
import type { Entity, JsonObject } from './types.ts';
export class QlooError extends Error {
  status: number | undefined;
  constructor(message: string, status?: number) { super(message); this.status = status; }
}
export function safeText(value: unknown): string {
  const text = JSON.stringify(value) ?? '';
  const key = process.env.QLOO_API_KEY;
  return key ? text.replaceAll(key, '[REDACTED]') : text;
}
export async function request(path: '/search' | '/v2/insights/', params: Record<string, string>, signal?:AbortSignal): Promise<unknown> {
  const key = process.env.QLOO_API_KEY;
  if (!key?.trim()) throw new QlooError('Missing QLOO_API_KEY. Supply it securely through environment settings or an ignored .env file.');
  const base = process.env.QLOO_API_BASE_URL ?? 'https://hackathon.api.qloo.com';
  if (!['https://hackathon.api.qloo.com', 'https://api.qloo.com'].includes(base.replace(/\/$/, ''))) throw new QlooError('Unsupported Qloo API base URL');
  const url = new URL(path, base);
  url.search = new URLSearchParams(params).toString();
  return paced(`${key}:${url}`, async () => {
  if(signal?.aborted)throw new QlooError('Qloo request cancelled');
  debugEvent('qloo.request', { endpoint: path === '/search' ? 'search' : 'insights' });
  let response: Response;
  try {
    response = await fetchWithRetry(url, { headers: { 'X-Api-Key': key, Accept: 'application/json' },
      signal: signal ?? AbortSignal.timeout(30_000), redirect: 'error' });
  } catch { debugEvent('qloo.failed'); throw new QlooError('Qloo network/TLS/proxy failure or 30-second timeout. No fallback data used.'); }
  debugEvent('qloo.response', { status: response.status });
  if (!response.ok) {
    // Never log response bodies: they may echo request credentials.
    const reason = response.status === 401 || response.status === 403 ? 'Authentication or access denied'
      : response.status === 429 ? 'Rate limit exceeded; wait before rerunning'
      : response.status === 400 ? 'Invalid parameters, entity type, signal, or locality; verify documented query'
      : response.status === 404 ? 'No results or endpoint unavailable' : 'API failure';
    throw new QlooError(`${reason} (HTTP ${response.status})`, response.status);
  }
  try { return await response.json(); } catch { throw new QlooError('Qloo returned invalid JSON'); }
  });
}
export async function search(query: string): Promise<Entity[]> {
  const entities = parseEntities(await request('/search', { query, take: '5' }), 'search');
  debugEvent('qloo.entities', { endpoint: 'search', count: entities.length });
  return entities;
}
export async function insights(params: Record<string, string>, signal?:AbortSignal): Promise<{ entities: Entity[]; body: unknown }> {
  const body = await request('/v2/insights/', params, signal);
  const entities = parseEntities(body, 'insights');
  debugEvent('qloo.entities', { endpoint: 'insights', count: entities.length });
  return { entities, body };
}
export function insightParams(ids: string[], type: string, local: boolean): Record<string, string> {
  const supported = ['place', 'artist', 'book', 'brand'];
  if (!supported.includes(type)) throw new QlooError('Unsupported experiment output type');
  if (!ids.length) throw new QlooError('No resolved entities available');
  const params: Record<string, string> = {
    'filter.type': `urn:entity:${type}`, 'signal.interests.entities': ids.join(','), take: '5'
  };
  if (local) {
    if (type !== 'place') throw new QlooError('Physical location filtering is only configured for places');
    params['filter.location.query'] = 'New York City';
    params['filter.location.radius'] = '0';
  } else params['signal.location.query'] = 'New York City';
  return params;
}
export function metadata(entity: Entity): JsonObject {
  return { type: entity.types ?? entity.subtype ?? entity.type, properties: Object.fromEntries(Object.entries(entity.properties ?? {}).filter(([k]) => ['address','geocode','release_year','short_description','description'].includes(k))),
    ...(typeof entity.query?.affinity === 'number' ? { 'affinity (raw API relevance; not a probability)': entity.query.affinity } : {}),
    ...(entity.scores !== undefined ? { 'raw scores (not rescaled)': entity.scores } : {}) };
}
