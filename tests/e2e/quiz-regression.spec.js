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

    await expect.poll(async () => {
      const state = await storageJSON(page, 'SRNA_COMBINED_EXAM_SET_1_2026_V1');
      return state?.sets?.['1']?.current ?? 0;
    }).toBeGreaterThanOrEqual(0);
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
    await expect(page.locator('#progress')).toContainText('Question 2 of');

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
    await expect(page.locator('.progress')).toContainText('Question 2 of');
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
    await expect(page.locator('#progress')).toContainText('Question 2 of');
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
    await expect.poll(async () => {
      const state = await storageJSON(page, 'hazards_harder_progress_2026_V1');
      return state ? Object.keys(state.ans || {}).length : 0;
    }).toBe(1);

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
    const data = await page.evaluate(() => {
      const q = BANK[0];
      return { answer: q.a, optionCount: q.c.length, multi: q.type === 'multi' };
    });
    const options = page.locator('#main .opt');
    await expect(options).toHaveCount(data.optionCount);
    const correctIndex = data.answer[0];
    const correct = options.nth(correctIndex);
    await correct.click({ button: 'right' });
    const wrongIndex = Array.from({ length: data.optionCount }, (_, i) => i).find(i => !data.answer.includes(i));
    if (data.multi) {
      const selected = data.answer.filter(i => i !== correctIndex);
      if (wrongIndex !== undefined) selected.push(wrongIndex);
      while (selected.length < data.answer.length) {
        const i = Array.from({ length: data.optionCount }, (_, n) => n).find(n => !selected.includes(n) && n !== correctIndex);
        if (i === undefined) break;
        selected.push(i);
      }
      for (const i of selected.slice(0, data.answer.length)) await options.nth(i).click();
      await page.locator('#go').click();
    } else {
      await options.nth(wrongIndex === undefined ? correctIndex : wrongIndex).click();
      await page.locator('#go').click();
    }
    await expect(correct).toHaveCSS('background-color', 'rgb(198, 246, 213)');
    await expect(correct.locator('.t')).toHaveCSS('text-decoration-line', 'none');
    await expect(correct).toHaveCSS('opacity', '1');
    await expect(page.locator('#fb')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(page.locator('#fb')).toHaveCSS('border-left-color', 'rgb(26, 54, 93)');
    expect(errors).toEqual([]);
  });


  test('Bank 1 dashboard completed total updates after grading and survives reload', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    const answer = await page.evaluate(() => {
      const q = SETS[1][0];
      return q.answer ?? q.correct ?? q.a;
    });
    await clickIndexes(page.locator('#options .opt'), Array.isArray(answer) ? answer : [answer]);
    if (await page.locator('#submit-multi').isVisible()) await page.locator('#submit-multi').click();
    await expect.poll(async () => {
      const state = await storageJSON(page, 'SRNA_COMBINED_EXAM_SET_1_2026_V1');
      return Object.keys(state?.sets?.['1']?.graded || {}).length;
    }).toBe(1);
    await page.reload();
    await expect(page.locator('#overall')).toContainText('1 / 500 completed');
  });

  test('Bank 2 dashboard completed total updates after grading and survives reload', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => startSet(0));
    const answer = await page.evaluate(() => SETS[0][0].correct);
    await clickIndexes(page.locator('#choices .choice'), answer);
    await page.locator('#submitBtn').click();
    await expect.poll(async () => {
      const state = await storageJSON(page, 'srna_all5_groundup_v1');
      return Object.keys(state?.sets?.['0']?.answered || {}).length;
    }).toBe(1);
    await page.reload();
    await expect(page.locator('#bank2Overall')).toContainText('1 / 500 completed');
  });

  test('Bank 3 dashboard completed total updates after grading and survives reload', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-3.html');
    await page.evaluate(() => openExam(1));
    const answer = await page.evaluate(() => byId[EXM[1].ids[0]].a);
    await clickIndexes(page.locator('#main .opt'), answer);
    await page.locator('#go').click();
    await expect.poll(async () => {
      const state = await storageJSON(page, 'srna_equipment_dashboard_v1');
      return Object.keys(state?.ex?.['1']?.ans || {}).length;
    }).toBe(1);
    await page.reload();
    await expect(page.locator('#stats')).toContainText('1 / 500');
  });

  test('Bank 3 manual navigation cancels pending auto-advance', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-3.html');
    await page.evaluate(() => openExam(1));
    const answer = await page.evaluate(() => byId[EXM[1].ids[0]].a);
    await clickIndexes(page.locator('#main .opt'), answer);
    await page.locator('#go').click();
    await page.evaluate(() => next());
    const afterManual = await page.evaluate(() => S.ex[1].idx);
    expect(await page.evaluate(() => autoTimer)).toBeNull();
    expect(await page.evaluate(() => S.ex[1].idx)).toBe(afterManual);
  });

  test('Studio mixed-bank session restores graded state after navigating away and back', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      const banks=['b1','b2','b3'];
      session=banks.map(k => (BANK_QUESTIONS.get(k)||[]).find(q => q.ans.length===1)).filter(Boolean);
      if(session.length!==3) throw new Error('Could not build mixed-bank Studio session');
      pos=0;
      DB.active={uids:session.map(q=>q.uid),pos:0,answers:{},updated:Date.now()};
      save(); showQ();
    });
    const answer = await page.evaluate(() => session[0].ans);
    await clickIndexes(page.locator('#opts .opt'), answer);
    await page.locator('#submit').click();
    await page.locator('#next').click();
    await page.locator('#studioPrev').click();
    await expect(page.locator('#opts .opt.correct')).toHaveCount(1);
    await expect(page.locator('#fb')).toBeVisible();
    expect(await page.evaluate(() => DB.active.pos)).toBe(0);
  });

  test('Studio reset removes only the current session answer and allows re-answering', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      session=[ALL.find(q=>q.ans.length===1)];
      pos=0;
      DB.active={uids:session.map(q=>q.uid),pos:0,answers:{},updated:Date.now()};
      save(); showQ();
    });
    const answer = await page.evaluate(() => session[0].ans);
    await clickIndexes(page.locator('#opts .opt'), answer);
    await page.locator('#submit').click();
    await expect(page.locator('#fb')).toBeVisible();
    await page.locator('button', { hasText: 'Reset' }).click();
    await expect(page.locator('#fb')).toBeHidden();
    expect(await page.evaluate(() => sessionAnswer(session[0].uid))).toBeFalsy();
    await clickIndexes(page.locator('#opts .opt'), answer);
    await page.locator('#submit').click();
    await expect(page.locator('#fb')).toBeVisible();
    expect(await page.evaluate(() => sessionAnswer(session[0].uid)?.ok)).toBe(true);
  });



  test('Bank 1 cross-out can be cleared by reset without contaminating answer state', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    const option=page.locator('#options .opt').first();
    await option.click({button:'right'});
    await expect(option).toHaveClass(/strike/);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button', {hasText:'Reset'}).click();
    await expect(page.locator('#options .opt.strike')).toHaveCount(0);
    await expect(page.locator('#options .opt.selected')).toHaveCount(0);
  });

  test('Bank 2 graded question survives immediate reload without losing the answer', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => startSet(0));
    const answer=await page.evaluate(() => SETS[0][0].correct);
    await clickIndexes(page.locator('#choices .choice'), answer);
    await page.locator('#submitBtn').click();
    await page.reload();
    const state=await storageJSON(page,'srna_all5_groundup_v1');
    expect(state.sets['0'].answered['0']).toBe(true);
  });

  test('Bank 3 last question grading does not advance beyond the set', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-3.html');
    const data=await page.evaluate(() => {
      openExam(1);
      S.ex[1].idx=EXM[1].ids.length-1;
      renderQ();
      const q=byId[EXM[1].ids[S.ex[1].idx]];
      return {answer:q.a,last:EXM[1].ids.length-1};
    });
    await clickIndexes(page.locator('#main .opt'), data.answer);
    await page.locator('#go').click();
    await expect(page.locator('#main')).toContainText('complete');
    expect(await page.evaluate(() => S.ex[1].idx)).toBe(data.last + 1);
  });

  test('Studio completed single-question session clears active state and stays completed after reload', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      session=[ALL.find(q=>q.ans.length===1)];
      pos=0;
      DB.active={uids:[session[0].uid],pos:0,answers:{},updated:Date.now()};
      save(); showQ();
    });
    const answer=await page.evaluate(() => session[0].ans);
    await clickIndexes(page.locator('#opts .opt'),answer);
    await page.locator('#submit').click();
    await expect(page.locator('#home')).toBeVisible();
    expect(await page.evaluate(() => DB.active)).toBeNull();
    await page.reload();
    await waitForStudio(page);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#resumeActive')).toHaveCount(0);
    expect(await page.evaluate(() => DB.active)).toBeNull();
  });

  test('Studio ignores an active session whose question UIDs no longer exist', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      DB.active={uids:['missing:question:uid'],pos:0,answers:{'missing:question:uid':{sel:[0],ok:true}},updated:Date.now()};
      save();
    });
    await page.reload();
    await waitForStudio(page);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#quiz')).toBeHidden();
  });

  test('Malformed saved JSON does not prevent Bank 1 from loading', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.evaluate(() => localStorage.setItem('SRNA_COMBINED_EXAM_SET_1_2026_V1','{bad json'));
    await page.reload();
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#overall')).toContainText('/ 500 completed');
  });


  test('Bank 1 completes a full practice set through the real final-question path', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.evaluate(() => {
      startSet(1);
      const st = db.sets[1];
      for (let i = 0; i < currentData.length - 1; i++) {
        st.answers[String(i)] = [...currentData[i].answer];
        st.graded[String(i)] = true;
        st.correct[String(i)] = true;
      }
      st.current = currentData.length - 1;
      currentIndex = currentData.length - 1;
      saveDB();
      loadQuestion();
    });

    await expect(page.locator('#progress')).toContainText('Question 100 of 100');
    const answer = await page.evaluate(() => currentData[currentIndex].answer);
    await clickIndexes(page.locator('#options .opt'), answer);
    if (await page.locator('#submit-multi').isVisible()) await page.locator('#submit-multi').click();

    await expect.poll(async () => {
      const state = await storageJSON(page, 'SRNA_COMBINED_EXAM_SET_1_2026_V1');
      return Object.keys(state.sets['1'].graded || {}).filter(k => state.sets['1'].graded[k]).length;
    }).toBe(100);

    await page.locator('#next').click();
    await expect(page.locator('#dashboard')).toBeVisible();
    await expect(page.locator('#overall')).toContainText('100 / 500 completed');

    await page.reload();
    await expect(page.locator('#overall')).toContainText('100 / 500 completed');
  });

  test('Bank 2 completes a full practice set through the real final-question path', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => {
      const s = st(0);
      for (let i = 0; i < SETS[0].length - 1; i++) {
        s.answered[i] = true;
        s.selections[i] = [...SETS[0][i].correct];
      }
      s.current = SETS[0].length - 1;
      save();
      startSet(0);
    });

    await expect(page.locator('#progress')).toContainText('Question 100 of 100');
    const answer = await page.evaluate(() => SETS[0][99].correct);
    await clickIndexes(page.locator('#choices .choice'), answer);
    await page.locator('#submitBtn').click();

    await expect.poll(async () => {
      const state = await storageJSON(page, 'srna_all5_groundup_v1');
      return Object.keys(state.sets['0'].answered || {}).length;
    }).toBe(100);

    await expect(page.locator('#dash')).toBeVisible();
    await expect(page.locator('#bank2Overall')).toContainText('100 / 500 completed');

    await page.reload();
    await expect(page.locator('#bank2Overall')).toContainText('100 / 500 completed');
  });

  test('Studio completes a mixed session spanning every canonical source and persists canonical results', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);

    const expectedBanks = await page.evaluate(() => {
      const banks = ['b1','b2','b3','h1','h2','h3','hh'];
      session = banks.map(bank => {
        const qs = BANK_QUESTIONS.get(bank) || [];
        return qs.find(q => q.ans.length === 1) || qs[0];
      }).filter(Boolean);
      if (session.length !== banks.length) throw new Error('Could not build all-source Studio session');
      pos = 0;
      DB.active = { uids: session.map(q => q.uid), pos: 0, answers: {}, updated: Date.now() };
      save();
      showQ();
      return session.map(q => q.bank);
    });
    expect(expectedBanks).toEqual(['b1','b2','b3','h1','h2','h3','hh']);

    for (let i = 0; i < expectedBanks.length; i++) {
      await expect(page.locator('#qprog')).toContainText(`Question ${i + 1} of ${expectedBanks.length}`);
      const answer = await page.evaluate(() => session[pos].ans);
      await clickIndexes(page.locator('#opts .opt'), answer);
      await page.locator('#submit').click();

      if (i < expectedBanks.length - 1) {
        await expect(page.locator('#qprog')).toContainText(`Question ${i + 2} of ${expectedBanks.length}`);
      } else {
        await expect(page.locator('#home')).toBeVisible();
      }
    }

    expect(await page.evaluate(() => DB.active)).toBeNull();
    const completedBanks = await page.evaluate(() => {
      const latest = {};
      for (const [uid, result] of Object.entries(DB.ans || {})) {
        if (result && result.ok) latest[uid.split('-')[0]] = true;
      }
      return latest;
    });
    for (const bank of expectedBanks) expect(completedBanks[bank]).toBe(true);

    await page.reload();
    await waitForStudio(page);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#resumeActive')).toHaveCount(0);
  });

  test('Studio grading parity covers every canonical source and each available answer type', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);

    const cases = await page.evaluate(() => {
      const banks = ['b1','b2','b3','h1','h2','h3','hh'];
      const out = [];
      for (const bank of banks) {
        const qs = BANK_QUESTIONS.get(bank) || [];
        for (const kind of ['single','multi']) {
          const q = qs.find(x => kind === 'single' ? x.ans.length === 1 : x.ans.length > 1);
          if (q) out.push({ bank, kind, uid: q.uid });
        }
      }
      return out;
    });

    for (const tc of cases) {
      const setup = await page.evaluate(({ uid }) => {
        const q = ALL_BY_UID.get(uid);
        session = [q];
        pos = 0;
        DB.active = { uids: [q.uid], pos: 0, answers: {}, updated: Date.now() };
        save();
        showQ();

        const wrong = q.opts.map((_, i) => i).filter(i => !q.ans.includes(i));
        let chosen;
        if (q.ans.length === 1) {
          chosen = [wrong[0] ?? q.ans[0]];
        } else {
          chosen = q.ans.slice(0, -1);
          chosen.push(wrong[0] ?? q.ans[q.ans.length - 1]);
        }
        return { chosen, answer: q.ans };
      }, tc);

      await clickIndexes(page.locator('#opts .opt'), setup.chosen);
      await page.locator('#submit').click();
      await expect(page.locator('#fb')).toBeVisible();
      await expect(page.locator('#sessionCompleted')).toHaveText('1');

      for (const index of setup.answer) {
        await expect(page.locator('#opts .opt').nth(index)).toHaveClass(/correct/);
      }

      const persisted = await page.evaluate(uid => DB.ans && DB.ans[uid], tc.uid);
      expect(persisted).toBeTruthy();
      expect(persisted.ok).toBe(setup.chosen.slice().sort().join() === setup.answer.slice().sort().join());
    }

    expect(cases.some(x => x.kind === 'single')).toBe(true);
    expect(cases.some(x => x.kind === 'multi')).toBe(true);
    for (const bank of ['b1','b2','b3','h1','h2','h3','hh']) {
      expect(cases.some(x => x.bank === bank)).toBe(true);
    }
    expect(errors).toEqual([]);
  });


  test('Question report modal submits structured context and keeps a local backup', async ({ page }) => {
    await page.addInitScript(() => { window.MBU_REPORT_ENDPOINT = 'https://report.test/submit'; });
    let submitted = null;
    await page.route('https://report.test/submit', async route => {
      submitted = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(exam + '/quiz-bank-1.html');
    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    await page.evaluate(() => mbuReportQuestion(currentData[currentIndex]));

    await expect(page.locator('#mbu-report-modal')).toHaveClass(/open/);
    await expect(page.locator('#mbu-report-summary')).toContainText('ID: b1-');
    await page.locator('#mbu-report-reason').selectOption({ label: 'Wrong answer' });
    await page.locator('#mbu-report-comment').fill('The keyed answer appears inconsistent with the source.');
    await page.locator('#mbu-report-name').fill('Regression Tester');
    await page.locator('#mbu-report-submit').click();

    await expect.poll(() => submitted).not.toBeNull();
    expect(submitted.reason).toBe('Wrong answer');
    expect(submitted.comment).toContain('keyed answer');
    expect(submitted.reporter).toBe('Regression Tester');
    expect(submitted.uid).toMatch(/^b1-/);
    expect(submitted.stem.length).toBeGreaterThan(0);
    expect(Array.isArray(submitted.options)).toBe(true);
    expect(Array.isArray(submitted.answerIndexes)).toBe(true);

    await expect.poll(async () => page.evaluate(() => {
      const d = MBUStudio.db();
      return d.reports[d.reports.length - 1]?.sent;
    })).toBe(true);
  });

  test('Calculator popup can be moved and re-centered in a quiz session', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(exam + '/quiz-bank-1.html');
    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    await page.evaluate(() => MBUCalculator.besideFlag());
    await page.locator('#mbu-calc-open').click();

    const panel = page.locator('.mbu-calc');
    const before = await panel.boundingBox();
    expect(before).not.toBeNull();

    const head = page.locator('.mbu-calc-head');
    const h = await head.boundingBox();
    expect(h).not.toBeNull();
    await page.mouse.move(h.x + 80, h.y + 15);
    await page.mouse.down();
    await page.mouse.move(h.x + 190, h.y + 85, { steps: 5 });
    await page.mouse.up();

    const moved = await panel.boundingBox();
    expect(moved.x).toBeGreaterThan(before.x + 40);
    expect(moved.y).toBeGreaterThan(before.y + 20);

    await page.locator('.mbu-calc-resetpos').click();
    const centered = await panel.boundingBox();
    const viewportCenter = await page.evaluate(() => ({
      x: document.documentElement.clientWidth / 2,
      y: document.documentElement.clientHeight / 2
    }));
    expect(Math.abs((centered.x + centered.width / 2) - viewportCenter.x)).toBeLessThan(3);
    expect(Math.abs((centered.y + centered.height / 2) - viewportCenter.y)).toBeLessThan(3);
  });


  test('Previously saved local reports can be migrated once without duplication', async ({ page }) => {
    await page.addInitScript(() => { window.MBU_REPORT_ENDPOINT = 'https://report.test/submit'; });
    const submissions = [];
    await page.route('https://report.test/submit', async route => {
      submissions.push(JSON.parse(route.request().postData() || '{}'));
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      const d = MBUStudio.db();
      d.reports = [{
        uid: 'b1-legacy-1',
        bank: 'b1',
        bankLabel: 'Quiz Bank 1',
        stem: 'Legacy locally saved report question',
        reason: 'I think this answer is wrong',
        date: '2026-09-01T12:00:00.000Z'
      }];
      MBUStudio.save(d);
      DB = d;
      showReports();
    });

    await expect(page.locator('#sendSavedReportsBtn')).toContainText('(1)');
    await page.locator('#sendSavedReportsBtn').click();

    await expect.poll(() => submissions.length).toBe(1);
    expect(submissions[0].uid).toBe('b1-legacy-1');
    expect(submissions[0].comment).toContain('I think this answer is wrong');

    await expect(page.locator('#sendSavedReportsBtn')).toHaveText('All Saved Reports Sent');
    await expect(page.locator('#savedReportStatus')).toContainText('sent successfully');

    const local = await page.evaluate(() => MBUStudio.db().reports[0]);
    expect(local.sent).toBe(true);
    expect(local.sentAt).toBeTruthy();

    await page.locator('#sendSavedReportsBtn').click({ force: true }).catch(() => {});
    expect(submissions.length).toBe(1);
  });


  test('Bank 2 recovers from malformed saved JSON', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => localStorage.setItem('srna_all5_groundup_v1', '{bad json'));
    await page.reload();
    await expect(page.locator('#dash')).toBeVisible();
    await expect(page.locator('#bank2Overall')).toContainText('/ 500 completed');
    await page.evaluate(() => startSet(0));
    await expect(page.locator('#progress')).toContainText('Question 1 of');
  });

  test('Studio recovers from malformed saved JSON', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await page.evaluate(() => localStorage.setItem('mbu_exam1_studio_v1', '{bad json'));
    await page.reload();
    await waitForStudio(page);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#quiz')).toBeHidden();
    expect(await page.evaluate(() => MBUStudio.db().active ?? null)).toBeNull();
  });

  test('Bank 1 clamps an impossible saved question index before rendering', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.evaluate(() => {
      const bad = {
        sets: {
          1: { answers: {}, graded: {}, correct: {}, strikes: {}, current: 9999 }
        },
        missed: { 1: [], 2: [], 3: [], 4: [], 5: [] },
        test6: { answers: {}, graded: {}, correct: {}, strikes: {}, current: 0 }
      };
      localStorage.setItem('SRNA_COMBINED_EXAM_SET_1_2026_V1', JSON.stringify(bad));
    });
    await page.reload();
    await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
    await expect(page.locator('#quiz')).toBeVisible();
    await expect(page.locator('#progress')).toContainText('Question 100 of 100');
    expect(await page.locator('#stem').textContent()).toBeTruthy();
  });

  test('Bank 2 clamps impossible saved positions and remains usable', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => {
      localStorage.setItem('srna_all5_groundup_v1', JSON.stringify({
        sets: {
          0: { answered: {}, missed: [], selections: {}, crosses: {}, current: -200 }
        }
      }));
    });
    await page.reload();
    await page.evaluate(() => startSet(0));
    await expect(page.locator('#progress')).toContainText('Question 1 of');
    await expect(page.locator('#choices .choice').first()).toBeVisible();

    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('srna_all5_groundup_v1'));
      d.sets['0'].current = 9999;
      localStorage.setItem('srna_all5_groundup_v1', JSON.stringify(d));
    });
    await page.reload();
    await page.evaluate(() => startSet(0));
    await expect(page.locator('#progress')).toContainText('Question 100 of 100');
  });

  test('Studio clamps an impossible active-session position on resume', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    await page.evaluate(() => {
      const qs = ALL.slice(0, 3);
      DB.active = {
        uids: qs.map(q => q.uid),
        pos: 9999,
        answers: {},
        updated: Date.now()
      };
      save();
      renderHome();
    });
    await expect(page.locator('#resumeActive')).toBeVisible();
    await page.locator('#resumeActive').click();
    await expect(page.locator('#qprog')).toContainText('Question 3 of 3');
    expect(await page.evaluate(() => pos)).toBe(2);
  });

  test('Studio recovers a partially missing active session without crashing', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    const keptUid = await page.evaluate(() => {
      const q = ALL[0];
      DB.active = {
        uids: ['missing:uid', q.uid, 'also:missing'],
        pos: 2,
        answers: { [q.uid]: { ok: true, selected: [...q.ans], at: Date.now() } },
        updated: Date.now()
      };
      save();
      return q.uid;
    });
    await page.reload();
    await waitForStudio(page);
    await expect(page.locator('#resumeActive')).toContainText('Question 1 / 1');
    const active = await page.evaluate(() => MBUStudio.db().active);
    expect(active.uids).toEqual([keptUid]);
    expect(active.pos).toBe(0);
  });

  test('Updater tolerates malformed cached baseline and establishes a valid build id', async ({ page }) => {
    await page.goto(exam + '/index.html');
    await page.evaluate(() => sessionStorage.setItem('mbu_build_manifest_v1', ''));
    await page.reload();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('mbu_build_manifest_v1'))).not.toBeNull();
    const value = await page.evaluate(() => sessionStorage.getItem('mbu_build_manifest_v1'));
    expect(value).toMatch(/^2026-/);
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
