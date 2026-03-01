/**
 * HTTP 响应工具函数
 */

export function jsonResponse(data, status = 200, extraHeaders = {}) {
  const headers = { 
    'Content-Type': 'application/json', 
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders 
  };
  return new Response(JSON.stringify(data), { status, headers });
}

export function safeJsonParse(str) { 
  try { 
    return JSON.parse(str); 
  } catch { 
    return null; 
  } 
}

export function requireAdmin(request, env) {
  return request.json().then(body => {
    if (!body.password || body.password !== env.admin) {
      return { authorized: false, error: '认证失败' };
    }
    return { authorized: true, password: body.password };
  });
}

// 计算图片文件的 Hash 值（用于去重）
export async function calculateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
