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
  assert.match(nginxConfig, /Max-Age=2592000/);
  assert.match(nginxConfig, /HttpOnly/);
  assert.match(nginxConfig, /SameSite=Lax/);
});
