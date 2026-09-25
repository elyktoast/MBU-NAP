(() => {
  const buildPattern = /(?:<!--|\/\*)\s*MBU_BUILD:([A-Za-z0-9._-]+)/;
  const assetPattern = /(?:src|href)=["'][^"']+\?v=([A-Za-z0-9._-]+)["']/g;

  function signature(html) {
    const build = html.match(buildPattern)?.[1] || "";
    const versions = [...html.matchAll(assetPattern)].map(match => match[0]).sort();
    return [build, ...versions].join("|");
  }

  const current = signature(document.documentElement.innerHTML);
  if (!current) return;

  let checking = false;
  let lastCheck = 0;

  async function check(force = false) {
    const now = Date.now();
    if (checking || document.hidden || (!force && now - lastCheck < 30000)) return;

    checking = true;
    lastCheck = now;

    try {
      const url = new URL(location.href);
      url.searchParams.delete("_mbu_reload");
      const response = await fetch(url.href, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return;

      const latest = signature(await response.text());
      if (latest && latest !== current) {
        const reload = new URL(location.href);
        reload.searchParams.set("_mbu_reload", String(Date.now()));
        location.replace(reload.href);
      }
    } catch {
      // Stay quiet while offline; the next focus/visibility event retries.
    } finally {
      checking = false;
    }
  }

  window.addEventListener("pageshow", event => {
    if (event.persisted) check(true);
  });
  window.addEventListener("focus", () => check());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) check();
  });
})();
