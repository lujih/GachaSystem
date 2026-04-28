import { CONFIG, DEFAULT_CHANGELOG } from '../../src/config/index.js';
import { jsonResponse, safeJsonParse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const changelog = await env.KV_CACHE.get(CONFIG.KEYS.CHANGELOG);
    const data = changelog ? safeJsonParse(changelog) : DEFAULT_CHANGELOG;
    return jsonResponse(data);
  } catch (e) {
    console.error('[changelog] Error:', e);
    return jsonResponse([]);
  }
}
