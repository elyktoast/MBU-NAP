const { test, expect } = require('@playwright/test');
const { clearAppState } = require('./helpers');

async function waitForPageReady(page) {
  await page.waitForFunction(() => window.MBUPageReady && typeof window.MBUPageReady.then === 'function');
  await page.evaluate(() => window.MBUPageReady);
}

async function waitForStudioReady(page) {
  await waitForPageReady(page);
  await page.waitForFunction(() => window.MBUStudioPageReady && typeof window.MBUStudioPageReady.then === 'function');
  await page.evaluate(() => window.MBUStudioPageReady);
}

test.describe('multi-course foundation', () => {
  test.beforeEach(async ({ page }) => clearAppState(page));
  test('Basic Principles is reachable from the course home and exposes Exam 1', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'Basic Principles' })).toBeVisible();

    await page.goto('/basic-principles/');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'Basic Principles' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open Exam 1 Dashboard/ })).toHaveAttribute('href', 'exam-1/');

    await page.goto('/basic-principles/exam-1/');
    await waitForPageReady(page);
    await expect(page.getByRole('heading', { name: 'Basic Principles — Exam 1' })).toBeVisible();
  });

  test('Basic Principles learner stores are isolated from Equipment Exam 1', async ({ page }) => {
    await page.goto('/equipment/exam-1/studio.html');
    await waitForStudioReady(page);
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
    await waitForStudioReady(page);
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

  test('Basic Principles manifest exposes one unified 3,500-question Study Studio pool', async ({ page }) => {
    const response = await page.request.get('/basic-principles/exam-1/banks.json');
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.course.id).toBe('basic-principles');
    expect(manifest.exam.id).toBe('exam-1');
    expect(manifest.banks).toEqual([]);
    expect(manifest.studioSources).toHaveLength(7);
    expect(manifest.studioSources.reduce((sum, source) => sum + source.count, 0)).toBe(3500);
    expect(manifest.studioSources.every(source => source.key.startsWith('bp1-'))).toBeTruthy();
    expect(new Set(manifest.studioSources.map(source => source.groupLabel))).toEqual(new Set(['Basic Principles Exam 1']));
    expect(manifest.contentTaxonomy.topics).toHaveLength(7);
    expect(manifest.sessionEnvironment).toBe('equipment-bank1-practice-set1-v1');
    expect(manifest.defaultBankEngine).toBe('canonical');
    expect(manifest.bankPage).toBe('bank.html');
  });
  test('guest navbar resolves from the app root instead of the site origin', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    const nav = page.locator('.mbu-global-nav');
    await expect(nav.getByRole('link', { name: 'Equipment' })).toHaveAttribute('href', /\/equipment\/$/);
    await expect(nav.getByRole('link', { name: 'Study Studio' })).toHaveAttribute('href', /\/equipment\/exam-1\/studio\.html$/);
    await expect(nav.getByRole('link', { name: 'Adaptive' })).toHaveAttribute('href', /\/equipment\/exam-1\/studio\.html\?mode=adaptive$/);

    await page.goto('/basic-principles/exam-1/');
    await waitForPageReady(page);
    await expect(page.locator('.mbu-global-nav').getByRole('link', { name: 'Basic Principles' })).toHaveAttribute('href', /\/basic-principles\/$/);
    await expect(page.locator('.mbu-global-nav').getByRole('link', { name: 'Study Studio' })).toHaveAttribute('href', /\/basic-principles\/exam-1\/studio\.html$/);
  });



  test('Basic Principles Studio loads one unified 3500-question pool', async ({ page }) => {
    await page.goto('/basic-principles/exam-1/studio.html');
    await waitForStudioReady(page);
    const state = await page.evaluate(() => ({
      count: ALL.length,
      uidCount: ALL_BY_UID.size,
      groups: [...document.querySelectorAll('#sourceChecks > div > div > b')].map(x => x.textContent.trim()),
      sources: document.querySelectorAll('#sourceChecks label').length,
      topics: document.querySelectorAll('#topicChecks input').length,
      jpg: ALL.some(q => q.img && q.img.kind === 'direct' && String(q.img.url).endsWith('.jpg')),
      svg: ALL.some(q => q.img && q.img.kind === 'direct' && String(q.img.url).endsWith('.svg'))
    }));
    expect(state.count).toBe(3500);
    expect(state.uidCount).toBe(3500);
    expect(state.groups).toEqual(['Basic Principles Exam 1']);
    expect(state.sources).toBe(7);
    expect(state.topics).toBeGreaterThan(7);
    expect(state.jpg).toBeTruthy();
    expect(state.svg).toBeTruthy();
    await expect(page.locator('#mbu-bank-picker option')).toHaveCount(1);
  });


  test('Basic Principles Studio topic filtering and direct figures work across the unified pool', async ({ page }) => {
    await page.goto('/basic-principles/exam-1/studio.html');
    await waitForStudioReady(page);
    const ids = await page.evaluate(() => ({
      jpg: ALL.find(q => q.img && q.img.kind === 'direct' && String(q.img.url).endsWith('.jpg')).uid,
      svg: ALL.find(q => q.img && q.img.kind === 'direct' && String(q.img.url).endsWith('.svg')).uid
    }));
    await page.evaluate(uid => practiceSearch(uid), ids.jpg);
    await expect(page.locator('#qimage img')).toBeVisible();
    await expect(page.locator('#qimage img')).toHaveAttribute('src', /[.]jpg$/i);
    await page.evaluate(() => renderHome());
    await page.evaluate(uid => practiceSearch(uid), ids.svg);
    await expect(page.locator('#qimage img')).toBeVisible();
    await expect(page.locator('#qimage img')).toHaveAttribute('src', /[.]svg$/i);
    await page.evaluate(() => renderHome());

    await page.getByRole('button', { name: 'Topics' }).click();
    const choice = page.locator('#topicChecks input').first();
    await choice.check();
    const topic = await choice.inputValue();
    await page.selectOption('#count', '10');
    await page.getByRole('button', { name: 'Start Quiz' }).click();
    expect(await page.evaluate(() => session.length)).toBe(10);
    expect(await page.evaluate(() => [...new Set(session.map(q => q.topic))])).toEqual([topic]);
  });


  test('Basic Principles unified pool is available to search, Smart Review, analytics, and Adaptive entry', async ({ page }) => {
    await page.goto('/basic-principles/exam-1/studio.html');
    await waitForStudioReady(page);
    await expect(page.getByRole('button', { name: 'Search Questions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Smart Review' })).toBeVisible();
    await expect(page.locator('#analyticsSummary')).toBeVisible();
    await expect(page.locator('#adaptiveToggle')).toBeVisible();
    await page.getByRole('button', { name: 'Search Questions' }).click();
    await page.locator('#searchbox').fill('airway');
    await expect(page.locator('#searchresults')).not.toBeEmpty();
    expect(await page.evaluate(() => window.MBUStudyIntelligence.smartReview(ALL, 50).length)).toBeGreaterThan(0);
  });

});
