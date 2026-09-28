const { test, expect } = require('@playwright/test');

test.describe('multi-course foundation', () => {
  test('Basic Principles is reachable from the course home and exposes Exam 1', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => MBUPageReady);
    await expect(page.getByRole('heading', { name: 'Basic Principles' })).toBeVisible();

    await page.goto('/basic-principles/');
    await page.evaluate(() => MBUPageReady);
    await expect(page.getByRole('heading', { name: 'Basic Principles' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open Exam 1 Dashboard/ })).toHaveAttribute('href', 'exam-1/');

    await page.goto('/basic-principles/exam-1/');
    await page.evaluate(() => MBUPageReady);
    await expect(page.getByRole('heading', { name: 'Basic Principles — Exam 1' })).toBeVisible();
  });

  test('Basic Principles learner stores are isolated from Equipment Exam 1', async ({ page }) => {
    await page.goto('/equipment/exam-1/studio.html');
    await page.evaluate(async () => { await MBUPageReady; await MBUStudioPageReady; });
    const equipment = await page.evaluate(() => ({
      studio: MBUStudio.STORE,
      intelligence: MBUStudyIntelligence.STORE,
      course: window.MBU_CONTEXT?.courseId || 'equipment'
    }));
    expect(equipment).toEqual({
      studio: 'mbu_exam1_studio_v1',
      intelligence: 'mbu_study_intelligence_v1',
      course: 'equipment'
    });

    await page.goto('/basic-principles/exam-1/studio.html');
    await page.evaluate(async () => { await MBUPageReady; await MBUStudioPageReady; });
    const principles = await page.evaluate(() => ({
      studio: MBUStudio.STORE,
      intelligence: MBUStudyIntelligence.STORE,
      course: window.MBU_CONTEXT?.courseId,
      exam: window.MBU_CONTEXT?.examId
    }));
    expect(principles).toEqual({
      studio: 'mbu_studio_basic-principles_exam-1_v1',
      intelligence: 'mbu_study_intelligence_basic-principles_exam-1_v1',
      course: 'basic-principles',
      exam: 'exam-1'
    });
  });

  test('Basic Principles empty manifest is valid and does not invent Equipment content', async ({ page }) => {
    const response = await page.request.get('/basic-principles/exam-1/banks.json');
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.course.id).toBe('basic-principles');
    expect(manifest.exam.id).toBe('exam-1');
    expect(manifest.banks).toEqual([]);
    expect(manifest.studioSources).toEqual([]);
    expect(manifest.contentTaxonomy.topics).toEqual([]);
    expect(manifest.sessionEnvironment).toBe('equipment-bank1-practice-set1-v1');
    expect(manifest.defaultBankEngine).toBe('canonical');
    expect(manifest.bankPage).toBe('bank.html');
  });
  test('guest navbar resolves from the app root instead of the site origin', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => MBUPageReady);
    const nav = page.locator('.mbu-global-nav');
    await expect(nav.getByRole('link', { name: 'Equipment' })).toHaveAttribute('href', /\/equipment\/$/);
    await expect(nav.getByRole('link', { name: 'Study Studio' })).toHaveAttribute('href', /\/equipment\/exam-1\/studio\.html$/);
    await expect(nav.getByRole('link', { name: 'Adaptive' })).toHaveAttribute('href', /\/equipment\/exam-1\/studio\.html\?mode=adaptive$/);

    await page.goto('/basic-principles/exam-1/');
    await page.evaluate(() => MBUPageReady);
    await expect(page.locator('.mbu-global-nav').getByRole('link', { name: 'Basic Principles' })).toHaveAttribute('href', /\/basic-principles\/$/);
    await expect(page.locator('.mbu-global-nav').getByRole('link', { name: 'Study Studio' })).toHaveAttribute('href', /\/basic-principles\/exam-1\/studio\.html$/);
  });


});
