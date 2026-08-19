import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

test("the Codex Desktop version has one tracked source of truth", async () => {
  const [version, prepare, nix] = await Promise.all([
    readFile(new URL("CODEX_DESKTOP_VERSION", repositoryRoot), "utf8"),
    readFile(new URL("scripts/prepare", repositoryRoot), "utf8"),
    readFile(new URL("default.nix", repositoryRoot), "utf8"),
  ]);

  assert.match(version.trim(), /^\d+\.\d+\.\d+$/);
  assert.match(prepare, /CODEX_DESKTOP_VERSION/);
  assert.match(nix, /builtins\.readFile \.\/CODEX_DESKTOP_VERSION/);
  assert.doesNotMatch(prepare, /APP_VERSION="\d/);
  assert.doesNotMatch(nix, /appVersion = "\d/);
});
