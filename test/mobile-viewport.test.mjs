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

test("the bundled app shell follows the corrected root height", async () => {
  const viewportCss = await read("assets/mobile-viewport.css");

  assert.match(
    viewportCss,
    /#root\s*>\s*div\s*\{[^}]*height:\s*100%\s*!important/s,
  );
  assert.match(
    viewportCss,
    /data-codex-mobile-platform=["']android["'][^\{]*\{[^}]*translate:\s*0\s+-1rem/s,
  );
});

const runViewportScript = async ({ userAgent, viewportHeight }) => {
  const source = await read("assets/mobile-viewport.js");
  const properties = new Map();
  const viewportListeners = new Map();
  const windowListeners = new Map();
  const visualViewport = {
    height: viewportHeight,
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
      dataset: {},
      style: {
        setProperty(name, value) {
          properties.set(name, value);
        },
      },
    },
  };

  vm.runInNewContext(source, {
    document,
    navigator: { userAgent },
    window,
  });
  return {
    getPlatform() {
      return document.documentElement.dataset.codexMobilePlatform;
    },
    properties,
    viewportListeners,
    visualViewport,
    windowListeners,
  };
};

test("Android reserves its edge-to-edge system navigation area", async () => {
  const {
    getPlatform,
    properties,
    viewportListeners,
    visualViewport,
    windowListeners,
  } = await runViewportScript({
    userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 7) Chrome/138.0",
    viewportHeight: 600,
  });

  assert.equal(properties.get("--codex-mobile-viewport-height"), "568px");
  assert.equal(getPlatform(), "android");

  visualViewport.height = 400;
  viewportListeners.get("resize")();
  assert.equal(properties.get("--codex-mobile-viewport-height"), "368px");
  assert.equal(typeof viewportListeners.get("scroll"), "function");
  assert.equal(typeof windowListeners.get("resize"), "function");
});

test("non-Android browsers use the full visual viewport height", async () => {
  const { getPlatform, properties } = await runViewportScript({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)",
    viewportHeight: 600,
  });

  assert.equal(properties.get("--codex-mobile-viewport-height"), "600px");
  assert.equal(getPlatform(), undefined);
});
