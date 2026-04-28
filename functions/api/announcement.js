import { CONFIG } from '../../src/config/index.js';
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const announcement = await env.KV_CACHE.get(CONFIG.KEYS.ANNOUNCEMENT, { type: 'json' });
    return jsonResponse(announcement || { title: '', content: '', enabled: false });
  } catch (e) {
    console.error('[announcement] Error:', e);
    return jsonResponse({ title: '', content: '', enabled: false });
  }
}
