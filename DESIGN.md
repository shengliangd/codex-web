# Browser Layout Contract

## Direction

codex-web preserves the bundled Codex Desktop interface. Browser patches may adapt viewport ownership, safe areas, and platform chrome, but must not redesign product controls, typography, color, or spacing.

## Viewport Ownership

- The browser shell fills the current layout viewport with `100dvh`.
- Android Chrome opts into `interactive-widget=resizes-content` so the software keyboard resizes the layout viewport.
- `visualViewport` is a compatibility fallback for browsers whose layout viewport does not follow browser chrome or the keyboard.
- Android's edge-to-edge browser viewport reserves a 32 CSS px navigation fallback because some devices report zero for the bottom safe-area inset.
- The bundled app shell's inline `100vh` height follows the corrected root height on mobile.
- The document shell does not scroll; the bundled thread scroller remains the only vertical scroll owner.

## Safe Areas

- The viewport uses `viewport-fit=cover`.
- The thread footer reserves `max(1rem, env(safe-area-inset-bottom))`; the shell-level Android fallback also protects the new-task composer.
- Android composers keep one additional spacing unit above the protected system-navigation boundary.
- Composer controls must remain fully visible at 375 px width and at a 400 px keyboard-reduced height.

## Existing Primitives

No new visual primitives are introduced. The existing thread composer, microphone, approval control, and send button retain their bundled states.

## Verification

- Android Chrome/Pixel viewport, 390x664, and 390x400 keyboard-reduced viewport on both the new-task and thread surfaces.
- iPhone viewport as a compatibility check.
- 768 and 1280 px to guard the bundled desktop layout.
- No horizontal document overflow; every composer surface and interactive control remains inside the unobscured viewport.

## Accepted Debt

The renderer is supplied as versioned, precompiled Codex Desktop assets. Browser compatibility therefore remains a small patch applied during `prepare_asar` and must be rebased when upstream asset structure changes.
