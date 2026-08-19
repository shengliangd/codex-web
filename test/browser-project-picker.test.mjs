import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the locked Desktop project picker uses the browser directory dialog", async () => {
  const source = await readFile(
    new URL("../src/browser/shim.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /electron-pick-workspace-root-option/);
  assert.match(source, /window\.dispatchEvent\(/);
  assert.match(source, /new MessageEvent\("message"/);
  assert.match(source, /workspace-root-option-picked/);
  assert.doesNotMatch(source, /projectWritableRoots/);
});

test("the browser folder picker stays above the Desktop project dialog", async () => {
  const source = await readFile(
    new URL("../src/browser/workspace-root-dialog.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /pointerEvents: "auto", zIndex: 100/);
  assert.match(source, /pointerEvents: "auto", zIndex: 101/);
  assert.equal(
    source.match(/onPointerDown=\{\(event\) => event\.stopPropagation\(\)\}/g)
      ?.length,
    2,
  );
});
