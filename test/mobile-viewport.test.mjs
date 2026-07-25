import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const readViewportSources = async () =>
  [
    await read("patches/webview-mobile-viewport.patch"),
    await read("assets/mobile-viewport.css"),
    await read("assets/mobile-viewport.js"),
  ].join("\n");

test("Android Chrome resizes the layout viewport when the keyboard opens", async () => {
  const viewportSources = await readViewportSources();

  assert.match(viewportSources, /interactive-widget=resizes-content/);
  assert.match(viewportSources, /viewport-fit=cover/);
  assert.match(viewportSources, /100dvh/);
});

test("the thread footer remains inside the safe viewport", async () => {
  const viewportSources = await readViewportSources();

  assert.match(viewportSources, /data-thread-scroll-footer/);
  assert.match(
    viewportSources,
    /max\(1rem,\s*env\(safe-area-inset-bottom,\s*0px\)\)/,
  );
});

test("visualViewport changes update the mobile shell height", async () => {
  const source = await read("assets/mobile-viewport.js");
  const properties = new Map();
  const viewportListeners = new Map();
  const windowListeners = new Map();
  const visualViewport = {
    height: 600,
    addEventListener(type, listener) {
      viewportListeners.set(type, listener);
    },
  };
  const window = {
    innerHeight: 700,
    visualViewport,
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    requestAnimationFrame(callback) {
      callback();
    },
  };
  const document = {
    documentElement: {
      style: {
        setProperty(name, value) {
          properties.set(name, value);
        },
      },
    },
  };

  vm.runInNewContext(source, { document, window });
  assert.equal(properties.get("--codex-mobile-viewport-height"), "600px");

  visualViewport.height = 400;
  viewportListeners.get("resize")();
  assert.equal(properties.get("--codex-mobile-viewport-height"), "400px");
  assert.equal(typeof viewportListeners.get("scroll"), "function");
  assert.equal(typeof windowListeners.get("resize"), "function");
});
