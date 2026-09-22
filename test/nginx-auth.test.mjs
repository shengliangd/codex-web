import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("successful Basic Auth login issues a persistent trusted-device cookie", async () => {
  const nginxConfig = await readFile(
    new URL("../examples/nginx/codex-web.conf", import.meta.url),
    "utf8",
  );

  assert.match(nginxConfig, /location = \/\s*\{/);
  assert.match(nginxConfig, /try_files \/index\.html =404;/);
  assert.match(nginxConfig, /add_header Set-Cookie \$codex_remember_cookie;/);
  assert.doesNotMatch(
    nginxConfig,
    /add_header Set-Cookie \$codex_remember_cookie always;/,
  );
  assert.match(nginxConfig, /Max-Age=1209600/);
  assert.match(nginxConfig, /HttpOnly/);
  assert.match(nginxConfig, /SameSite=Lax/);
});

test("hashed assets are compressed and cached without caching preload", async () => {
  const nginxConfig = await readFile(
    new URL("../examples/nginx/codex-web.conf", import.meta.url),
    "utf8",
  );

  assert.match(nginxConfig, /listen 127\.0\.0\.1:8443 ssl http2;/);
  assert.match(nginxConfig, /send_timeout 300s;/);
  assert.match(nginxConfig, /gzip_static on;/);
  assert.match(nginxConfig, /gzip_proxied any;/);
  assert.match(nginxConfig, /location = \/assets\/preload\.js/);
  assert.match(nginxConfig, /location \^~ \/assets\//);
  assert.match(nginxConfig, /max-age=31536000, immutable/);
});
