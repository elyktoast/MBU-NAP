(function () {
  const buildPattern = /(?:<!--|\/\*)\s*MBU_BUILD:([A-Za-z0-9._-]+)/;
  const build = html => html.match(buildPattern)?.[1];
  const current = build(document.documentElement.innerHTML);
  if (!current) return;

  let checking = false;
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const url = new URL(location.href);
      url.searchParams.delete('_mbu_reload');
      url.searchParams.set('_mbu_update_check', String(Date.now()));
      const response = await fetch(url.href, { cache: 'no-store' });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return;

      const latestPage = build(await response.text());
      let changed = !!(latestPage && latestPage !== current);
      if (!changed) {
        for (const watch of window.MBUUpdateWatch || []) {
          try {
            const watched = new URL(watch.url, location.href);
            watched.searchParams.set('_mbu_update_check', String(Date.now()));
            const result = await fetch(watched.href, { cache: 'no-store' });
            if (!result.ok || !result.headers.get('content-type')?.includes('text/html')) continue;
            const latest = build(await result.text());
            if (latest && latest !== watch.build) { changed = true; break; }
          } catch (error) {
            // One unavailable bank must not stop checks for the other banks.
          }
        }
      }

      if (changed) {
        const reload = new URL(location.href);
        reload.searchParams.delete('_mbu_update_check');
        reload.searchParams.set('_mbu_reload', String(Date.now()));
        location.replace(reload.href);
      }
    } catch (error) {
      // Offline tabs retry at the next interval or when they regain focus.
    } finally {
      checking = false;
    }
  }

  setTimeout(check, 8000);
  setInterval(check, 60000);
  window.addEventListener('pageshow', event => { if (event.persisted) check(); });
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
})();
