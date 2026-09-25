const { test, expect } = require('@playwright/test');

const exam = '/equipment/exam-1';

async function clearAppState(page) {
  await page.goto(exam + '/index.html');
  await page.evaluate(() => localStorage.clear());
}

test.describe('canonical quiz regression', () => {
  test.beforeEach(async ({ page }) => clearAppState(page));

  test('Bank 1 starts, answers, advances, and survives reload', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await expect(page.locator('#overall')).toContainText('/ 500 completed');

    const start = page.locator('#cards button').filter({ hasText: /start|continue/i }).first();
    await expect(start).toBeVisible();
    await start.click();

    await expect(page.locator('#quiz')).toBeVisible();
    await expect(page.locator('#stem')).not.toBeEmpty();

    const first = page.locator('#options .opt').first();
    await first.click();
    if (await page.locator('#submit-multi').isVisible()) await page.locator('#submit-multi').click();

    await page.waitForTimeout(450);
    const before = await page.locator('#progress').textContent();
    await page.reload();
    await expect(page.locator('#dashboard')).toBeVisible();
    const resume = page.locator('#cards button').filter({ hasText: /continue/i }).first();
    await expect(resume).toBeVisible();
    await resume.click();
    await expect(page.locator('#quiz')).toBeVisible();
    await expect(page.locator('#progress')).toHaveText(before.trim());
  });

  test('Bank 1 reset clears the current saved answer without breaking navigation', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    await page.locator('#options .opt').first().click();
    if (await page.locator('#submit-multi').isVisible()) await page.locator('#submit-multi').click();

    page.once('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Reset' }).click();
    await expect(page.locator('#explain')).toBeHidden();
    await expect(page.locator('#options .opt.selected')).toHaveCount(0);
    await expect(page.locator('#next')).toBeVisible();
  });

  for (const bank of [
    ['Bank 1', 'quiz-bank-1.html', '#overall'],
    ['Bank 2', 'quiz-bank-2.html', '#bank2Overall'],
    ['Bank 3', 'quiz-bank-3.html', null]
  ]) {
    test(bank[0] + ' loads without uncaught page errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(exam + '/' + bank[1]);
      await expect(page.locator('body')).toBeVisible();
      if (bank[2]) await expect(page.locator(bank[2])).toContainText('500');
      expect(errors).toEqual([]);
    });
  }

  test('Studio loads sources and exposes its dashboard without page errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(exam + '/studio.html');
    await expect(page.locator('body')).toBeVisible();
    await expect.poll(async () => page.evaluate(() => typeof ALL_BY_UID !== 'undefined' ? ALL_BY_UID.size : 0), { timeout: 20000 }).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  for (const pageName of ['hazards.html','hazards-bank-2.html','hazards-bank-3.html','hazards-harder.html']) {
    test(pageName + ' loads its quiz runtime without page errors', async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(exam + '/' + pageName);
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});
