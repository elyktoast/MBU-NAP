const { expect } = require('@playwright/test');

const exam = '/equipment/exam-1';

async function clearAppState(page) {
  await page.addInitScript(() => {
    const now=Math.floor(Date.now()/1000);
    localStorage.setItem('mbu_supabase_session_v1',JSON.stringify({
      access_token:'e2e-access',
      refresh_token:'e2e-refresh',
      expires_at:now+3600,
      user:{id:'00000000-0000-0000-0000-000000000001',email:'e2e@example.com'}
    }));
  });
  await page.goto(exam + '/index.html');
  await page.evaluate(() => window.MBUPageReady);
  await page.evaluate(() => {
    const auth=localStorage.getItem('mbu_supabase_session_v1');
    localStorage.clear();sessionStorage.clear();
    if(auth)localStorage.setItem('mbu_supabase_session_v1',auth);
  });
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

module.exports = { exam, clearAppState, collectPageErrors, waitForStudio, storageJSON };
