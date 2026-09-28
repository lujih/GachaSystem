import { defineConfig } from "vitest/config";

// 独立于 vite.config.ts：
// 1) 不加载 Remix 插件 —— 单测只测 src/ 纯函数与服务，加载 Remix 插件无意义且拖慢启动
// 2) 排除 tests/integration/ —— 那里是需手动起本地服务的裸 Node 冒烟脚本
//    （*.test.mjs），不是 vitest 用例；此前被默认 include 捕获后产生
//    6 个 unhandled rejection，使 npm test 恒为红
export default defineConfig({
  test: {
    include: ["tests/**/*.test.{js,jsx}"],
    exclude: ["node_modules/**", "build/**", "tests/integration/**"],
    environment: "node",
  },
});
