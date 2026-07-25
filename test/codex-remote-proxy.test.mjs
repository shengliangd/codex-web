import assert from "node:assert/strict";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { WebSocketServer } from "ws";

test("codex_remote_proxy exchanges JSONL over a Unix-socket WebSocket", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codex-remote-proxy-"));
  const socketPath = path.join(directory, "app-server.sock");
  const httpServer = http.createServer();
  const webSocketServer = new WebSocketServer({ server: httpServer });

  webSocketServer.on("connection", (socket) => {
    socket.on("message", (message) => socket.send(message.toString()));
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(socketPath, resolve);
  });

  const proxy = spawn(
    path.resolve("scripts/codex_remote_proxy"),
    ["-c", "features.code_mode_host=true", "app-server"],
    {
      env: { ...process.env, CODEX_UNIX_SOCKET: socketPath },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  try {
    const payload = JSON.stringify({ id: 1, method: "initialize" });
    proxy.stdin.end(`${payload}\n`);

    const [response] = await once(proxy.stdout, "data", {
      signal: AbortSignal.timeout(2000),
    });

    assert.equal(response.toString(), `${payload}\n`);
  } finally {
    proxy.kill();
    webSocketServer.close();
    await new Promise((resolve) => httpServer.close(resolve));
    await rm(directory, { recursive: true });
  }
});
