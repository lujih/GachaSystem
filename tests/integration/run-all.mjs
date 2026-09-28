// 依次运行 tests/integration/ 下的冒烟脚本。
//
// 这些脚本需要先启动本地服务：npm run build && npm run start
// （默认 http://127.0.0.1:8787）。它们是裸 Node 脚本而非 vitest 用例，
// 因此被 vitest.config.mts 排除，只由此入口触发。
//
// ⚠️ 限流约束：register / login 按 IP 限流（5 次 / 10 分钟），而每个脚本
// 都会注册新用户。因此同一 IP 约 10 分钟内只能完整跑一轮。再次运行会收到
// 429「操作过于频繁」；部分脚本的重试循环遇到 429 会反复空转。
// 本入口检测到 429 会立即中止并给出提示，避免长时间挂起。
//
// 用法：node tests/integration/run-all.mjs
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const scripts = readdirSync(here)
  .filter((f) => f.endsWith('.test.mjs'))
  .sort();

/** 把子进程输出同时接到当前终端并做限流检测 */
function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(here, file)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let rateLimited = false;
    const inspect = (chunk) => {
      const text = chunk.toString();
      if (text.includes('429') || text.includes('操作过于频繁')) rateLimited = true;
      process.stdout.write(text);
    };
    child.stdout.on('data', inspect);
    child.stderr.on('data', inspect);
    child.on('close', (code) => resolve({ ok: code === 0, rateLimited }));
  });
}

const failed = [];
let executed = 0;
let hitRateLimit = false;

for (const file of scripts) {
  console.log(`\n── ${file} ──`);
  executed++;
  const r = await run(file);
  if (!r.ok) {
    failed.push(file);
    // 仅当脚本「退出码非 0 且输出含限流文案」才判定为限流中止。
    // 注意：admin.test.mjs 会故意把管理员限流打到 429（它自己会 break 并以 0 退出），
    // 因此不能只看文本里有没有 429。
    if (r.rateLimited) {
      hitRateLimit = true;
      console.log('\n⚠️ 触发限流（register/login 每 IP 5 次/10 分钟），中止后续脚本。');
      console.log('   等待约 10 分钟后重试，或清空本地 KV 状态：');
      console.log('   rm -rf .wrangler/state/v3/kv   （Windows: Remove-Item -Recurse -Force .wrangler/state/v3/kv）');
      break;
    }
  }
}

console.log(`\n${executed - failed.length}/${executed} 通过（共 ${scripts.length} 个脚本）`);
if (failed.length) console.error('失败：' + failed.join(', '));
process.exit(failed.length ? 1 : 0);
