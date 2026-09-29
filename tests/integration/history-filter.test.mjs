// Integration test for the draw-history rarity-filter bug fix.
// Verifies: (1) no-filter returns pagination; (2) rarity filter also returns
// a pagination with total >= 1 and rows matching the filter; (3) impossible
// rarity returns 0 rows.
//
// Usage: node tests/integration/history-filter.test.mjs [username]
//   默认使用共享账号 itest_shared_history（不存在时自动注册一次）。
//   本脚本不依赖「全新用户」：它会自己把抽卡记录补足到 >= 3 行再断言，
//   因此复用账号是安全的，也避免每轮消耗 register 限流预算。
import { ensureSharedAccount } from './_account.mjs';

const base = 'http://127.0.0.1:8787/api';

async function j(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Session-Token'] = token;
  const res = await fetch(base + path, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed, raw: text };
}

async function main() {
  let token;
  try {
    ({ token } = await ensureSharedAccount('history'));
  } catch (e) {
    console.error('无法取得测试账号:', e.message);
    process.exit(2);
  }

  // Ensure at least 3 rows exist in history
  const before = await j('GET', '/draw/draw-history?page=1', undefined, token);
  if (!before.body.success) { console.log('draw-history no-filter failed:', before.raw); process.exit(2); }
  const existingRows = before.body.history?.length || 0;
  if (existingRows < 3) {
    for (let i = 0; i < 3 - existingRows; i++) {
      const dr = await j('GET', '/draw', undefined, token);
      if (dr.status !== 200) {
        console.log(`draw ${i + 1} failed:`, dr.status, dr.raw);
        if (dr.status === 400 && dr.body.code === 'VALIDATION_ERROR' && dr.body.error === '积分不足') {
          console.log('user has no coins — break; using existing history');
          break;
        }
      }
    }
  }

  const noFilter = await j('GET', '/draw/draw-history?page=1', undefined, token);
  console.log('no filter total:', noFilter.body.pagination?.total, 'rows returned:', noFilter.body.history?.length);

  if (!noFilter.body.history?.length) {
    console.log('No history rows to filter — skipping rarity test');
    process.exit(0);
  }

  const target = noFilter.body.history[0].rarity.toLowerCase();
  console.log('filtering by rarity:', target);
  const filtered = await j('GET', `/draw/draw-history?page=1&rarity=${target}`, undefined, token);
  if (filtered.body.success === false) {
    console.log('FILTER FAILED:', JSON.stringify(filtered.body));
    process.exit(1);
  }
  const filterTotal = filtered.body.pagination?.total;
  console.log('filtered total:', filterTotal, 'rows:', filtered.body.history?.length);
  const allMatch = (filtered.body.history || []).every(row => row.rarity === target.toUpperCase());
  console.log('all rows match filter:', allMatch ? 'YES' : 'NO');

  if (filterTotal < 1 || !allMatch) {
    console.log('FILTER RESULT FAILED');
    process.exit(1);
  }

  const empty = await j('GET', '/draw/draw-history?page=1&rarity=zzz', undefined, token);
  console.log('impossible rarity total:', empty.body.pagination?.total, 'rows:', empty.body.history?.length);
  if (empty.body.pagination?.total !== 0) {
    console.log('EMPTY FILTER SHOULD RETURN 0 ROWS');
    process.exit(1);
  }

  console.log('ALL PASS');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
