import assert from "node:assert/strict";
import test from "node:test";

import { BrowserWindow } from "../src/server/electron/index.js";

test("BrowserWindow preserves its proxy and supports backdrop refreshes", () => {
  const window = new BrowserWindow({ show: false });

  assert.equal(BrowserWindow.getAllWindows().at(-1), window);
  assert.equal(window.isVisible(), false);

  window.show();
  assert.equal(window.isVisible(), true);
  assert.doesNotThrow(() => window.setBackgroundColor("#ffffff"));
  assert.doesNotThrow(() => window.setBackgroundMaterial("mica"));
  assert.doesNotThrow(() => window.setVibrancy("sidebar"));

  window.hide();
  assert.equal(window.isVisible(), false);
  window.destroy();
});
