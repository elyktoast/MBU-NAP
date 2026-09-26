(() => {
  const CHECK_COOLDOWN = 120000;
  const BUILD_CACHE_KEY = 'mbu_build_manifest_v1';
  const script = document.currentScript;
  const manifestUrl = new URL('../build.json', script?.src || location.href);
  let baseline = sessionStorage.getItem(BUILD_CACHE_KEY) || null;
  let checking = false;
  let lastCheck = 0;

  async function readBuild() {
    const response = await fetch(manifestUrl.href + '?t=' + Date.now(), {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('Update check failed: ' + response.status);
    const data = await response.json();
    if (!data || typeof data.build !== 'string' || !data.build) throw new Error('Invalid build manifest');
    return data.build;
  }

  async function establishBaseline() {
    if (baseline) return;
    try { baseline = await readBuild(); sessionStorage.setItem(BUILD_CACHE_KEY, baseline); } catch {}
  }

  async function check(force = false) {
    const now = Date.now();
    if (checking || document.hidden || (!force && now - lastCheck < CHECK_COOLDOWN)) return;
    checking = true;
    lastCheck = now;
    try {
      const latest = await readBuild();
      if (!baseline) { baseline = latest; sessionStorage.setItem(BUILD_CACHE_KEY, baseline); return; }
      if (latest !== baseline) {
        const reload = new URL(location.href);
        if (reload.searchParams.get('_mbu_reload') === latest) {
          baseline = latest;
          sessionStorage.setItem(BUILD_CACHE_KEY, baseline);
          return;
        }
        reload.searchParams.set('_mbu_reload', latest);
        location.replace(reload.href);
      }
    } catch {
      // Update checks are best-effort and never block quiz rendering.
    } finally {
      checking = false;
    }
  }

  const prime = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(establishBaseline, { timeout: 1500 });
    else setTimeout(establishBaseline, 250);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prime, { once: true });
  else prime();

  window.addEventListener('pageshow', event => { if (event.persisted) check(true); });
  window.addEventListener('focus', () => check());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();