import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { AuthProvider } from "~/hooks/useAuth";
import "~/styles/global.css";

/**
 * 把 CSP nonce 交给渲染层。
 * nonce 由 functions/_middleware.js 在渲染前生成，经 context.data 传到这里
 * （functions/[[path]].js 的 getLoadContext 负责把 data 透传给 loadContext）。
 *
 * ⚠️ 不要再改回「用正则给 HTML 里的 <script> 补 nonce」——那是 OWASP 点名的反模式，
 * 会让被注入的 XSS 脚本同样拿到合法 nonce。
 */
export async function loader({ context }) {
  return { nonce: context?.data?.nonce || '' };
}

export default function App() {
  const { nonce } = useLoaderData();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&family=Plus+Jakarta+Sans:ital,wght@0,500;0,700;0,800;1,800&display=swap" />
        <noscript>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&family=Plus+Jakarta+Sans:ital,wght@0,500;0,700;0,800;1,800&display=swap" />
        </noscript>
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <div id="root">
          <AuthProvider>
            <Outlet />
          </AuthProvider>
          <div className="sakura-container" aria-hidden="true">
            <div className="sakura-petal" />
            <div className="sakura-petal" />
            <div className="sakura-petal" />
            <div className="sakura-petal" />
            <div className="sakura-petal" />
          </div>
        </div>
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}
