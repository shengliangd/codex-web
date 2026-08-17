import assert from "node:assert/strict";
import test from "node:test";

globalThis.__CODEX_SHIM_VALUES__ = {
  appPath: "/tmp/codex-web-app",
  version: "test-version",
};

const { app, BrowserWindow } = await import("../src/server/electron/index.js");

test("Electron app metadata points at the extracted upstream app", () => {
  assert.equal(app.getAppPath(), "/tmp/codex-web-app");
  assert.equal(app.getVersion(), "test-version");
});

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
