const { expect } = require('@playwright/test');

const exam = '/equipment/exam-1';

async function clearAppState(page) {
  await page.route('https://xqyasyambwdyhsjkftqu.supabase.co/rest/v1/rpc/snar_has_current_legal_acceptance', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'true' })
  );
  await page.addInitScript(() => {
    const now=Math.floor(Date.now()/1000);
    localStorage.setItem('snar_legal_acceptance_v2', JSON.stringify({version:'2026-09-27-v2',acceptedAt:new Date().toISOString()}));
  });
  await page.goto(exam + '/index.html');
  await page.evaluate(() => window.MBUPageReady);
  await page.evaluate(() => {
    const legal=localStorage.getItem('snar_legal_acceptance_v2');
    localStorage.clear();sessionStorage.clear();
    if(legal)localStorage.setItem('snar_legal_acceptance_v2',legal);
  });
}

async function seedSignedIn(page,email='e2e@example.com') {
  await page.addInitScript(({email}) => {
    const now=Math.floor(Date.now()/1000);
    localStorage.setItem('mbu_supabase_session_v1',JSON.stringify({
      access_token:'e2e-access',
      refresh_token:'e2e-refresh',
      expires_at:now+3600,
      user:{id:'00000000-0000-0000-0000-000000000001',email}
    }));
  }, {email});
}

function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function waitForStudio(page) {
  await expect.poll(
    async () => {
      try {
        return await page.evaluate(() => typeof ALL_BY_UID !== 'undefined' ? ALL_BY_UID.size : 0);
      } catch (error) {
        if (/Execution context was destroyed|most likely because of a navigation/i.test(String(error))) return 0;
        throw error;
      }
    },
    { timeout: 20000 }
  ).toBeGreaterThan(0);
}

async function storageJSON(page, key) {
  return page.evaluate(k => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : null;
  }, key);
}

module.exports = { exam, clearAppState, seedSignedIn, collectPageErrors, waitForStudio, storageJSON };
