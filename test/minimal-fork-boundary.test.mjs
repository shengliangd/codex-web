import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);

test("the fork keeps upstream app-host service forwarding", async () => {
  const [prepareAsar, shim] = await Promise.all([
    readFile(new URL("scripts/prepare_asar", repositoryRoot), "utf8"),
    readFile(new URL("src/browser/shim.ts", repositoryRoot), "utf8"),
  ]);

  await assert.rejects(
    access(new URL("patches/webview-app-host-services.patch", repositoryRoot)),
  );
  assert.doesNotMatch(prepareAsar, /webview-app-host-services/);
  assert.doesNotMatch(shim, /projectWritableRoots/);
  assert.doesNotMatch(shim, /enable_i18n/);
  assert.doesNotMatch(shim, /4114442250/);
  assert.match(shim, /1042620455/);
});
