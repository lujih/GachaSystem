/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/cloudflare-pages" />
/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  KV_CACHE: KVNamespace;
  R2_BUCKET: R2Bucket;
  admin: string;
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  R2_DOMAIN: string;
}
