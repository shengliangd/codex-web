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

const readSidebarTouchDndPatch = () =>
  read("patches/webview-mobile-sidebar-touch-dnd.patch");

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
  assert.doesNotMatch(viewportCss, /data-codex-composer-root/);
});

test("mobile sidebar rows allow native vertical touch scrolling", async () => {
  const viewportCss = await read("assets/mobile-viewport.css");

  assert.match(viewportCss, /data-app-action-sidebar-scroll/);
  assert.match(
    viewportCss,
    /\[role="listitem"\]\.touch-none\s*\{[^}]*touch-action:\s*pan-y\s*!important/s,
  );
  assert.match(viewportCss, /-webkit-overflow-scrolling:\s*touch/);
  assert.match(viewportCss, /overscroll-behavior-y:\s*contain/);
});

test("mobile sidebar uses long-press touch dragging without replacing scrolling", async () => {
  const patch = await readSidebarTouchDndPatch();
  const prepareScript = await read("scripts/prepare_asar");

  assert.match(patch, /Ea as CodexWebMouseSensor/);
  assert.match(patch, /Oa as CodexWebTouchSensor/);
  assert.match(patch, /delay:\s*250/);
  assert.match(patch, /tolerance:\s*5/);
  assert.match(patch, /rh\(codexWebMouseSensor, s\)/);
  assert.match(
    patch,
    /rh\(codexWebTouchSensor, codexWebTouchSensorOptions\)/,
  );
  assert.match(patch, /^-  let l = rhe\(rh\(Ohe, s\), rh\(qme, c\)\),$/m);
  assert.doesNotMatch(patch, /^\+.*rh\(Ohe, s\)/m);
  assert.match(prepareScript, /webview-mobile-sidebar-touch-dnd\.patch/);
});

const runViewportScript = async ({ viewportHeight }) => {
  const source = await read("assets/mobile-viewport.js");
  const properties = new Map();
  const viewportListeners = new Map();
  const windowListeners = new Map();
  const documentListeners = new Map();
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
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    },
    documentElement: {
      style: {
        setProperty(name, value) {
          properties.set(name, value);
        },
      },
    },
  };

  vm.runInNewContext(source, {
    document,
    window,
  });
  return {
    documentListeners,
    properties,
    viewportListeners,
    visualViewport,
    windowListeners,
  };
};

test("mobile browsers use the complete visual viewport", async () => {
  const {
    documentListeners,
    properties,
    viewportListeners,
    visualViewport,
    windowListeners,
  } = await runViewportScript({
    viewportHeight: 600,
  });

  assert.equal(properties.get("--codex-mobile-viewport-height"), "600px");

  visualViewport.height = 400;
  viewportListeners.get("resize")();
  assert.equal(properties.get("--codex-mobile-viewport-height"), "400px");
  assert.equal(typeof documentListeners.get("DOMContentLoaded"), "function");
  assert.equal(typeof viewportListeners.get("scroll"), "function");
  assert.equal(typeof windowListeners.get("resize"), "function");
  assert.equal(typeof windowListeners.get("orientationchange"), "function");
  assert.equal(typeof windowListeners.get("pageshow"), "function");
});

test("an unavailable visual viewport falls back to the layout viewport", async () => {
  const { properties } = await runViewportScript({
    viewportHeight: 0,
  });

  assert.equal(properties.get("--codex-mobile-viewport-height"), "700px");
});
