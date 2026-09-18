import assert from "node:assert/strict";
import test from "node:test";

globalThis.__CODEX_SHIM_VALUES__ = {
  appPath: "/tmp/codex-web-app",
  version: "test-version",
};

const { app, BrowserWindow, ipcMain } =
  await import("../src/server/electron/index.js");

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

test("browser windows route replies independently and clean up on disconnect", async () => {
  const first = new BrowserWindow({ show: false });
  const second = new BrowserWindow({ show: false });
  const bridge = globalThis.__codexElectronIpcBridge;
  const previousSend = bridge.sendToRenderer;
  const replies = [];
  bridge.sendToRenderer = (id, message) => replies.push({ id, message });
  let destroyed = 0;
  first.webContents.on("destroyed", () => destroyed++);
  ipcMain.handle("test:tab-reply", (event, value) => {
    event.reply("test:reply", value);
    return event.sender.id;
  });
  try {
    assert.equal(await Promise.resolve(first), first);
    assert.equal(await Promise.resolve(first.webContents), first.webContents);
    for (const window of [first, second]) {
      assert.equal(
        await bridge.handleRendererInvoke(
          "test:tab-reply",
          [window.id],
          window.id,
        ),
        window.webContents.id,
      );
    }
    assert.deepEqual(
      replies.map(({ id }) => id),
      [first.webContents.id, second.webContents.id],
    );
    first.destroy();
    first.destroy();
    assert.equal(destroyed, 1);
    assert.equal(BrowserWindow.fromId(first.id), null);
    assert.equal(BrowserWindow.fromId(second.id), second);
    await assert.rejects(
      bridge.handleRendererInvoke("test:tab-reply", [], first.id),
      /closed/,
    );
    assert.equal(
      await bridge.handleRendererInvoke("test:tab-reply", [], second.id),
      second.webContents.id,
    );
  } finally {
    first.destroy();
    second.destroy();
    ipcMain.removeHandler("test:tab-reply");
    bridge.sendToRenderer = previousSend;
  }
});
