/** @type {import('@remix-run/dev').AppConfig} */
export default {
  serverBuildTarget: "cloudflare-pages",
  server: "./server.js",
  serverBuildPath: "functions/[[path]].js",
  ignoredRouteFiles: ["**/*.css"],
};
