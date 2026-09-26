const { test, expect } = require('@playwright/test');
const { exam, clearAppState, collectPageErrors, waitForStudio, storageJSON } = require('./helpers');

async function clickIndexes(locator, indexes) {
  for (const index of indexes) await locator.nth(index).click();
}

test.describe('canonical quiz regression', () => {
  test.beforeEach(async ({ page }) => clearAppState(page));

  test('Bank 1 starts, answers, advances, and resumes through Continue after reload', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await expect(page.locator('#overall')).toContainText('/ 500 completed');

    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    await expect(page.locator('#quiz')).toBeVisible();
    await expect(page.locator('#stem')).not.toBeEmpty();

    await page.locator('#options .opt').first().click();
    if (await page.locator('#submit-multi').isVisible()) await page.locator('#submit-multi').click();

    await page.waitForTimeout(450);
    const before = (await page.locator('#progress').textContent()).trim();
    await page.reload();
    await expect(page.locator('#dashboard')).toBeVisible();
    await page.locator('#cards button').filter({ hasText: /continue/i }).first().click();
    await expect(page.locator('#quiz')).toBeVisible();
    await expect(page.locator('#progress')).toHaveText(before);
  });

  test('Bank 1 reset clears the current saved answer and rerenders', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    await page.locator('#options .opt').first().click();
    if (await page.locator('#submit-multi').isVisible()) await page.locator('#submit-multi').click();

    page.once('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Reset' }).click();
    await expect(page.locator('#explain')).toBeHidden();
    await expect(page.locator('#options .opt.selected')).toHaveCount(0);
    await expect(page.locator('#next')).toBeVisible();

    const state = await storageJSON(page, 'SRNA_COMBINED_EXAM_SET_1_2026_V1');
    expect(Object.keys(state.sets['1'].graded || {})).toHaveLength(0);
  });

  test('Bank 2 persists a correct answer and resumes at the next question', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => startSet(0));
    const answer = await page.evaluate(() => SETS[0][0].correct);
    await clickIndexes(page.locator('#choices .choice'), answer);
    let state = await storageJSON(page, 'srna_all5_groundup_v1');
    expect(state?.sets?.['0']?.answered?.['0']).toBeUndefined();
    await page.locator('#submitBtn').click();
    await page.waitForTimeout(450);

    state = await storageJSON(page, 'srna_all5_groundup_v1');
    expect(state.sets['0'].answered['0']).toBe(true);
    expect(state.sets['0'].current).toBe(1);

    await page.reload();
    await page.evaluate(() => startSet(0));
    await expect(page.locator('#progress')).toContainText('Question 2 of');
  });

  test('Bank 2 question reset removes only the current answer state', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => startSet(0));
    const correct = await page.evaluate(() => SETS[0][0].correct[0]);
    const wrong = correct === 0 ? 1 : 0;
    await page.locator('#choices .choice').nth(wrong).click();
    await expect(page.locator('#feedback')).toBeHidden();
    await page.locator('#submitBtn').click();
    await expect(page.locator('#feedback')).toBeVisible();

    await page.locator('#resetQBtn').click();
    await expect(page.locator('#feedback')).toBeHidden();
    await expect(page.locator('#choices .choice.sel')).toHaveCount(0);
    const state = await storageJSON(page, 'srna_all5_groundup_v1');
    expect(state.sets['0'].answered['0']).toBeUndefined();
  });

  test('Bank 3 persists a submitted answer and resumes at the advanced position', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-3.html');
    await page.evaluate(() => openExam(1));
    const answer = await page.evaluate(() => byId[EXM[1].ids[0]].a);
    await clickIndexes(page.locator('#main .opt'), answer);
    let state = await storageJSON(page, 'srna_equipment_dashboard_v1');
    expect(state).toBeNull();
    await page.locator('#go').click();
    await page.waitForTimeout(450);
    state = await storageJSON(page, 'srna_equipment_dashboard_v1');
    expect(Object.keys(state.ex['1'].ans || {})).toHaveLength(1);
    expect(state.ex['1'].idx).toBe(1);
    await page.reload();
    await page.evaluate(() => openExam(1));
    await expect(page.locator('.progress')).toContainText('Question 2 of');
  });

  test('Bank 3 multi-select reveals every keyed answer with canonical feedback styling', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(exam + '/quiz-bank-3.html');
    const caseData = await page.evaluate(() => {
      const q = BANK.find(x => x.type === 'multi' && x.a.length > 1 && x.c.some((_, i) => !x.a.includes(i)));
      if (!q) throw new Error('Bank 3 has no suitable multi-select question');
      V = { mode: 'exam', n: q.setn };
      S.ex[q.setn].idx = EXM[q.setn].ids.indexOf(q.id);
      renderQ();
      const wrong = q.c.findIndex((_, i) => !q.a.includes(i));
      return { answer: q.a, chosen: [...q.a.slice(0, -1), wrong] };
    });
    await clickIndexes(page.locator('#main .opt'), caseData.chosen);
    await expect(page.locator('#go')).toContainText('Submit Selections');
    await expect(page.locator('#go')).toBeEnabled();
    await page.locator('#go').click();
    await expect(page.locator('#fb')).toBeVisible();
    for (const i of caseData.answer) {
      const option = page.locator('#main .opt').nth(i);
      await expect(option).toHaveCSS('background-color', 'rgb(198, 246, 213)');
      await expect(option.locator('.t')).not.toHaveCSS('text-decoration-line', 'line-through');
    }
    await expect(page.locator('#fb')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(page.locator('#fb')).toHaveCSS('border-left-color', 'rgb(26, 54, 93)');
    expect(errors).toEqual([]);
  });

  test('Hazards Set 1 persists a correct answer and auto-advances', async ({ page }) => {
    await page.goto(exam + '/hazards-100.html');
    await page.locator('#hazStart').click();
    const answer = await page.evaluate(() => QUESTIONS[0].answer);
    await clickIndexes(page.locator('#options .opt'), answer);
    let state = await storageJSON(page, 'SRNA_HAZARDS_BANK_1_2026_V2');
    expect(state?.graded?.['1']).toBeUndefined();
    await page.locator('#submit-multi').click();
    await page.waitForTimeout(450);

    await expect(page.locator('#progress')).toContainText('Question 2 of');
    state = await storageJSON(page, 'SRNA_HAZARDS_BANK_1_2026_V2');
    expect(state.graded['1']).toBe(true);
    expect(state.correct['1']).toBe(true);
  });

  test('Hazards Set 1 full reset clears persisted progress and stays usable', async ({ page }) => {
    await page.goto(exam + '/hazards-100.html');
    await page.locator('#hazStart').click();
    await page.locator('#options .opt').first().click();

    page.once('dialog', dialog => dialog.accept());
    await page.locator('button', { hasText: 'Reset' }).click();
    await expect(page.locator('#progress')).toContainText('Question 1 of');
    const state = await storageJSON(page, 'SRNA_HAZARDS_BANK_1_2026_V2');
    expect(Object.keys(state.graded)).toHaveLength(0);
    expect(state.current).toBe(0);
  });

  test('Hazards Set 3 answer state survives reload at the advanced position', async ({ page }) => {
    await page.goto(exam + '/hazards-bank-3.html');
    const answer = await page.evaluate(() => BANK[0].a);
    await clickIndexes(page.locator('#choices .opt'), answer);
    await page.locator('#go').click();
    await page.waitForTimeout(450);
    await expect(page.locator('.progress')).toContainText('Question 2 of');

    const state = await storageJSON(page, 'hazards_practice3_progress_2026_V2');
    expect(state.ans[Object.keys(state.ans)[0]].ok).toBe(true);
    await page.reload();
    await expect(page.locator('.progress')).toContainText('Question 2 of');
  });

  test('Hazards Set 2 persists a submitted answer through the shared standard engine', async ({ page }) => {
    await page.goto(exam + '/hazards-bank-2.html');
    await page.locator('#hazStart').click();
    const answer = await page.evaluate(() => QUESTIONS[0].answer);
    await clickIndexes(page.locator('#options .opt'), answer);
    await page.locator('#submit-multi').click();
    await page.waitForTimeout(450);
    const state = await storageJSON(page, 'SRNA_HAZARDS_BANK_2_2026_V1');
    expect(state.graded['1']).toBe(true);
    expect(state.correct['1']).toBe(true);
    await expect(page.locator('#progress')).toContainText('Question 2 of');
  });

  test('Challenge writes only its canonical progress key', async ({ page }) => {
    await page.goto(exam + '/hazards-harder.html');
    const answer = await page.evaluate(() => BANK[0].a);
    await clickIndexes(page.locator('#choices .opt'), answer);
    await page.locator('#go').click();
    await page.waitForTimeout(100);

    const canonical = await storageJSON(page, 'hazards_harder_progress_2026_V1');
    expect(canonical).not.toBeNull();
    expect(Object.keys(canonical.ans)).toHaveLength(1);
    expect(await page.evaluate(() => localStorage.getItem('srna_hazards_safety_harder_v1'))).toBeNull();
  });

  test('Studio-created quiz fits a standard desktop viewport without page scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      session = [ALL.find(q => Array.isArray(q.opts) && q.opts.length === 4 && q.ans.length === 1) || ALL[0]];
      pos = 0;
      DB.active = { uids: session.map(q => q.uid), pos: 0, answers: {}, updated: Date.now() };
      save();
      showQ();
    });
    await expect(page.locator('#quiz')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('#studioPrev')).toBeVisible();
    await expect(page.locator('#next')).toBeVisible();
    await expect(page.locator('#quiz .header')).toBeVisible();
    await expect(page.locator('#quiz .stats')).toBeVisible();
    await expect(page.locator('#quiz .controls')).toBeVisible();
  });

  test('Studio lazily hydrates canonical Bank 3 figures when an image question is shown', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    const uid = await page.evaluate(() => {
      const q = (BANK_QUESTIONS.get('b3') || []).find(x => x.img && x.img.kind === 'bank3');
      if (!q) throw new Error('No Bank 3 figure question found');
      session = [q]; pos = 0;
      DB.active = { uids: [q.uid], pos: 0, answers: {}, updated: Date.now() };
      save(); showQ();
      return q.uid;
    });
    expect(uid).toBeTruthy();
    await expect(page.locator('#qimage img')).toHaveAttribute('src', /^data:image\/png;base64,/, { timeout: 10000 });
    expect(errors).toEqual([]);
  });

  test('Studio active session resumes with position and answer state after reload', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      session = ALL.slice(0, 2);
      pos = 0;
      DB.active = { uids: session.map(q => q.uid), pos: 0, answers: {}, updated: Date.now() };
      save();
      showQ();
    });
    const answer = await page.evaluate(() => session[pos].ans);
    await clickIndexes(page.locator('#opts .opt'), answer);
    await page.locator('#submit').click();
    await page.waitForTimeout(450);
    await expect(page.locator('#qprog')).toContainText('Question 2 of 2');

    await page.reload();
    await waitForStudio(page);
    await expect(page.locator('#resumeActive')).toContainText('Question 2 / 2');
    await page.locator('#resumeActive').click();
    await expect(page.locator('#qprog')).toContainText('Question 2 of 2');
  });

  for (const [name, file, total] of [
    ['Bank 1', 'quiz-bank-1.html', '#overall'],
    ['Bank 2', 'quiz-bank-2.html', '#bank2Overall'],
    ['Bank 3', 'quiz-bank-3.html', '#stats']
  ]) {
    test(name + ' loads without uncaught page errors', async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(exam + '/' + file);
      await expect(page.locator('body')).toBeVisible();
      if (total) await expect(page.locator(total)).toContainText('500');
      expect(errors).toEqual([]);
    });
  }

  test('Studio hydrates every canonical source at its expected question count', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    const counts = await page.evaluate(() => Object.fromEntries([...BANK_QUESTIONS].map(([bank, qs]) => [bank, qs.length])));
    expect(counts).toEqual({ b1: 500, b2: 500, b3: 500, h1: 100, h2: 100, h3: 100, hh: 50 });
    expect(await page.evaluate(() => ALL_BY_UID.size)).toBe(1850);
  });

  test('Studio loads all indexed sources without page errors', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(exam + '/studio.html');
    await expect(page.locator('body')).toBeVisible();
    await waitForStudio(page);
    await expect.poll(async () => page.evaluate(() => BANK_QUESTIONS.size), { timeout: 20000 }).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });

  for (const pageName of ['hazards.html', 'hazards-bank-2.html', 'hazards-bank-3.html', 'hazards-harder.html']) {
    test(pageName + ' loads its quiz runtime without page errors', async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(exam + '/' + pageName);
      await expect(page.locator('body')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
  test('Hazards canonical grading overrides cross-outs and colored feedback', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(exam + '/hazards-bank-3.html');
    const caseData = await page.evaluate(() => {
      const q = BANK.find(x => x.a && x.a.length && x.c && x.c.length);
      if (!q) throw new Error('Hazards Bank 3 has no gradable question');
      V = { mode: 'exam', n: q.setn };
      S.ex[q.setn].idx = EXM[q.setn].ids.indexOf(q.id);
      renderQ();
      return { correct: q.a[0], answer: q.a };
    });
    const correct = page.locator('#main .opt').nth(caseData.correct);
    await correct.click({ button: 'right' });
    const wrong = await page.evaluate(({ answer }) => BANK.find(x => x.id === S.ex[V.n].ids?.[S.ex[V.n].idx])?.c.findIndex((_, i) => !answer.includes(i)) ?? -1, caseData).catch(() => -1);
    if (wrong >= 0) await page.locator('#main .opt').nth(wrong).click();
    for (const i of caseData.answer) if (i !== caseData.correct) await page.locator('#main .opt').nth(i).click();
    await page.locator('#go').click();
    await expect(correct).toHaveCSS('background-color', 'rgb(198, 246, 213)');
    await expect(correct).toHaveCSS('text-decoration-line', 'none');
    await expect(correct).toHaveCSS('opacity', '1');
    await expect(page.locator('#fb')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(page.locator('#fb')).toHaveCSS('border-left-color', 'rgb(26, 54, 93)');
    expect(errors).toEqual([]);
  });

  test('Shared asset revisions and updater baseline stay canonical', async ({ page }) => {
    const requests=[];
    page.on('request', req => { if (req.url().includes('/equipment/assets/') && req.url().includes('?v=')) requests.push(req.url()); });
    await page.goto(exam + '/studio.html');
    await expect(page.locator('#home')).toBeVisible();
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every(url => new URL(url).searchParams.get('v') === '60')).toBeTruthy();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('mbu_build_manifest_v1'))).not.toBeNull();
  });

});
