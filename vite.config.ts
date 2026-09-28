import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      // 注意：不要在此设置 serverBuildPath。Vite 插件只解析 buildDirectory /
      // serverBuildFile，serverBuildPath 属旧版 RemixConfig，会被静默忽略
      // （并使 tsc 报 TS2353）。服务端入口由 functions/[[path]].js 手写 import
      // ../build/server/index.js，与默认输出路径一致。
    }),
    tsconfigPaths(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "app"),
    },
  },
});
