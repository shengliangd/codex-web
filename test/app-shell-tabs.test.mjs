import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("right panel tabs remain visually distinct and directly closable", async () => {
  const [css, patch] = await Promise.all([
    read("assets/app-shell-tabs.css"),
    read("patches/webview-mobile-viewport.patch"),
  ]);

  assert.match(patch, /app-shell-tabs\.css/);
  assert.match(css, /data-app-shell-tab-strip-controller="right"/);
  assert.match(css, /data-app-shell-tab-controller="right"/);
  assert.match(css, /aria-selected="true"/);
  assert.match(css, /data-app-shell-tab-close-button="true"/);
  assert.match(css, /opacity:\s*1\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
  assert.doesNotMatch(css, /electron-eink|@media/);
});
