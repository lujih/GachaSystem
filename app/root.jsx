import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { AuthProvider } from "~/hooks/useAuth";
import "~/styles/global.css";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
];

export default function App() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning className="bg-surface text-on-surface font-body-md min-h-screen overflow-x-hidden">
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
