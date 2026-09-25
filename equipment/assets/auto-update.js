(() => {
  const CHECK_COOLDOWN = 15000;
  const script = document.currentScript;
  const pageUrl = new URL(location.href);
  pageUrl.searchParams.delete("_mbu_reload");

  let baseline = null;
  let checking = false;
  let lastCheck = 0;

  function fingerprint(response) {
    return [
      response.headers.get("etag") || "",
      response.headers.get("last-modified") || "",
      response.headers.get("content-length") || ""
    ].join("|");
  }

  async function head() {
    const response = await fetch(pageUrl.href, {
      method: "HEAD",
      cache: "no-store",
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("Update check failed: " + response.status);
    return fingerprint(response);
  }

  async function establishBaseline() {
    try {
      baseline = await head();
    } catch {
      baseline = null;
    }
  }

  async function check(force = false) {
    const now = Date.now();
    if (checking || document.hidden || (!force && now - lastCheck < CHECK_COOLDOWN)) return;

    checking = true;
    lastCheck = now;
    try {
      const latest = await head();
      if (!baseline) {
        baseline = latest;
        return;
      }
      if (latest && latest !== baseline) {
        const reload = new URL(location.href);
        reload.searchParams.set("_mbu_reload", String(Date.now()));
        location.replace(reload.href);
      }
    } catch {
      // Offline or temporarily unreachable: retry on the next user-return event.
    } finally {
      checking = false;
    }
  }

  // Establish one tiny metadata baseline after the page becomes interactive.
  if (document.readyState === "complete") establishBaseline();
  else window.addEventListener("load", establishBaseline, { once: true });

  window.addEventListener("pageshow", event => {
    if (event.persisted) check(true);
  });
  window.addEventListener("focus", () => check());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
})();
