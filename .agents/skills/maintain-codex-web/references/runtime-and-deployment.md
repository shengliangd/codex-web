# Runtime And Deployment Reference

## Runtime Map

| Layer | Durable source | Generated or deployed form | Reload requirement |
| --- | --- | --- | --- |
| Browser bridge | `src/browser/` | `scratch/asar/webview/assets/preload.js` | Rebuild and reload page |
| Host HTTP/IPC bridge | `src/server/` | compiled server JS | Rebuild and restart backend |
| Webview adaptation | `assets/`, `patches/webview-*.patch` | `scratch/asar/webview/` | Clean prepare, deploy static files, reload page |
| Desktop main process | patches targeting `.vite/build/main-*` or shared `src-*` | `scratch/asar/.vite/build/` | Clean prepare and restart backend |
| Desktop workers | patches targeting `worker.js`, snapshot workers, or worker chunks | `scratch/asar/.vite/build/` | Clean prepare and restart backend |
| Codex conversations | app-server and `CODEX_HOME` | Unix socket selected by `scripts/start` | Reuse the same socket/home |
| HTTPS/static edge | `scripts/install-https-proxy`, `examples/nginx/` | `/etc/nginx`, `/srv/codex-web/webview` | Deploy static files; reload Nginx only for config changes |

Bundle hashes belong to the pinned Desktop version and may change on upgrade. Rediscover filenames and import edges after changing `CODEX_DESKTOP_VERSION`.

## Thin-Fork Baseline

The repository deliberately avoids broad feature overrides. Preserve the invariant tested by `test/minimal-fork-boundary.test.mjs`: no forced i18n, no `projectWritableRoots`, and no obsolete app-host-services patch. Existing CLI conversations depend on reusing the host's app-server state, not on enabling remote-connection features.

The project picker is a browser replacement for an unavailable native folder dialog. It should emit the upstream `workspace-root-option-picked` flow after the user chooses a host path. Its overlay must sit above the Desktop dialog and bypass `react-remove-scroll` capture for wheel and touch events within the host dialog.

## Diagnosing A Flash Or Rollback

A menu closing is not proof of a renderer crash. Theme and settings callbacks may optimistically update UI, await an asynchronous persistence call, then restore the previous value when validation fails.

Use this sequence:

1. Confirm whether the renderer reconnects, reloads, or logs an unhandled error.
2. Trace the selection callback through seed/theme loading and the `set-setting` request.
3. Search the full extracted app for the setting key and enum, including minified one-line chunks.
4. Inspect the `main-*.js` `require(...)` graph to identify the shared chunk used by the real startup path.
5. Patch all schema copies and add a test that asserts the complete set, not merely one occurrence.
6. Restart the backend and test persistence after reload.

The E-ink incident required four coordinated registrations: Webview, Desktop main shared chunk, ordinary worker, and snapshot worker. Patching only `worker.js` produced a healthy service that still rejected the setting.

An already loaded ES module remains in the current SPA even when Nginx sends `Cache-Control: no-cache`. A real page reload or a changed module URL is required before concluding that new instrumentation or bundle code executed.

## Clean Build Checklist

1. Confirm `CODEX_DESKTOP_VERSION` is the intended single source of truth.
2. Run `npm test` and `git diff --check` before the expensive build.
3. Run `npm run prepare`; reuse its validated versioned archive cache and monitor any required download, extraction, every patch hunk, Vite, and `tsc`.
4. Confirm semantic changes in all expected generated bundles with `rg`.
5. Run the focused test and full test suite again when generation could affect behavior.

`npm run build` calls `prepare:asar` directly and fails without `HOSTED_CODEX_APP_ZIP`. Do not interpret that environment error as a code failure or bypass the pinned download with an arbitrary Desktop archive.

`scripts/prepare` stores the pinned archive under the user cache directory (or `CODEX_WEB_CACHE_DIR`) and validates it with `unzip -tq` before reuse. Keep the archive version in its filename, download through a partial file, and move it into place only after validation so repeated clean builds do not redownload the large Desktop bundle.

## Production Checklist

### Static Webview

1. Create a new directory beside `/srv/codex-web/webview`.
2. Copy the complete generated Webview into it.
3. Create gzip siblings for eligible JS, CSS, JSON, SVG, and WASM files; set readable permissions.
4. Atomically move the current directory to a named backup and the staged directory into place.
5. Confirm the compatibility shim is inert and no debug endpoint strings remain.

Nginx immutable caching is correct for true hashed upstream assets. It is wrong for locally patched files whose upstream filename stays constant. Keep exact `no-cache` locations for those bundles and `preload.js`. Compression must be checked both in configuration and via generated `.gz` files.

### Backend

Restart `npm start` when generated Desktop main/worker bundles or compiled server code change. Discover the live process from the actual service manager or tmux pane. After restart, verify a new PID and HTTP 200 on port 8214. An unauthenticated HTTPS 401 can be a healthy result when Basic Auth is enabled.

### Logs And Diagnostics

- Correlate client IP, timestamps, asset fetches, WebSocket reconnects, and runtime errors.
- Treat `[electron-main-stub]` output as compatibility tracing, not proof of a fault.
- Fastify uses `logger: false`; absence of request logs is expected.
- Do not claim database-log filtering from unrelated Nginx access-log rules. Inspect the actual producer and filter path.
- Remove temporary global error hooks, console interception, beacons, debug Nginx routes, and debug gzip copies after diagnosis.

## Completion Standard

State separately:

- source tests and diff checks;
- clean pinned build result;
- generated-bundle inspection;
- static deployment and compression;
- backend restart and health;
- actual browser/mobile workflow verification; and
- whether changes were committed.

Do not collapse these into a generic "deployed successfully" claim.
