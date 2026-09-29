// 集成测试共享账号助手
//
// 为什么需要它：/api/auth/register 的限流是 5 次 / 10 分钟 / IP，而每个集成脚本
// 原本都会注册一个随机用户的新账号，一轮 8 个脚本需要 7 次注册，必然在第 6 个
// 脚本处触发 429。
//
// 本助手采用「先登录、失败才注册」策略并使用**固定用户名**，因此同一轮里只有第一个
// 需要该账号的脚本会真正注册，后续脚本直接登录复用，从而把注册次数压到限流预算内。
//
// 适用与不适用：
//   - 适合复用：只做只读断言、或脚本自身会清理状态的（如 history-filter、limited-fallback）
//   - 不适合复用：需要「全新用户」前提的脚本（rate-limit 需要干净的限流计数器、
//     money-reconciliation 从 1000 余额起算、upload / review-upload 关心待审列表）
//     这些脚本必须自行注册，详见各自的注释。
//
// ⚠️ 仍受登录限流（10 次/10 分钟/IP）约束。一轮完整跑完后需等待，或清空本地 KV：
//    rm -rf .wrangler/state/v3/kv

const BASE = process.env.ITEST_BASE || 'http://127.0.0.1:8787/api';
const PASSWORD = 'Passw0rd!x';

// 各脚本使用互不相同的固定用户名，避免互相污染状态
export const SHARED_ACCOUNTS = {
  history: 'itest_shared_history',
  limited: 'itest_shared_limited',
};

async function call(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Session-Token'] = token;
  const res = await fetch(BASE + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed };
}

/**
 * 取得一个可用的 token：优先登录固定账号，不存在时注册一次。
 * @param {'history'|'limited'} key SHARED_ACCOUNTS 中的键
 * @returns {Promise<{username: string, token: string}>}
 */
export async function ensureSharedAccount(key) {
  const username = SHARED_ACCOUNTS[key];
  if (!username) throw new Error('未知的共享账号键: ' + key);

  const login = await call('POST', '/auth/login', { username, password: PASSWORD });
  if (login.status === 200 && login.body?.token) {
    return { username, token: login.body.token };
  }

  const reg = await call('POST', '/auth/register', { username, password: PASSWORD, nickname: username });
  if (reg.status === 200 && reg.body?.success) {
    const after = await call('POST', '/auth/login', { username, password: PASSWORD });
    if (after.body?.token) return { username, token: after.body.token };
  }
  // 注册被限流时给出可操作的提示，而不是抛一个看不懂的 403
  if (reg.body?.error?.includes('频繁')) {
    throw new Error(
      `共享账号 ${username} 尚不存在，但注册被限流（5 次/10 分钟/IP）。` +
      '请等待约 10 分钟后重试，或清空本地 KV：rm -rf .wrangler/state/v3/kv'
    );
  }
  throw new Error(`共享账号 ${username} 登录与注册均失败: ` + JSON.stringify({ login: login.body, reg: reg.body }));
}
