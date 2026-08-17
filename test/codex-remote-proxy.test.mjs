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
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "codex-remote-proxy-"),
  );
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

test("codex_remote_proxy hides transient no-rollout resume failures", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "codex-rollout-retry-"),
  );
  const socketPath = path.join(directory, "app-server.sock");
  const httpServer = http.createServer();
  const webSocketServer = new WebSocketServer({ server: httpServer });
  let requestCount = 0;

  webSocketServer.on("connection", (socket) => {
    socket.on("message", (message) => {
      const request = JSON.parse(message.toString());
      requestCount += 1;
      socket.send(
        JSON.stringify(
          requestCount < 3
            ? {
                id: request.id,
                error: {
                  code: -32600,
                  message: `no rollout found for thread id ${request.params.threadId}`,
                },
              }
            : {
                id: request.id,
                result: { thread: { id: request.params.threadId } },
              },
        ),
      );
    });
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(socketPath, resolve);
  });

  const proxy = spawn(
    path.resolve("scripts/codex_remote_proxy"),
    ["app-server"],
    {
      env: {
        ...process.env,
        CODEX_ROLLOUT_RETRY_DELAY_MS: "5",
        CODEX_UNIX_SOCKET: socketPath,
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  try {
    const request = {
      id: 7,
      method: "thread/resume",
      params: { threadId: "test-thread" },
    };
    proxy.stdin.write(`${JSON.stringify(request)}\n`);
    const [response] = await once(proxy.stdout, "data", {
      signal: AbortSignal.timeout(2000),
    });

    assert.deepEqual(JSON.parse(response.toString()), {
      id: 7,
      result: { thread: { id: "test-thread" } },
    });
    assert.equal(requestCount, 3);
  } finally {
    proxy.kill();
    webSocketServer.close();
    await new Promise((resolve) => httpServer.close(resolve));
    await rm(directory, { recursive: true });
  }
});

test("codex_remote_proxy returns no-rollout failures after the retry limit", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "codex-rollout-limit-"),
  );
  const socketPath = path.join(directory, "app-server.sock");
  const httpServer = http.createServer();
  const webSocketServer = new WebSocketServer({ server: httpServer });
  let requestCount = 0;

  webSocketServer.on("connection", (socket) => {
    socket.on("message", (message) => {
      const request = JSON.parse(message.toString());
      requestCount += 1;
      socket.send(
        JSON.stringify({
          id: request.id,
          error: {
            code: -32600,
            message: "no rollout found for thread id missing-thread",
          },
        }),
      );
    });
  });

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(socketPath, resolve);
  });

  const proxy = spawn(
    path.resolve("scripts/codex_remote_proxy"),
    ["app-server"],
    {
      env: {
        ...process.env,
        CODEX_ROLLOUT_RETRY_DELAY_MS: "5",
        CODEX_ROLLOUT_RETRY_LIMIT: "2",
        CODEX_UNIX_SOCKET: socketPath,
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  try {
    proxy.stdin.write(
      `${JSON.stringify({ id: "request-1", method: "thread/read", params: {} })}\n`,
    );
    const [response] = await once(proxy.stdout, "data", {
      signal: AbortSignal.timeout(2000),
    });

    assert.equal(
      JSON.parse(response.toString()).error.message,
      "no rollout found for thread id missing-thread",
    );
    assert.equal(requestCount, 3);

    proxy.stdin.write(
      `${JSON.stringify({ id: "request-2", method: "thread/list", params: {} })}\n`,
    );
    const [nonRetryableResponse] = await once(proxy.stdout, "data", {
      signal: AbortSignal.timeout(2000),
    });

    assert.equal(
      JSON.parse(nonRetryableResponse.toString()).error.message,
      "no rollout found for thread id missing-thread",
    );
    assert.equal(requestCount, 4);
  } finally {
    proxy.kill();
    webSocketServer.close();
    await new Promise((resolve) => httpServer.close(resolve));
    await rm(directory, { recursive: true });
  }
});
