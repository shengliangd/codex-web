import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("browser IPC WebSocket enables bounded per-message compression", async () => {
  const serverSource = await readFile(
    new URL("../src/server/main.ts", import.meta.url),
    "utf8",
  );

  assert.match(serverSource, /perMessageDeflate:\s*\{/);
  assert.match(serverSource, /threshold:\s*1024/);
  assert.match(serverSource, /serverNoContextTakeover:\s*true/);
  assert.match(serverSource, /clientNoContextTakeover:\s*true/);
});
