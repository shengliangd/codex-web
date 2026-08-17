(() => {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let scheduled = false;

  const updateHeight = () => {
    const visualHeight = viewport?.height;
    const height =
      typeof visualHeight === "number" && visualHeight > 0
        ? visualHeight
        : window.innerHeight;
    root.style.setProperty(
      "--codex-mobile-viewport-height",
      `${Math.max(0, Math.round(height))}px`,
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
  document.addEventListener("DOMContentLoaded", scheduleUpdate, {
    once: true,
  });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("orientationchange", scheduleUpdate, {
    passive: true,
  });
  window.addEventListener("pageshow", scheduleUpdate, { passive: true });
  viewport?.addEventListener("resize", scheduleUpdate, { passive: true });
  viewport?.addEventListener("scroll", scheduleUpdate, { passive: true });
})();
