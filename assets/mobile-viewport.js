(() => {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let scheduled = false;

  const updateHeight = () => {
    const height = viewport?.height ?? window.innerHeight;
    root.style.setProperty(
      "--codex-mobile-viewport-height",
      `${Math.round(height)}px`,
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
