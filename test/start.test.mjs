import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const startScript = path.join(repositoryRoot, "scripts/start");

test("npm start routes to the repository launcher", async () => {
  // Given
  const packageJson = JSON.parse(
    await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
  );

  // When
  const command = packageJson.scripts?.start;

  // Then
  assert.equal(command, "./scripts/start");
});

test("start uses the current checkout and the UID app-server socket", async () => {
  // Given
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "codex-web-start-"),
  );
  const socketDirectory = path.join(
    temporaryRoot,
    `codex-app-server-${process.getuid()}`,
  );
  const socketPath = path.join(socketDirectory, "control.sock");
  const binaryDirectory = path.join(temporaryRoot, "bin");
  const capturePath = path.join(temporaryRoot, "launch.txt");
  await mkdir(socketDirectory);
  await mkdir(binaryDirectory);
  await writeFile(
    path.join(binaryDirectory, "node"),
    '#!/usr/bin/env bash\nprintf "%s\\n" "$CODEX_UNIX_SOCKET" "$CODEX_CLI_PATH" "$@" >"$CAPTURE_PATH"\n',
  );
  await chmod(path.join(binaryDirectory, "node"), 0o755);

  const unixServer = net.createServer();
  await new Promise((resolve, reject) => {
    unixServer.once("error", reject);
    unixServer.listen(socketPath, resolve);
  });

  try {
    // When
    const launcher = spawn(
      startScript,
      ["--host", "127.0.0.1", "--port", "8314"],
      {
        env: {
          ...process.env,
          CAPTURE_PATH: capturePath,
          PATH: `${binaryDirectory}:${process.env.PATH}`,
          TMPDIR: temporaryRoot,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const [exitCode] = await once(launcher, "close", {
      signal: AbortSignal.timeout(2000),
    });

    // Then
    assert.equal(exitCode, 0);
    const launch = (await readFile(capturePath, "utf8")).trim().split("\n");
    assert.deepEqual(launch, [
      socketPath,
      path.join(repositoryRoot, "scripts/codex_remote_proxy"),
      path.join(repositoryRoot, "src/server/main.js"),
      "--host",
      "127.0.0.1",
      "--port",
      "8314",
    ]);
  } finally {
    unixServer.close();
    await once(unixServer, "close");
    await rm(temporaryRoot, { recursive: true });
  }
});

test("start launches a missing Codex app-server and waits for its socket", async () => {
  // Given
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "codex-web-autostart-"),
  );
  const binaryDirectory = path.join(temporaryRoot, "bin");
  const socketPath = path.join(temporaryRoot, "runtime", "control.sock");
  const appServerCapturePath = path.join(temporaryRoot, "app-server.txt");
  const appServerPidPath = path.join(temporaryRoot, "app-server.pid");
  const launchCapturePath = path.join(temporaryRoot, "launch.txt");
  const helperPath = path.join(temporaryRoot, "app-server-helper.mjs");
  await mkdir(binaryDirectory);
  await writeFile(
    helperPath,
    `import { writeFileSync } from "node:fs";
import net from "node:net";
const server = net.createServer();
server.listen(process.argv[2], () => writeFileSync(process.argv[3], String(process.pid)));
`,
  );
  await writeFile(
    path.join(binaryDirectory, "codex"),
    `#!/usr/bin/env bash
printf '%s\\n' "$@" >"$APP_SERVER_CAPTURE_PATH"
socket="\${3#unix://}"
exec "$REAL_NODE" "$APP_SERVER_HELPER" "$socket" "$APP_SERVER_PID_PATH"
`,
  );
  await writeFile(
    path.join(binaryDirectory, "node"),
    '#!/usr/bin/env bash\nprintf "%s\\n" "$CODEX_UNIX_SOCKET" "$CODEX_CLI_PATH" "$@" >"$LAUNCH_CAPTURE_PATH"\n',
  );
  await chmod(path.join(binaryDirectory, "codex"), 0o755);
  await chmod(path.join(binaryDirectory, "node"), 0o755);

  let appServerPid;
  try {
    // When
    const launcher = spawn(startScript, ["--port", "8315"], {
      env: {
        ...process.env,
        APP_SERVER_CAPTURE_PATH: appServerCapturePath,
        APP_SERVER_HELPER: helperPath,
        APP_SERVER_PID_PATH: appServerPidPath,
        CODEX_UNIX_SOCKET: socketPath,
        LAUNCH_CAPTURE_PATH: launchCapturePath,
        PATH: `${binaryDirectory}:${process.env.PATH}`,
        REAL_NODE: process.execPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const [exitCode] = await once(launcher, "close", {
      signal: AbortSignal.timeout(4000),
    });

    // Then
    assert.equal(exitCode, 0);
    assert.deepEqual(
      (await readFile(appServerCapturePath, "utf8")).trim().split("\n"),
      ["app-server", "--listen", `unix://${socketPath}`],
    );
    assert.deepEqual(
      (await readFile(launchCapturePath, "utf8")).trim().split("\n"),
      [
        socketPath,
        path.join(repositoryRoot, "scripts/codex_remote_proxy"),
        path.join(repositoryRoot, "src/server/main.js"),
        "--port",
        "8315",
      ],
    );
    appServerPid = Number(await readFile(appServerPidPath, "utf8"));
  } finally {
    if (appServerPid) process.kill(appServerPid, "SIGTERM");
    await rm(temporaryRoot, { recursive: true });
  }
});
