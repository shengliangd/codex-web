#!/usr/bin/env node

const net = require("node:net");
const readline = require("node:readline");
const WebSocket = require("ws");

const socketPath = process.env.CODEX_UNIX_SOCKET;
if (!socketPath) {
  process.stderr.write("CODEX_UNIX_SOCKET must be set\n");
  process.exit(64);
}

const maxPayload = Number(process.env.CODEX_BUFFER_SIZE ?? 104857600);
const rolloutRetryDelayMs = Number(
  process.env.CODEX_ROLLOUT_RETRY_DELAY_MS ?? 100,
);
const rolloutRetryLimit = Number(process.env.CODEX_ROLLOUT_RETRY_LIMIT ?? 6);
const retryableRolloutMethods = new Set([
  "thread/name/set",
  "thread/read",
  "thread/resume",
]);
const socket = new WebSocket("ws://localhost/rpc", {
  createConnection: () => net.createConnection(socketPath),
  maxPayload,
  perMessageDeflate: false,
});
const input = readline.createInterface({ input: process.stdin });
const pendingMessages = [];
const retryableRequests = new Map();
const retryTimers = new Set();

function requestKey(id) {
  return `${typeof id}:${String(id)}`;
}

function parseRetryableRequest(message) {
  try {
    const request = JSON.parse(message);
    if (
      request == null ||
      request.id == null ||
      !retryableRolloutMethods.has(request.method)
    ) {
      return null;
    }
    return { key: requestKey(request.id), message, retries: 0 };
  } catch {
    return null;
  }
}

function sendRequest(message) {
  const retryableRequest = parseRetryableRequest(message);
  if (retryableRequest) {
    retryableRequests.set(retryableRequest.key, retryableRequest);
  }
  socket.send(message);
}

input.on("line", (message) => {
  if (socket.readyState === WebSocket.OPEN) {
    sendRequest(message);
    return;
  }
  pendingMessages.push(message);
});

socket.on("open", () => {
  for (const message of pendingMessages) sendRequest(message);
  pendingMessages.length = 0;
});

socket.on("message", (message) => {
  const text = message.toString();
  let response;
  try {
    response = JSON.parse(text);
  } catch {
    process.stdout.write(`${text}\n`);
    return;
  }

  const key = response?.id == null ? null : requestKey(response.id);
  const request = key == null ? null : retryableRequests.get(key);
  const noRolloutFound =
    typeof response?.error?.message === "string" &&
    /^no rollout found for (?:thread|conversation) id /.test(
      response.error.message,
    );

  if (request && noRolloutFound && request.retries < rolloutRetryLimit) {
    request.retries += 1;
    const delay = rolloutRetryDelayMs * 2 ** (request.retries - 1);
    const timer = setTimeout(() => {
      retryTimers.delete(timer);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(request.message);
      }
    }, delay);
    retryTimers.add(timer);
    return;
  }

  if (key != null) {
    retryableRequests.delete(key);
  }
  process.stdout.write(`${text}\n`);
});

socket.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

socket.on("close", () => {
  for (const timer of retryTimers) clearTimeout(timer);
  retryTimers.clear();
  retryableRequests.clear();
  input.close();
});
