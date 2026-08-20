import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

const assertMonochrome = (value) => {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
    assert.equal(value.slice(1, 3), value.slice(3, 5), value);
    assert.equal(value.slice(3, 5), value.slice(5, 7), value);
  }
};

test("E-ink is registered as a native light theme", async () => {
  const patch = await read("patches/webview-eink-theme.patch");
  const viewportPatch = await read("patches/webview-mobile-viewport.patch");
  const prepareAsar = await read("scripts/prepare_asar");
  const compatibilityShim = await read("assets/eink-theme.js");

  assert.equal(
    patch.match(/EINK: `eink`/g)?.length,
    4,
    "all Desktop settings schemas and the Webview must accept the E-ink theme ID",
  );
  assert.match(patch, /--- a\/\.vite\/build\/worker\.js/);
  assert.match(patch, /--- a\/\.vite\/build\/src-Ct4P_yu5\.js/);
  assert.match(
    patch,
    /--- a\/\.vite\/build\/child-process-snapshot-worker\.js/,
  );
  assert.match(patch, /D\(r\.EINK, `E-ink`/);
  assert.match(patch, /import\(`\.\.\/eink-light\.js`\)/);
  assert.match(patch, /kn\.lightCodeThemeId/);
  assert.match(patch, /classList\.toggle\(`electron-eink`/);
  assert.match(viewportPatch, /eink-theme\.css/);
  assert.doesNotMatch(viewportPatch, /eink-theme\.js/);
  assert.doesNotMatch(prepareAsar, /rm -f scratch\/asar\/webview\/eink-theme\.js/);
  assert.match(compatibilityShim, /Compatibility shim/);
  assert.doesNotMatch(
    compatibilityShim,
    /localStorage|MutationObserver|data-codex-web-theme|workspace-root-option-picked/,
  );
});

test("the native E-ink theme is opaque, high-contrast, and monochrome", async () => {
  const theme = await import(
    new URL(`../assets/eink-light.js?test=${Date.now()}`, import.meta.url)
  );

  assert.equal(theme.type, "light");
  assert.equal(theme.name, "E-ink");
  assert.equal(theme.chromeTheme.opaqueWindows, true);
  assert.equal(theme.chromeTheme.contrast, 100);
  assert.equal(theme.chromeTheme.surface, "#ffffff");
  assert.equal(theme.chromeTheme.ink, "#101010");
  assert.equal(theme.colors["activityBar.background"], "#ffffff");
  assert.equal(theme.colors["editorGroupHeader.tabsBackground"], "#ffffff");
  assert.equal(theme.colors["sideBar.background"], "#ffffff");

  for (const value of Object.values(theme.colors)) assertMonochrome(value);
  for (const value of Object.values(theme.chromeTheme.semanticColors)) {
    assertMonochrome(value);
  }
  for (const rule of theme.settings) assertMonochrome(rule.settings.foreground);
});

test("E-ink hardening removes translucent materials and motion", async () => {
  const css = await read("assets/eink-theme.css");

  assert.match(css, /:root\.electron-eink/);
  assert.doesNotMatch(css, /data-codex-web-theme/);
  assert.match(css, /-webkit-backdrop-filter:\s*none\s*!important/);
  assert.match(css, /backdrop-filter:\s*none\s*!important/);
  assert.match(css, /animation-duration:\s*0\.001ms\s*!important/);
  assert.match(css, /transition-duration:\s*0\.001ms\s*!important/);
  assert.match(css, /\[cmdk-root\]/);
  assert.match(
    css,
    /background-color:\s*var\(--color-token-dropdown-background\)/,
  );
  assert.match(css, /--color-token-side-bar-background:\s*#ffffff/);
  assert.match(css, /--color-token-input-border:\s*#000000/);
  assert.match(css, /\[data-app-action-sidebar-scroll\]/);
  assert.match(css, /border-inline-end:\s*1px solid #000000/);
  assert.match(css, /\[data-codex-composer-root\]/);
  assert.match(css, /border:\s*1px solid #000000\s*!important/);
  assert.match(css, /outline:\s*2px solid #000000\s*!important/);
});
