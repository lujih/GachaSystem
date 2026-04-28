/** @type {import('@remix-run/dev').AppConfig} */
export default {
  serverBuildTarget: "cloudflare-pages",
  serverBuildPath: "functions/[[path]].js",
  ignoredRouteFiles: ["**/*.css"],
};
