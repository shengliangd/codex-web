import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const installerPath = path.resolve("scripts/install-https-proxy");

test("setup requires an explicit safe HTTPS listen address", () => {
  const missing = spawnSync(installerPath, [], { encoding: "utf8" });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /--listen-address is required/);

  const invalid = spawnSync(
    installerPath,
    ["--listen-address", "127.0.0.1; include injected.conf"],
    { encoding: "utf8" },
  );
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Invalid listen address/);

  const relativeSocket = spawnSync(
    installerPath,
    ["--listen-address", "127.0.0.1", "--socket", "relative.sock"],
    { encoding: "utf8" },
  );
  assert.equal(relativeSocket.status, 2);
  assert.match(relativeSocket.stderr, /--socket must be an absolute path/);
});

test("one public command configures Nginx then enters the foreground launcher", async () => {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "codex-web-install-"),
  );
  const scriptsDirectory = path.join(temporaryRoot, "scripts");
  const binaryDirectory = path.join(temporaryRoot, "bin");
  const sudoCapture = path.join(temporaryRoot, "sudo.txt");
  const startCapture = path.join(temporaryRoot, "start.txt");

  try {
    await Promise.all([
      mkdir(scriptsDirectory),
      mkdir(binaryDirectory),
      mkdir(path.join(temporaryRoot, "node_modules")),
      mkdir(path.join(temporaryRoot, "assets")),
      mkdir(path.join(temporaryRoot, "patches")),
      mkdir(path.join(temporaryRoot, "src/browser"), { recursive: true }),
      mkdir(path.join(temporaryRoot, "src/server"), { recursive: true }),
      mkdir(path.join(temporaryRoot, "scratch/asar/webview"), {
        recursive: true,
      }),
    ]);

    await copyFile(
      installerPath,
      path.join(scriptsDirectory, "install-https-proxy"),
    );
    await Promise.all([
      writeFile(path.join(temporaryRoot, "CODEX_DESKTOP_VERSION"), "test\n"),
      writeFile(path.join(temporaryRoot, "package.json"), "{}\n"),
      writeFile(path.join(temporaryRoot, "package-lock.json"), "{}\n"),
      writeFile(path.join(temporaryRoot, "vite.browser.config.ts"), ""),
      writeFile(path.join(temporaryRoot, "src/server/main.js"), ""),
      writeFile(
        path.join(temporaryRoot, "scratch/asar/webview/index.html"),
        "",
      ),
      writeFile(path.join(temporaryRoot, "scratch/.codex-web-build-stamp"), ""),
      writeFile(path.join(scriptsDirectory, "prepare"), ""),
      writeFile(path.join(scriptsDirectory, "prepare_asar"), ""),
      writeFile(
        path.join(scriptsDirectory, "start"),
        '#!/usr/bin/env bash\nprintf "%s\\n" "$CODEX_UNIX_SOCKET" "$@" >"$START_CAPTURE"\n',
      ),
      writeFile(
        path.join(binaryDirectory, "sudo"),
        '#!/usr/bin/env bash\nprintf "%s\\n" "$@" >"$SUDO_CAPTURE"\n',
      ),
    ]);

    for (const commandName of [
      "node",
      "npm",
      "curl",
      "unzip",
      "patch",
      "codex",
    ]) {
      await writeFile(
        path.join(binaryDirectory, commandName),
        "#!/usr/bin/env bash\nexit 0\n",
      );
      await chmod(path.join(binaryDirectory, commandName), 0o755);
    }
    await chmod(path.join(scriptsDirectory, "install-https-proxy"), 0o755);
    await chmod(path.join(scriptsDirectory, "start"), 0o755);
    await chmod(path.join(binaryDirectory, "sudo"), 0o755);

    const launch = spawnSync(
      path.join(scriptsDirectory, "install-https-proxy"),
      [
        "--listen-address",
        "192.0.2.10",
        "--socket",
        "/run/user/1000/codex.sock",
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${binaryDirectory}:${process.env.PATH}`,
          START_CAPTURE: startCapture,
          SUDO_CAPTURE: sudoCapture,
        },
      },
    );

    assert.equal(launch.status, 0, launch.stderr);
    assert.match(
      await readFile(sudoCapture, "utf8"),
      /--configure-only[\s\S]*--listen-address\n192\.0\.2\.10/,
    );
    assert.deepEqual(
      (await readFile(startCapture, "utf8")).trim().split("\n"),
      [
        "/run/user/1000/codex.sock",
        "--host",
        "127.0.0.1",
        "--port",
        "8214",
      ],
    );
    assert.match(launch.stderr, /Starting codex-web in the foreground/);
  } finally {
    await rm(temporaryRoot, { recursive: true });
  }
});

test("setup configures Nginx before starting codex-web in front", async () => {
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
  assert.match(installer, /listen_address=""/);
  assert.match(installer, /--listen-address is required/);
  assert.match(installer, /--listen-address/);
  assert.match(installer, /npm ci/);
  assert.match(installer, /npm run prepare/);
  assert.match(installer, /sudo env CODEX_WEBVIEW_ROOT=/);
  assert.match(
    installer,
    /exec "\$\{script_dir\}\/start" --host 127\.0\.0\.1 --port 8214/,
  );
  assert.match(installer, /listen __CODEX_LISTEN_ENDPOINT__ ssl http2/);
  assert.match(
    installer,
    /s\/__CODEX_LISTEN_ENDPOINT__\/\$\{listen_endpoint\}\/g/,
  );
  assert.match(installer, /send_timeout 300s/);
  assert.match(installer, /gzip on/);
  assert.match(installer, /gzip_static on/);
  assert.match(installer, /webview\.previous/);
  assert.match(installer, /mv "\$\{webview_stage\}" \/srv\/codex-web\/webview/);
  assert.match(installer, /if \[\[ ! -s \/etc\/nginx\/auth\/codex-web \]\]/);
  assert.match(installer, /codex-web-trust-token/);
  assert.match(installer, /chmod 600 \/etc\/nginx\/conf\.d\/codex-web\.conf/);
  assert.match(
    installer,
    /location = \/assets\/app-initial~app-main~page-BF1QkwFT\.js \{[\s\S]*?Cache-Control "no-cache"/,
  );
  assert.match(
    installer,
    /location = \/assets\/app-initial~app-main~hotkey-window-thread-page~thread-app-shell-chrome~header~remote-conver~h59fr3q5-Cm3GYhJA\.js \{[\s\S]*?Cache-Control "no-cache"/,
  );
  assert.match(
    installer,
    /location = \/assets\/app-initial~app-main~settings-page~appearance-settings~general-settings-DyXXbsyx\.js \{[\s\S]*?Cache-Control "no-cache"/,
  );
  assert.match(
    installer,
    /location = \/eink-theme\.js \{[\s\S]*?Cache-Control "no-cache"/,
  );
  assert.match(
    installer,
    /find "\$\{webview_stage\}" -type f -name '\*\.gz' -exec chmod 644/,
  );
  assert.match(
    installer,
    /location = \/assets\/app-initial~app-main~appgen-settings-page~settings-page~skills-settings~plugins-settings~re~n7kg4zj6-CoJ-ih-g\.js \{[\s\S]*?Cache-Control "no-cache"/,
  );
  assert.match(
    installer,
    /add_header Cache-Control "public, max-age=31536000, immutable" always;/,
  );
});
