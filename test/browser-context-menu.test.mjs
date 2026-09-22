import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("browser bridge selects web menus without altering other capabilities", async () => {
  const source = await readFile(
    new URL("../src/browser/shim.ts", import.meta.url),
    "utf8",
  );
  const bridgeSource = source.slice(
    source.indexOf("export const contextBridge ="),
    source.indexOf("export const webUtils ="),
  );
  const { outputText } = ts.transpileModule(bridgeSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const sandbox = {
    exports: {},
    window: {},
    isRecord: (value) => typeof value === "object" && value !== null,
  };
  vm.runInNewContext(outputText, sandbox);
  const { exposeInMainWorld } = sandbox.exports.contextBridge;
  const showContextMenu = () => assert.fail("native menus must not be invoked");
  const invoke = () => "preserved";
  const upstreamApi = Object.freeze({ showContextMenu, invoke });

  exposeInMainWorld("electronBridge", upstreamApi);
  assert.equal(sandbox.window.electronBridge.showContextMenu, undefined);
  assert.equal(sandbox.window.electronBridge.invoke, invoke);
  assert.equal(sandbox.window.electronBridge.invoke(), "preserved");
  assert.equal(upstreamApi.showContextMenu, showContextMenu);

  exposeInMainWorld("anotherBridge", upstreamApi);
  assert.equal(sandbox.window.anotherBridge, upstreamApi);
  exposeInMainWorld("codexWindowType", "main");
  assert.equal(sandbox.window.codexWindowType, "main");
});
