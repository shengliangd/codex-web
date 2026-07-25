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
const socket = new WebSocket("ws://localhost/rpc", {
  createConnection: () => net.createConnection(socketPath),
  maxPayload,
  perMessageDeflate: false,
});
const input = readline.createInterface({ input: process.stdin });
const pendingMessages = [];

input.on("line", (message) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(message);
    return;
  }
  pendingMessages.push(message);
});

socket.on("open", () => {
  for (const message of pendingMessages) socket.send(message);
  pendingMessages.length = 0;
});

socket.on("message", (message) => {
  process.stdout.write(`${message.toString()}\n`);
});

socket.on("error", (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

socket.on("close", () => {
  input.close();
});
