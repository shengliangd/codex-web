import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HTTPS proxy installer keeps credentials out of the repository", async () => {
  const installer = await readFile(
    new URL("../scripts/install-https-proxy", import.meta.url),
    "utf8",
  );

  assert.match(installer, /read -r -s/);
  assert.match(installer, /htpasswd -Bci .* <<<"\$\{password\}"/);
  assert.match(installer, /openssl req -x509/);
  assert.match(installer, /auth_basic_user_file/);
  assert.match(installer, /auth_basic \$codex_auth_realm/);
  assert.match(installer, /openssl rand -hex 32/);
  assert.match(installer, /Max-Age=1209600/);
  assert.match(installer, /HttpOnly/);
  assert.match(installer, /SameSite=Lax/);
  assert.match(installer, /proxy_pass http:\/\/127\.0\.0\.1:8214/);
  assert.match(installer, /proxy_set_header Upgrade/);
  assert.match(installer, /TMPDIR=\/var\/tmp apt-get update/);
  assert.match(installer, /install -d -m 755 \/etc\/nginx\/auth/);
  assert.match(installer, /chown root:www-data \/etc\/nginx\/auth\/codex-web/);
  assert.match(installer, /chmod 640 \/etc\/nginx\/auth\/codex-web/);
  assert.match(installer, /CODEX_WEBVIEW_ROOT/);
  assert.match(installer, /cp -a .*webview_source/);
  assert.match(installer, /gzip -c -6/);
  assert.match(installer, /listen 8443 ssl http2/);
  assert.match(installer, /gzip_static on/);
  assert.match(installer, /max-age=31536000, immutable/);
});
