import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { AuthProvider } from "~/hooks/useAuth";
import "~/styles/global.css";

export default function App() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
