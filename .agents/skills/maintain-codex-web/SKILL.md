---
name: maintain-codex-web
description: Maintain, debug, build, test, deploy, or update this codex-web fork. Use for changes involving the pinned Codex Desktop bundle, Webview patches, browser/Electron IPC shims, project and session behavior, mobile interaction, E-ink or Appearance themes, Nginx/HTTPS/auth/cache/compression, app-server startup, production deployment, or upstream synchronization.
---

# Maintain Codex Web

Keep this fork a thin browser host for the pinned upstream Codex Desktop app. Prefer the smallest change that restores an upstream workflow through the existing browser bridge.

Read [references/runtime-and-deployment.md](references/runtime-and-deployment.md) before changing extracted Desktop bundles, persisted settings, project/session behavior, Nginx, or production deployment.

Read [references/eink-ui.md](references/eink-ui.md) before changing the E-ink theme or its interaction styling.

## Preserve The Fork Boundary

- Treat Nginx/HTTPS, mobile behavior, the browser-hosted runtime, and the single Desktop version lock as the intended fork surface.
- Keep only narrowly required browser adaptations such as the host folder picker.
- Do not reintroduce forced i18n, remote control, remote connections, `projectWritableRoots`, or broad app-host overrides to compensate for a version mismatch.
- Reuse upstream events, settings, schemas, and state machines. Do not create a parallel LocalStorage mode when an upstream native setting can represent the feature.
- Preserve unrelated dirty-worktree changes. Commit only when the user asks.

## Follow The Runtime Before Editing

1. Inspect `git status`, recent commits, `CODEX_DESKTOP_VERSION`, and the relevant tests.
2. Classify the behavior by layer: authored browser/server code, patched Webview code, Desktop main/shared/worker bundle, app-server socket, or Nginx/static deployment.
3. Trace imports from the actual startup path. `src/server/main.ts` loads `main-*.js`; that main bundle may import a shared `src-*.js` containing the effective implementation.
4. Search the entire extracted app for the semantic key, event, setting key, or enum value. Never stop at the first matching bundle.
5. For persisted settings, enumerate every validator/schema copy in Webview, main shared chunks, ordinary workers, and snapshot workers before editing.

Use hash-independent discovery commands where possible:

```bash
rg -l 'appearanceLightCodeThemeId' scratch/asar --glob '*.js'
rg -n 'require\(`\./src-|set-setting|workspace-root-option-picked' \
  scratch/asar/.vite/build/main-*.js scratch/asar --glob '*.js'
```

## Choose The Least Invasive Change

- Change `src/browser` or `src/server` when browser hosting itself lacks an Electron capability.
- Add an `assets/` file plus a focused patch when the upstream Webview needs a presentation or registration change.
- Patch Desktop bundles only when the real main-process contract or schema requires it.
- Keep compatibility shims inert. Remove diagnostic sidecars, beacons, console hooks, and temporary Nginx routes before completion.
- For the folder picker, preserve the upstream pick event and use the existing host dialog. Do not synthesize writable-root policy.
- For mobile drag/scroll conflicts, preserve native vertical scrolling and require deliberate long-press drag activation.

## Maintain The Patch Pipeline

- Put durable upstream edits in `patches/`; do not rely on hand-edited `scratch/` output.
- Register every patch explicitly in `scripts/prepare_asar` in dependency order.
- Remember that `prepare_asar` derives its Prettier input from every `+++ b/...` patch header. Include every patched file header so a fresh compressed bundle is formatted before patching.
- Copy durable standalone resources from `assets/`; `scripts/prepare_asar` already copies them into the Webview.
- Add a focused test that locks the cross-layer invariant, including the expected number or set of duplicated schemas when duplication is unavoidable.
- Validate a patch against a freshly extracted pinned Desktop bundle, not only the current `scratch/` tree.

Use the formal clean build entry:

```bash
npm run prepare
```

Do not use bare `npm run build` unless `HOSTED_CODEX_APP_ZIP` is intentionally supplied; `prepare:asar` requires that variable. The formal `prepare` command reuses a validated, versioned Desktop archive from `${CODEX_WEB_CACHE_DIR:-${XDG_CACHE_HOME:-$HOME/.cache}/codex-web}`. It downloads the version in `CODEX_DESKTOP_VERSION` only when that cache entry is missing or invalid, then builds browser and server output. Do not delete this cache between ordinary changes.

## Verify In Proportion To The Change

Run at least:

```bash
npm test
git diff --check
```

Run `npm run prepare` for any change to patches, assets copied into the Webview, Desktop version, or build preparation. If sandbox restrictions break child-process tests or writes to extracted files, request elevation instead of changing paths or using a repo-local workaround.

Do not call a user-facing workflow fixed solely because:

- static files contain the expected text;
- tests pass;
- Vite and TypeScript compile;
- the backend returns HTTP 200; or
- one of several matching worker bundles was patched.

Exercise the actual workflow. For a setting, confirm selection remains applied and persists after reload. For projects, confirm the folder opens and existing sessions appear through the reused app-server. For mobile interaction, verify wheel, touch scroll, and long-press drag separately.

## Deploy Both Runtime Halves

- Treat `/srv/codex-web/webview` as static production output and the running `npm start` process as a separate runtime.
- Stage and precompress a complete Webview directory before atomically switching it. Keep one explicit rollback directory when practical.
- Regenerate `.gz` siblings and permissions. Ensure locally patched upstream-named bundles revalidate instead of receiving immutable caching.
- Restart the backend whenever `.vite/build`, `src/server`, Electron shims, or server startup code changes. Static replacement alone cannot reload Desktop main-process schemas.
- Discover the current service process or tmux pane; do not hard-code a historical PID or pane ID.
- Verify the new PID, `http://127.0.0.1:8214/`, the HTTPS listener, deployed file equality, gzip siblings, and absence of diagnostics.

Report what was actually verified and explicitly leave browser/device verification to the user when it cannot be exercised locally.
