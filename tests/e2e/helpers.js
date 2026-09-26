const { expect } = require('@playwright/test');

const exam = '/equipment/exam-1';

async function clearAppState(page) {
  await page.goto(exam + '/index.html');
  await page.evaluate(() => localStorage.clear());
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
