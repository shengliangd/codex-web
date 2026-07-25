(() => {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  const androidEdgeToEdgeBottomInset = /Android/i.test(navigator.userAgent)
    ? 32
    : 0;
  if (androidEdgeToEdgeBottomInset) {
    root.dataset.codexMobilePlatform = "android";
  }
  let scheduled = false;

  const updateHeight = () => {
    const height = viewport?.height ?? window.innerHeight;
    root.style.setProperty(
      "--codex-mobile-viewport-height",
      `${Math.max(0, Math.round(height - androidEdgeToEdgeBottomInset))}px`,
    );
  };

  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      updateHeight();
    });
  };

  scheduleUpdate();
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  viewport?.addEventListener("resize", scheduleUpdate, { passive: true });
  viewport?.addEventListener("scroll", scheduleUpdate, { passive: true });
})();
