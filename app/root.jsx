import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { AuthProvider } from "~/hooks/useAuth";
import "~/styles/global.css";

export default function App() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&family=Plus+Jakarta+Sans:ital,wght@0,500;0,700;0,800;1,800&display=swap" media="print" onload="this.media='all'" />
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
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
