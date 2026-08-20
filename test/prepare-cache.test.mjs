import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("prepare reuses a validated versioned Desktop archive", async () => {
  const prepare = await read("scripts/prepare");

  assert.match(prepare, /CODEX_WEB_CACHE_DIR/);
  assert.match(prepare, /ChatGPT-darwin-arm64-\$APP_VERSION\.zip/);
  assert.match(prepare, /if ! unzip -tq "\$ARCHIVE_PATH"/);
  assert.match(prepare, /curl --fail --location --retry 3/);
  assert.match(prepare, /unzip -tq "\$PARTIAL_ARCHIVE"/);
  assert.match(prepare, /mv -f "\$PARTIAL_ARCHIVE" "\$ARCHIVE_PATH"/);
  assert.match(prepare, /HOSTED_CODEX_APP_ZIP="\$ARCHIVE_PATH"/);
  assert.doesNotMatch(prepare, /mktemp -d/);
});
