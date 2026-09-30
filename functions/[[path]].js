import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";
import * as build from "../build/server/index.js";

/**
 * 把 Pages 的 context.data 透传给 Remix loadContext。
 *
 * 必须显式提供：@remix-run/cloudflare-pages 的默认 getLoadContext 只返回
 * `{ cloudflare: {...} }`，其中不含 data，loader 因此读不到
 * functions/_middleware.js 写入的 CSP nonce。
 *
 * args 里的 data 与 request/env/params 同级，来自 Pages 事件上下文。
 */
export const onRequest = createPagesFunctionHandler({
  build,
  getLoadContext: ({ data, context }) => ({ ...context, data }),
});
