(() => {
  const CHECK_COOLDOWN = 20000;
  const pageUrl = new URL(location.href);
  pageUrl.searchParams.delete("_mbu_reload");

  let baseline = null;
  let checking = false;
  let lastCheck = 0;

  const fingerprint = response => [
    response.headers.get("etag") || "",
    response.headers.get("last-modified") || "",
    response.headers.get("content-length") || ""
  ].join("|");

  async function readFingerprint() {
    const response = await fetch(pageUrl.href, {
      method: "HEAD",
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("Update check failed: " + response.status);
    return fingerprint(response);
  }

  async function establishBaseline() {
    if (baseline) return;
    try { baseline = await readFingerprint(); } catch {}
  }

  async function check(force = false) {
    const now = Date.now();
    if (checking || document.hidden || (!force && now - lastCheck < CHECK_COOLDOWN)) return;
    checking = true;
    lastCheck = now;
    try {
      const latest = await readFingerprint();
      if (!baseline) { baseline = latest; return; }
      if (latest && latest !== baseline) {
        const reload = new URL(location.href);
        reload.searchParams.set("_mbu_reload", String(now));
        location.replace(reload.href);
      }
    } catch {
      // A failed metadata check never blocks the page. Retry on the next return event.
    } finally {
      checking = false;
    }
  }

  // Do not make update detection compete with initial page parsing/rendering.
  const prime = () => {
    if ("requestIdleCallback" in window) requestIdleCallback(establishBaseline, { timeout: 1500 });
    else setTimeout(establishBaseline, 250);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prime, { once: true });
  else prime();

  window.addEventListener("pageshow", event => { if (event.persisted) check(true); });
  window.addEventListener("focus", () => check());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
})();
