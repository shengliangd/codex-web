import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("prepare reuses a validated versioned Desktop archive", async () => {
  const prepare = await read("scripts/prepare");

  assert.match(prepare, /CODEX_WEB_CACHE_DIR/);
  assert.match(prepare, /ChatGPT-darwin-arm64-\$APP_VERSION\.zip/);
  assert.match(prepare, /if ! unzip -tq "\$ARCHIVE_PATH"/);
  assert.match(prepare, /curl --fail --location --retry 3/);
  assert.match(prepare, /unzip -tq "\$PARTIAL_ARCHIVE"/);
  assert.match(prepare, /mv -f "\$PARTIAL_ARCHIVE" "\$ARCHIVE_PATH"/);
  assert.match(prepare, /HOSTED_CODEX_APP_ZIP="\$ARCHIVE_PATH"/);
  assert.doesNotMatch(prepare, /mktemp -d/);
});

test("prepare_asar removes old extracted bundles before unpacking", async () => {
  const prepareAsar = await read("scripts/prepare_asar");
  const cleanupIndex = prepareAsar.indexOf(
    "rm -rf -- scratch/ChatGPT.app scratch/asar",
  );
  const unzipIndex = prepareAsar.indexOf(
    'unzip -o "$HOSTED_CODEX_APP_ZIP" -d scratch/',
  );
  const extractIndex = prepareAsar.indexOf(
    'asar extract "scratch/ChatGPT.app/Contents/Resources/app.asar" "scratch/asar"',
  );

  assert.notEqual(cleanupIndex, -1);
  assert.ok(cleanupIndex < unzipIndex);
  assert.ok(unzipIndex < extractIndex);
});

test("prepare downloads only missing or corrupt archives and rejects invalid downloads", async () => {
  const { mkdtemp, mkdir, writeFile, rm, access } =
    await import("node:fs/promises");
  const { spawnSync } = await import("node:child_process");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const root = await mkdtemp(path.join(tmpdir(), "codex-archive-test-"));
  const cache = path.join(root, "cache");
  const archive = path.join(cache, "ChatGPT-darwin-arm64-26.901.41123.zip");
  const fixture = path.join(root, "fixture.zip");
  const capture = path.join(root, "build-input");
  const downloads = path.join(root, "downloads");
  try {
    await Promise.all([
      mkdir(cache),
      mkdir(path.join(root, "scripts")),
      mkdir(path.join(root, "bin")),
    ]);
    await writeFile(
      fixture,
      Buffer.from(
        "UEsDBBQAAAAAAAC+Nl3uQOUFBwAAAAcAAAAIAAAAdGVzdC50eHRmaXh0dXJlUEsBAhQDFAAAAAAAAL42Xe5A5QUHAAAABwAAAAgAAAAAAAAAAAAAAIABAAAAAHRlc3QudHh0UEsFBgAAAAABAAEANgAAAC0AAAAAAA==",
        "base64",
      ),
    );
    await writeFile(
      path.join(root, "scripts/prepare"),
      await read("scripts/prepare"),
    );
    await writeFile(
      path.join(root, "scripts/prepare_asar"),
      'printf "%s" "$HOSTED_CODEX_APP_ZIP" > "$BUILD_CAPTURE"\n',
    );
    await writeFile(
      path.join(root, "bin/curl"),
      '#!/usr/bin/env bash\nset -eu\nprintf "download\\n" >> "$DOWNLOAD_CAPTURE"\nwhile [[ "$1" != --output ]]; do shift; done\ncp "$DOWNLOAD_FIXTURE" "$2"\n',
      { mode: 0o755 },
    );
    const run = () =>
      spawnSync("bash", [path.join(root, "scripts/prepare")], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${root}/bin:${process.env.PATH}`,
          CODEX_WEB_CACHE_DIR: cache,
          DOWNLOAD_FIXTURE: fixture,
          DOWNLOAD_CAPTURE: downloads,
          BUILD_CAPTURE: capture,
        },
      });
    let result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(capture, "utf8"), archive);
    assert.equal(await readFile(downloads, "utf8"), "download\n");
    result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(downloads, "utf8"), "download\n");
    await writeFile(archive, "corrupt");
    result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(downloads, "utf8"), "download\ndownload\n");
    await rm(archive);
    await rm(capture);
    await writeFile(fixture, "invalid download");
    result = run();
    assert.notEqual(result.status, 0);
    await assert.rejects(access(archive), { code: "ENOENT" });
    await assert.rejects(access(`${archive}.part`), { code: "ENOENT" });
    await assert.rejects(access(capture), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
