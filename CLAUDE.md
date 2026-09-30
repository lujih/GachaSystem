# CLAUDE.md

> **本文件不再维护技术细节。** 此前版本描述的是重构前的架构（会话存 KV、单体
> `path.startsWith()` 路由、服务每请求 `new UserService(env, ctx)`、`requireAdmin` 返回值
> 语义、"No test framework"），已与 2026-08-03 架构重构后的代码全面不符，且**过时方向会主动
> 误导**——照着它写会写出错误的代码。
>
> 请以 **[AGENTS.md](./AGENTS.md)** 为唯一权威文档。

## 从哪里开始读

1. **[AGENTS.md](./AGENTS.md)** — 架构、关键机制、已知限制。改代码前必读。
2. **[docs/review-2026-09-29.md](./docs/review-2026-09-29.md)** — 全面代码审查报告
   （8 个专项子代理并行审查，140 条发现），含代码位置、复算过程与修复建议。

   **已修复**：4 项 Critical，以及 H1–H6、H8、H10–H12、H14。
   **未处理（仍在代码里）**：
   - H7 SSR 不水合：`app/entry.client.jsx` 仍用 `createRoot` 而非 `hydrateRoot`，
     SSR 产出的 HTML 被整棵丢弃并在 `<div>` 内重建 `<html>` 文档壳
   - H9 冷缓存十连 subrequest 可能超限：`image-pipeline.js` 的图源首跳无超时
   - H13 限流的 KV 计数仍非原子（并发请求可短暂绕过）——已改为只计失败尝试，
     但彻底解决需换成 D1 或 Durable Object

## 动手前必知的几条硬约束

以下都是本项目历史上**真实出过事故**的地方，详见 AGENTS.md 对应章节：

- **不要破坏扣币的原子性**。`UPDATE ... WHERE coins >= ?` + `meta.changes` 判定是唯一正确的
  扣币写法。历史上 `playDice` 在引入原子扣币后忘了删旧的补偿语句，导致每局被扣两次投注，
  单局期望从 +11% 变成 -88.9%。
- **改经济数值前先跑 `npm test`**。`tests/economy-invariants.test.js` 守护
  「期望回报 < 抽卡成本」等不变式。**按基础概率测算会得出错误结论**——软保底会把 SSR/UR
  实际产出率抬到 8.3%/2.2%（基础值 4%/1%）。
- **Hono 中间件不能用数组形式传入**，必须展开：`.get(path, ...withLimit(...), handler)`。
  传数组会让 compose 拿到非函数并抛 "handler is not a function"，整个端点 500。
- **不要再往 vite.config.ts 的 remix 插件加 `serverBuildPath`**。Vite 插件只解析
  `buildDirectory` / `serverBuildFile`，该键属旧版 RemixConfig，会被静默忽略并使 tsc 报错。
- **单抽与十连的消费路径都必须走 buffer 原子锁**（`buffer_claims` 表）。历史上十连快路径
  `consumeSlot` 完全绕过了它，导致同一张图并发发给多个玩家。
- **SSR loader 拿不到用户身份**。会话 token 存在 localStorage，服务端 request 上没有该头。
  用户维度数据必须走客户端 API（如 `/api/library/my-items`），且身份只取自会话，
  绝不能接受调用方传入的 `userId`。
- **`.dev.vars` 曾被 git 跟踪过**（`.gitignore` 对已跟踪文件无效）。如需填入真实凭据，
  先确认它处于未跟踪状态。

## 提交前

```bash
npm run typecheck && npm test && npm run build
```

三者都是 `.github/workflows/ci.yml` 中的门禁。仓库曾长期处于「typecheck 恒红、
`npm test` 因 integration 脚本被 vitest 误捕获而恒红」的状态而无人察觉，因为没有 CI。

## 行为准则

本项目偏好最小改动：只碰必须碰的，不要顺手重构相邻代码或格式化无关文件，匹配既有风格。
多步任务先说清计划与验证方式。
