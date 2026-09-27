const { test, expect } = require('@playwright/test');
const { exam, clearAppState, seedSignedIn, waitForAuth, collectPageErrors, waitForStudio, storageJSON } = require('./helpers');

async function clickIndexes(locator, indexes) {
  for (const index of indexes) await locator.nth(index).click();
}

test.describe('canonical quiz regression', () => {
  test.beforeEach(async ({ page }) => clearAppState(page));

  test('Studio persists normalized legacy keys and removes false flag entries', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await page.evaluate(() => localStorage.setItem('mbu_exam1_studio_v1', JSON.stringify({
      ans:{'bb1-legacy':{ok:false,at:1,topic:'Other',bank:'b1'}},
      flags:{'bb1-legacy':false},
      crosses:{},
      reports:[]
    })));
    await page.reload();
    await waitForStudio(page);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('mbu_exam1_studio_v1')));
    expect(stored.ans['b1-legacy']).toBeTruthy();
    expect(stored.ans['bb1-legacy']).toBeUndefined();
    const q = await page.evaluate(() => ALL.find(x=>x.bank==='b1'));
    expect(q).toBeTruthy();
    await page.evaluate(uid => {
      const q=ALL_BY_UID.get(uid);
      MBUStudio.toggleFlag(q.bank,q);
      MBUStudio.toggleFlag(q.bank,q);
    }, q.uid);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('mbu_exam1_studio_v1')));
    expect(after.flags[q.uid]).toBeUndefined();
  });

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

  for (const [label,file,key] of [
    ['Bank 2','quiz-bank-2.html','srna_all5_groundup_v1'],
    ['Bank 3','quiz-bank-3.html','srna_equipment_dashboard_v1']
  ]) {
    test(label + ' uses the canonical engine and resumes submitted progress', async ({ page }) => {
      const errors=collectPageErrors(page);
      await page.goto(exam + '/' + file);
      await page.evaluate(() => MBUQuizReady);
      await expect(page.locator('#dashboard')).toBeVisible();
      await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
      await expect(page.locator('#quiz')).toBeVisible();
      const answer=await page.evaluate(() => SETS[1][0].answer);
      await clickIndexes(page.locator('#options .opt'),answer);
      let state=await storageJSON(page,key);
      expect(state?.sets?.['1']?.graded?.['0']).toBeUndefined();
      await page.locator('#submit-multi').click();
      await expect(page.locator('#progress')).toContainText('Question 2 of');
      state=await storageJSON(page,key);
      expect(state.sets['1'].graded['0']).toBe(true);
      expect(state.sets['1'].current).toBe(1);
      await page.reload();
      await page.evaluate(() => MBUQuizReady);
      await page.locator('#cards button').filter({ hasText: /continue/i }).first().click();
      await expect(page.locator('#progress')).toContainText('Question 2 of');
      expect(errors).toEqual([]);
    });
  }

  test('Bank 2 migrates legacy saved progress into canonical Bank 1 state', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('srna_all5_groundup_v1', JSON.stringify({
        sets:{
          0:{
            answered:{0:true,1:false},
            missed:[1],
            selections:{0:[0],1:[0]},
            crosses:{1:[2]},
            current:1
          }
        }
      }));
    });
    await page.goto(exam + '/quiz-bank-2.html');
    await page.evaluate(() => MBUQuizReady);
    const state=await storageJSON(page,'srna_all5_groundup_v1');
    expect(state.sets['1'].graded['0']).toBe(true);
    expect(state.sets['1'].correct['0']).toBe(true);
    expect(state.sets['1'].graded['1']).toBe(true);
    expect(state.sets['1'].correct['1']).toBe(false);
    expect(state.sets['1'].strikes['1_2']).toBe(true);
    expect(state.sets['1'].current).toBe(1);
    expect(state.missed['1']).toContain(await page.evaluate(() => SETS[1][1].id));
    await expect(page.locator('#overall')).toContainText('2 / 500 completed');
  });

  test('Bank 3 migrates legacy saved progress and cross-outs into canonical Bank 1 state', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('srna_equipment_dashboard_v1', JSON.stringify({
        ex:{
          1:{
            idx:1,
            ans:{
              'S1-M01':{sel:[0],ok:true},
              'S1-G27':{sel:[0],ok:false}
            },
            xo:{'S1-G27':[2]}
          }
        },
        cleared:{},
        t6:null,
        t6hist:[]
      }));
    });
    await page.goto(exam + '/quiz-bank-3.html');
    await page.evaluate(() => MBUQuizReady);
    const state=await storageJSON(page,'srna_equipment_dashboard_v1');
    expect(state.sets['1'].graded['0']).toBe(true);
    expect(state.sets['1'].correct['0']).toBe(true);
    expect(state.sets['1'].graded['1']).toBe(true);
    expect(state.sets['1'].correct['1']).toBe(false);
    expect(state.sets['1'].strikes['1_2']).toBe(true);
    expect(state.sets['1'].current).toBe(1);
    expect(state.missed['1']).toContain('S1-G27');
    await expect(page.locator('#overall')).toContainText('2 / 500 completed');
  });

  for (const [label,file,key] of [
    ['Bank 2','quiz-bank-2.html','srna_all5_groundup_v1'],
    ['Bank 3','quiz-bank-3.html','srna_equipment_dashboard_v1']
  ]) {
    test(label + ' recovers malformed state and clamps canonical position', async ({ page }) => {
      await page.goto(exam + '/' + file);
      await page.evaluate(k=>localStorage.setItem(k,'{bad json'),key);
      await page.reload();
      await page.evaluate(() => MBUQuizReady);
      await expect(page.locator('#dashboard')).toBeVisible();
      await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({
        sets:{1:{answers:{},graded:{},correct:{},strikes:{},current:9999}},
        missed:{1:[],2:[],3:[],4:[],5:[]},
        test6:{answers:{},graded:{},correct:{},strikes:{},current:0}
      })),key);
      await page.reload();
      await page.evaluate(() => MBUQuizReady);
      await page.locator('#cards button').filter({ hasText: /start|continue/i }).first().click();
      await expect(page.locator('#progress')).toContainText('Question 100 of 100');
      await expect(page.locator('#options .opt').first()).toBeVisible();
    });
  }

  test('Bank 3 multi-select feedback and lazy figure loading use canonical session UI', async ({ page }) => {
    const imageRequests=[];
    page.on('request',req=>{if(req.url().includes('/images/bank3/'))imageRequests.push(req.url())});
    await page.goto(exam + '/quiz-bank-3.html');
    await page.evaluate(() => MBUQuizReady);
    expect(imageRequests).toHaveLength(0);
    const data=await page.evaluate(() => {
      const set=Object.keys(SETS).map(Number).find(s=>SETS[s].some(q=>q.type==='multi'&&q.answer.length>1&&q.options.some((_,i)=>!q.answer.includes(i))));
      const idx=SETS[set].findIndex(q=>q.type==='multi'&&q.answer.length>1&&q.options.some((_,i)=>!q.answer.includes(i)));
      currentSet=set;currentData=SETS[set];currentIndex=idx;showQuiz();loadQuestion();
      const q=currentData[currentIndex],wrong=q.options.findIndex((_,i)=>!q.answer.includes(i));
      return {answer:q.answer,chosen:[...q.answer.slice(0,-1),wrong]};
    });
    await clickIndexes(page.locator('#options .opt'),data.chosen);
    await page.locator('#submit-multi').click();
    for(const i of data.answer) await expect(page.locator('#options .opt').nth(i)).toHaveClass(/correct/);
    await expect(page.locator('#options .opt.incorrect')).toHaveCount(1);

    await page.evaluate(() => {
      for(const set of Object.keys(SETS).map(Number)){
        const idx=SETS[set].findIndex(q=>q.imageId);
        if(idx>=0){currentSet=set;currentData=SETS[set];currentIndex=idx;showQuiz();loadQuestion();return}
      }
      throw new Error('No Bank 3 image question found');
    });
    await expect(page.locator('#image img')).toBeVisible({timeout:10000});
    expect(new Set(imageRequests).size).toBe(1);
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
    await page.evaluate(() => MBUPageReady);
    const answer = await page.evaluate(async () => {
      const data=await (await fetch('data/hazards.json',{cache:'no-store'})).json();
      return data.questions.find(q=>Number(q.set)===3).answer;
    });
    await clickIndexes(page.locator('#choices .opt'), answer);
    await page.locator('#go').click();
    await expect(page.locator('.progress')).toContainText('Question 2 of');

    const state = await storageJSON(page, 'hazards_practice3_progress_2026_V2');
    expect(state.ans[Object.keys(state.ans)[0]].ok).toBe(true);
    await page.reload();
    await expect(page.locator('.progress')).toContainText('Question 2 of');
  });

  test('Standard Hazards ignores duplicate submit calls for a graded question', async ({ page }) => {
    await page.goto(exam + '/hazards-100.html');await page.evaluate(() => MBUQuizReady);
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    const before=await page.evaluate(()=>MBUStudyIntelligence.analytics().overall.attempts);
    const options=page.locator('#options .opt');
    for(let i=0;i<await options.count();i++){
      if(await page.locator('#submit-multi').isEnabled())break;
      await options.nth(i).click();
    }
    await expect(page.locator('#submit-multi')).toBeEnabled();
    await page.locator('#submit-multi').click();
    await page.evaluate(()=>submitAnswer());
    const after=await page.evaluate(()=>MBUStudyIntelligence.analytics().overall.attempts);
    expect(after-before).toBe(1);
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
    await page.evaluate(() => MBUPageReady);
    const answer = await page.evaluate(async () => {
      const data=await (await fetch('data/hazards.json',{cache:'no-store'})).json();
      return data.questions.find(q=>Number(q.set)===4).answer;
    });
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

  test('Combined dashboard matches Bank 1 card structure', async ({ page }) => {
    await page.goto(exam + '/combined.html');
    await expect(page.locator('#cards .card')).toHaveCount(4);
    for(let set=1;set<=3;set++){
      const card=page.locator('#cards .card').nth(set-1);
      await expect(card).toContainText('Practice Set '+set);
      await expect(card).toContainText('50 questions');
      await expect(card).toContainText('0/50 completed · 0% score · 0 missed');
      await expect(card.getByRole('button',{name:'Start Practice Set '+set})).toBeVisible();
      await expect(card.getByRole('button',{name:'Review Missed'})).toBeDisabled();
    }
    const missed=page.locator('#cards .card').nth(3);
    await expect(missed).toContainText('Missed Questions Review');
    await expect(missed).toContainText('Automatically built from every question missed in Practice Sets 1–3.');
    await expect(missed.getByRole('button',{name:'Review Missed Questions'})).toBeDisabled();
  });

  test('Combined bank loads, navigates, and persists a submitted answer', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(exam + '/combined.html');
    await expect(page.locator('#overall')).toContainText('0 / 150 completed');
    await page.locator('#cards button').filter({ hasText: /start/i }).first().click();
    await expect(page.locator('#quiz')).toBeVisible();
    await page.locator('button').filter({ hasText: 'Navigator' }).click();
    await expect(page.locator('#mbuNavigator button')).toHaveCount(50);
    await expect(page.locator('#mbuNavigator button').first()).toHaveAttribute('aria-current','step');

    const answer = await page.evaluate(() => QUESTIONS[0].answer);
    await clickIndexes(page.locator('#options .opt'), answer);
    await page.locator('#submit-multi').click();
    await expect.poll(async () => {
      const state = await storageJSON(page, 'MBU_COMBINED_BANK_2026_V1');
      return Object.keys(state?.sets?.['1']?.graded || {}).filter(k => state.sets['1'].graded[k]).length;
    }).toBe(1);

    await page.reload();
    await expect(page.locator('#overall')).toContainText('1 / 150 completed');
    expect(errors).toEqual([]);
  });

  test('Combined repairs legacy missed and score state in the live stats bar', async ({ page }) => {
    await page.goto(exam + '/combined.html');
    const legacy = await page.evaluate(async () => {
      const data=await (await fetch('data/combined.json',{cache:'no-store'})).json();
      const qs=data.questions.filter(q=>Number(q.set)===1);
      const st={answers:{},graded:{},correct:{},strikes:{},current:13};
      for(let i=0;i<13;i++){
        const q=qs[i],id=q.id;
        st.answers[id]=[q.answer[0]];
        st.graded[id]=true;
        st.correct[id]=!(i===0||i===7);
      }
      return {sets:{1:st,2:{answers:{},graded:{},correct:{},strikes:{},current:0},3:{answers:{},graded:{},correct:{},strikes:{},current:0}}};
    });
    await page.evaluate(v=>localStorage.setItem('MBU_COMBINED_BANK_2026_V1',JSON.stringify(v)),legacy);
    await page.reload();
    await page.getByRole('button',{name:'Continue Practice Set 1'}).click();
    await expect(page.locator('#completed')).toHaveText('13');
    await expect(page.locator('#total')).toHaveText('50');
    await expect(page.locator('#score')).toHaveText('85');
    await expect(page.locator('#missed')).toHaveText('2');
    await page.getByRole('button',{name:'Navigator'}).click();
    await expect(page.locator('#mbuNavigator button.correct')).toHaveCount(11);
    await expect(page.locator('#mbuNavigator button.incorrect')).toHaveCount(2);
  });

  test('Combined wrong-answer feedback matches Bank 1', async ({ page }) => {
    await page.goto(exam + '/combined.html');
    await page.locator('#cards button').filter({ hasText: /start/i }).first().click();
    const data = await page.evaluate(() => {
      const q=QUESTIONS.find(x=>x.type==='single'&&x.options.length>1);
      const set=q.set,index=SETS[set].findIndex(x=>x.id===q.id);
      currentSet=set;currentData=SETS[set];currentIndex=index;loadQuestion();
      const correct=q.answer[0],wrong=q.options.findIndex((_,i)=>i!==correct);
      return {correct,wrong};
    });
    await page.locator('#options .opt').nth(data.wrong).click();
    await page.locator('#submit-multi').click();
    await expect(page.locator('#options .opt').nth(data.correct)).toHaveClass(/correct/);
    await expect(page.locator('#options .opt').nth(data.wrong)).toHaveClass(/incorrect/);
    await expect(page.locator('#options .opt.missed')).toHaveCount(0);
  });

  test('Combined exposes the calculator and final Next exits like Bank 1', async ({ page }) => {
    await page.goto(exam + '/combined.html');
    await page.locator('#cards button').filter({ hasText: /start/i }).first().click();
    await expect(page.locator('#mbu-calc-open')).toBeVisible();

    await page.evaluate(() => {
      currentIndex=currentData.length-1;
      persistPosition();
      loadQuestion();
    });
    const answer = await page.evaluate(() => currentData[currentIndex].answer);
    await clickIndexes(page.locator('#options .opt'), answer);
    await page.locator('#submit-multi').click();
    await expect(page.locator('#next')).toBeVisible();
    await expect(page.locator('#next')).toBeEnabled();
    await page.locator('#next').click();
    await expect(page.locator('#dashboard')).toBeVisible();
  });

  test('Calculator clears expression and Ans when closed and reopened', async ({ page }) => {
    await page.goto(exam + '/combined.html');
    await page.locator('#cards button').filter({ hasText: /start/i }).first().click();
    await page.locator('#mbu-calc-open').click();
    await page.locator('#mbu-calc-display').fill('2+3');
    await page.locator('#mbu-calc-display').press('Enter');
    await expect(page.locator('#mbu-calc-display')).toHaveValue('5');
    await page.locator('.mbu-calc-close').click();
    await page.locator('#mbu-calc-open').click();
    await expect(page.locator('#mbu-calc-display')).toHaveValue('');
    await page.getByRole('button',{name:'Ans',exact:true}).click();
    await expect(page.locator('#mbu-calc-display')).toHaveValue('0');
  });

  test('SRNA Study Tool brand hard refreshes the current page with a cache-busting URL', async ({ page }) => {
    await page.goto(exam + '/combined.html');
    const beforePath = new URL(page.url()).pathname;
    await page.locator('.mbu-global-nav__brand').click();
    await page.waitForURL(url => url.searchParams.has('_mbu_refresh'));
    expect(new URL(page.url()).pathname).toBe(beforePath);
  });

  test('Combined fetches only the needed image asset when an image question is opened', async ({ page }) => {
    const imageRequests=[];
    page.on('request',req=>{if(req.url().includes('/images/combined/'))imageRequests.push(req.url())});
    await page.goto(exam + '/combined.html');
    await expect(page.locator('#overall')).toContainText('/ 150 completed');
    expect(imageRequests).toHaveLength(0);
    const target=await page.evaluate(async () => {
      const data=await (await fetch('data/combined.json',{cache:'no-store'})).json();
      const q=data.questions.find(x=>x.imageId);
      if(!q)throw new Error('No Combined image question exists');
      const inSet=data.questions.filter(x=>Number(x.set)===Number(q.set));
      return {set:Number(q.set),index:inSet.findIndex(x=>x.id===q.id)};
    });
    await page.locator('#cards .card').nth(target.set-1).getByRole('button',{name:/start|continue/i}).click();
    await page.getByRole('button',{name:'Navigator'}).click();
    await page.locator('#mbuNavigator button').nth(target.index).click();
    await expect(page.locator('#image img')).toBeVisible();
    expect(imageRequests.length).toBe(1);
  });

  test('Studio imports all Combined questions and lazily hydrates a Combined figure', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    expect(await page.evaluate(() => ALL.filter(q => q.bank === 'combined').length)).toBe(150);
    await page.evaluate(() => {
      const q = ALL.find(x => x.bank === 'combined' && x.img);
      if (!q) throw new Error('No Combined image question loaded');
      session = [q];
      pos = 0;
      DB.active = { uids:[q.uid], pos:0, answers:{}, updated:Date.now() };
      save();
      showQ();
    });
    await expect(page.locator('#qimage img')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Studio source selector exposes every bank and practice set', async ({ page }) => {
    await page.goto(exam + '/studio.html');
    await expect(page.locator('#sourceChecks input[type="checkbox"]')).toHaveCount(22);
    await waitForStudio(page);
    await expect(page.locator('#sourceChecks')).toContainText('Quiz Bank 1');
    await expect(page.locator('#sourceChecks')).toContainText('Quiz Bank 2');
    await expect(page.locator('#sourceChecks')).toContainText('Quiz Bank 3');
    await expect(page.locator('#sourceChecks')).toContainText('Combined');
    await expect(page.locator('#sourceChecks')).toContainText('Workstation Hazards');
    await expect(page.locator('#sourceChecks input[type="checkbox"]')).toHaveCount(22);
    const selector = await page.evaluate(() => {
      const el=document.getElementById('sourceChecks'),last=el.querySelector('input[type="checkbox"]:last-of-type');
      el.scrollTop=el.scrollHeight;
      return {scrollable:el.scrollHeight>el.clientHeight+1,lastReachable:!!last&&last.getBoundingClientRect().bottom<=el.getBoundingClientRect().bottom+2};
    });
    expect(selector.scrollable).toBe(true);
    expect(selector.lastReachable).toBe(true);
  });

  test('Hazards dashboard ignores unsubmitted answer selections', async ({ page }) => {
    await page.goto(exam + '/hazards.html');
    await page.evaluate(() => localStorage.setItem('SRNA_HAZARDS_BANK_1_2026_V2', JSON.stringify({
      answers:{'1':[0]},
      graded:{},
      correct:{},
      strikes:{},
      current:0,
      missed:[]
    })));
    await page.reload();
    await expect(page.locator('#hazOverall')).toContainText('0 / 350 completed');
    await expect(page.locator('#hazSet1Stats')).toContainText('0/100 completed');
  });

  test('Hazards cumulative missed review routes directly to Studio', async ({ page }) => {
    await page.goto(exam + '/hazards.html');
    const target = await page.locator('a[href*="studio.html?mode=hazards-missed&return=hazards"], button[onclick*="studio.html?mode=hazards-missed&return=hazards"]').first().evaluate(el => el.getAttribute('href') || el.getAttribute('onclick') || '');
    expect(target).toContain('studio.html?mode=hazards-missed&return=hazards');
    await page.goto(exam + '/studio.html?mode=hazards-missed&return=hazards');
    await waitForStudio(page);
    await expect(page.locator('#studioTitle')).toContainText('Workstation Hazards');
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

  test('Studio lazily loads canonical Bank 3 figures from indexed image assets', async ({ page }) => {
    const errors = collectPageErrors(page);
    const imageResponses = [];
    page.on('response', response => {
      if (/\/equipment\/exam-1\/images\/bank3\/[A-Za-z0-9_-]+\.png(?:\?|$)/.test(response.url())) {
        imageResponses.push({ url: response.url(), status: response.status() });
      }
    });
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    const figure = await page.evaluate(() => {
      const q = (BANK_QUESTIONS.get('b3') || []).find(x => x.img && x.img.kind === 'direct');
      if (!q) throw new Error('No indexed Bank 3 figure question found');
      session = [q]; pos = 0;
      DB.active = { uids: [q.uid], pos: 0, answers: {}, updated: Date.now() };
      save(); showQ();
      return { uid: q.uid, url: q.img.url };
    });
    expect(figure.uid).toBeTruthy();
    expect(figure.url).toMatch(/^images\/bank3\/[A-Za-z0-9_-]+\.png$/);
    await expect(page.locator('#qimage img')).toHaveAttribute('src', /^images\/bank3\/[A-Za-z0-9_-]+\.png$/, { timeout: 10000 });
    await expect.poll(() => imageResponses.some(x => x.status === 200 || x.status === 304)).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('Studio isolates a failed source and retries only that source', async ({ page }) => {
    let failBank3 = true;
    await page.route('**/data/bank3.json', async route => {
      if (failBank3) {
        failBank3 = false;
        await route.fulfill({ status: 503, body: 'temporary failure' });
      } else {
        await route.continue();
      }
    });
    await page.goto(exam + '/studio.html');
    await expect(page.locator('#studioLoadPanel')).toBeVisible();
    await expect(page.locator('#studioLoadSummary')).toContainText('1 failed');
    await expect(page.locator('#studio-retry-b3')).toBeVisible();
    expect(await page.evaluate(() => BANK_QUESTIONS.get('b3')?.length || 0)).toBe(0);
    expect(await page.evaluate(() => BANK_QUESTIONS.get('b1')?.length || 0)).toBe(500);
    await page.locator('#studio-retry-b3').click();
    await expect.poll(() => page.evaluate(() => BANK_QUESTIONS.get('b3')?.length || 0), { timeout: 15000 }).toBe(500);
    await expect(page.locator('#studioLoadPanel')).toBeHidden();
    expect(await page.evaluate(() => ALL_BY_UID.size)).toBe(2000);
  });

  test('Studio startup does not rewrite unchanged Studio storage', async ({ page }) => {
    await page.addInitScript(() => {
      window.__studioStoreWrites = 0;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage && key === 'mbu_exam1_studio_v1') window.__studioStoreWrites++;
        return original.call(this, key, value);
      };
    });
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    expect(await page.evaluate(() => window.__studioStoreWrites)).toBe(0);
  });

  test('Studio normalizes structurally corrupt saved state before rendering', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mbu_exam1_studio_v1', JSON.stringify({ans:'bad',flags:[],crosses:null,reports:[null,'bad',{uid:'bb1-legacy',bank:'1',stem:'Saved report'}],active:{uids:'bad',pos:'bad',answers:null},searchReturn:{uids:[null],pos:99,answers:[]}})));
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    const state=await page.evaluate(() => MBUStudio.db());
    expect(state.ans).toEqual({});expect(state.flags).toEqual({});expect(state.crosses).toEqual({});
    expect(state.reports).toHaveLength(1);expect(state.reports[0].uid).toBe('b1-legacy');expect(state.reports[0].bank).toBe('b1');
    expect(state.active).toBeNull();expect(state.searchReturn).toBeNull();
  });

  test('Studio preserves an active session while its source is temporarily unavailable', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const uid=await page.evaluate(() => (BANK_QUESTIONS.get('b3')||[])[0].uid);
    await page.evaluate(uid => {DB.active={uids:[uid],pos:0,answers:{},updated:Date.now()};save()},uid);
    let failBank3=true;
    await page.route('**/data/bank3.json', async route => {if(failBank3){failBank3=false;await route.fulfill({status:503,body:'temporary failure'})}else await route.continue()});
    await page.reload();
    await expect(page.locator('#studioLoadSummary')).toContainText('1 failed');
    await expect(page.locator('#resumeActive')).toBeDisabled();
    expect((await storageJSON(page,'mbu_exam1_studio_v1')).active.uids).toEqual([uid]);
    await page.locator('#studio-retry-b3').click();
    await expect.poll(() => page.evaluate(() => BANK_QUESTIONS.get('b3')?.length||0),{timeout:15000}).toBe(500);
    await expect(page.locator('#resumeActive')).toBeEnabled();await page.locator('#resumeActive').click();
    await expect(page.locator('#qprog')).toContainText('Question 1 of 1');
  });

  test('Studio unflagging removes the key instead of restoring a false flag', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const uid=await page.evaluate(() => {session=[ALL[0]];pos=0;DB.active={uids:[session[0].uid],pos:0,answers:{},updated:Date.now()};save();showQ();return session[0].uid});
    await page.locator('#flagBtn').click();await page.locator('#flagBtn').click();
    expect((await storageJSON(page,'mbu_exam1_studio_v1')).flags[uid]).toBeUndefined();
  });

  test('Studio reset batches answer and cross-out cleanup into one storage write', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(() => {
      session=[ALL.find(q=>q.ans.length===1)];pos=0;const q=session[0];
      DB.active={uids:[q.uid],pos:0,answers:{[q.uid]:{ok:false,selected:[0],at:Date.now()}},updated:Date.now()};DB.crosses[q.uid+':1']=true;save();showQ();
      window.__resetWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==='mbu_exam1_studio_v1')window.__resetWrites++;return original.call(this,key,value)};
    });
    await page.locator('button',{hasText:'Reset'}).click();
    expect(await page.evaluate(() => window.__resetWrites)).toBe(1);
    expect(await page.evaluate(() => Object.keys(DB.crosses).length)).toBe(0);expect(await page.evaluate(() => sessionAnswer(session[0].uid))).toBeFalsy();
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
    ['Bank 2', 'quiz-bank-2.html', '#overall'],
    ['Bank 3', 'quiz-bank-3.html', '#overall']
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
    expect(counts).toEqual({ b1: 500, b2: 500, b3: 500, combined: 150, h1: 100, h2: 100, h3: 100, hh: 50 });
    expect(await page.evaluate(() => ALL_BY_UID.size)).toBe(2000);
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
    await page.evaluate(() => MBUPageReady);
    const data = await page.evaluate(async () => {
      const raw=await (await fetch('data/hazards.json',{cache:'no-store'})).json();
      const q=raw.questions.find(x=>Number(x.set)===3);
      return { answer:q.answer, optionCount:q.options.length, multi:q.type==='multi' };
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
    const seeded=await page.evaluate(async () => {
      const data=await (await fetch('data/bank1.json',{cache:'no-store'})).json();
      const qs=data.questions.filter(q=>Number(q.set)===1);
      const st={answers:{},graded:{},correct:{},strikes:{},current:99};
      for(let i=0;i<99;i++){
        st.answers[String(i)]=[...qs[i].answer];
        st.graded[String(i)]=true;
        st.correct[String(i)]=true;
      }
      const state={sets:{1:st,2:{answers:{},graded:{},correct:{},strikes:{},current:0},3:{answers:{},graded:{},correct:{},strikes:{},current:0},4:{answers:{},graded:{},correct:{},strikes:{},current:0},5:{answers:{},graded:{},correct:{},strikes:{},current:0}},missed:{1:[],2:[],3:[],4:[],5:[]}};
      localStorage.setItem('SRNA_COMBINED_EXAM_SET_1_2026_V1',JSON.stringify(state));
      return qs[99].answer;
    });
    await page.reload();
    await page.locator('#cards button').filter({hasText:/continue/i}).first().click();
    await expect(page.locator('#progress')).toContainText('Question 100 of 100');
    await clickIndexes(page.locator('#options .opt'), seeded);
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
    await page.locator('#mbu-report-submit').click();

    await expect.poll(() => submitted).not.toBeNull();
    expect(submitted.reason).toBe('Wrong answer');
    expect(submitted.comment).toContain('keyed answer');
    expect(submitted.reporter).toBeUndefined();
    expect(submitted.userAgent).toBeUndefined();
    expect(submitted.pageUrl).not.toMatch(/[?#]/);
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


  test('Calculator resets its display and Ans value after closing', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    await page.evaluate(() => MBUCalculator.besideFlag());
    await page.locator('#mbu-calc-open').click();
    await page.locator('#mbu-calc-display').fill('2+3');
    await page.locator('#mbu-calc-display').press('Enter');
    await expect(page.locator('#mbu-calc-display')).toHaveValue('5');
    await page.locator('.mbu-calc-close').click();
    await page.locator('#mbu-calc-open').click();
    await expect(page.locator('#mbu-calc-display')).toHaveValue('');
    await page.getByRole('button',{name:'Ans',exact:true}).click();
    await expect(page.locator('#mbu-calc-display')).toHaveValue('0');
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
    await expect.poll(
      () => page.evaluate(() => sessionStorage.getItem('mbu_build_manifest_v1')),
      { timeout: 10000 }
    ).toMatch(/^2026-/);
  });


  for (const [label, file, key] of [
    ['Hazards Set 1', 'hazards-100.html', 'SRNA_HAZARDS_BANK_1_2026_V2'],
    ['Hazards Set 2', 'hazards-bank-2.html', 'SRNA_HAZARDS_BANK_2_2026_V1']
  ]) {
    test(label + ' normalizes structurally corrupted saved state', async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(exam + '/' + file);
      await page.evaluate(k => localStorage.setItem(k, JSON.stringify({
        answers: null,
        graded: null,
        correct: 'bad',
        strikes: [],
        current: 9999,
        missed: [1, 1, 'missing', null]
      })), key);
      await page.reload();

      await expect(page.locator('#dashboard')).toBeVisible();
      await page.locator('#hazStart').click();
      await expect(page.locator('#quiz')).toBeVisible();
      await expect(page.locator('#progress')).toContainText('Question 100 of 100');
      await expect(page.locator('#options .opt').first()).toBeVisible();
      expect(errors).toEqual([]);

      const state = await storageJSON(page, key);
      expect(Array.isArray(state.missed)).toBe(true);
    });
  }

  for (const [label, file, key] of [
    ['Hazards Set 3', 'hazards-bank-3.html', 'hazards_practice3_progress_2026_V2'],
    ['Hazards Challenge', 'hazards-harder.html', 'hazards_harder_progress_2026_V1']
  ]) {
    test(label + ' normalizes structurally corrupted saved state', async ({ page }) => {
      const errors = collectPageErrors(page);
      await page.goto(exam + '/' + file);
      await page.evaluate(k => localStorage.setItem(k, JSON.stringify({
        idx: 9999,
        ans: null,
        xo: null,
        prac: { list: ['missing'], i: 500, ans: null },
        view: 'quiz'
      })), key);
      await page.reload();

      await expect(page.locator('#main')).toBeVisible();
      await expect(page.locator('#main .panel, #main .card')).toBeVisible();
      expect(errors).toEqual([]);

      const state = await storageJSON(page, key);
      expect(state).not.toBeNull();
    });
  }

  test('Studio shared assets use the current build id with no manual revisions', async ({ page }) => {
    const requests=[];
    page.on('request', req => { if (req.url().includes('/equipment/assets/')) requests.push(req.url()); });
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    const build=await page.evaluate(() => window.MBU_BUILD_ID);
    const versioned=requests.filter(url=>!/build-bootstrap\.js(?:\?|$)/.test(url));
    expect(versioned.length).toBeGreaterThan(0);
    expect(versioned.every(url => new URL(url).searchParams.get('b') === build)).toBeTruthy();
    expect(versioned.some(url => new URL(url).searchParams.has('v'))).toBeFalsy();
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('mbu_build_manifest_v1'))).not.toBeNull();
  });

  test('Canonical banks are manifest-configured shells with no duplicated page runtime', async ({ page }) => {
    for (const [file,label,total] of [
      ['quiz-bank-1.html','Quiz Bank 1','500'],
      ['quiz-bank-2.html','Quiz Bank 2','500'],
      ['quiz-bank-3.html','Quiz Bank 3','500'],
      ['combined.html','Combined','150']
    ]) {
      await page.goto(exam + '/' + file);
      await expect(page.locator('#dashboard')).toBeVisible();
      await expect(page.locator('#overall')).toContainText(total);
      await expect(page.locator('.mbu-dashboard-title h1')).toContainText(label);
      const expectedId={'quiz-bank-1.html':'bank1','quiz-bank-2.html':'bank2','quiz-bank-3.html':'bank3','combined.html':'combined'}[file];
      expect(await page.evaluate(() => MBU_QUIZ_CONFIG.id)).toBe(expectedId);
    }
  });

  test('Canonical bank assets use the current build id without manual revision numbers', async ({ page }) => {
    const requests=[];
    page.on('request',req=>{if(req.url().includes('/equipment/assets/'))requests.push(req.url())});
    await page.goto(exam + '/quiz-bank-1.html');
    await expect(page.locator('#dashboard')).toBeVisible();
    const build=await page.evaluate(async()=>{const r=await fetch('../build.json',{cache:'no-store'});return (await r.json()).build});
    const canonical=requests.filter(url=>/canonical-bank-page|site-nav|bank1-quiz-ui|studio-sync|navigator|calculator|quiz-engine|auto-update/.test(url));
    expect(canonical.length).toBeGreaterThanOrEqual(8);
    expect(canonical.every(url=>new URL(url).searchParams.get('b')===build)).toBeTruthy();
    expect(canonical.some(url=>new URL(url).searchParams.has('v'))).toBeFalsy();
  });

  test('Hazards shared assets use the current build id with no manual revisions', async ({ page }) => {
    const requests=[];page.on('request',req=>{if(req.url().includes('/equipment/assets/'))requests.push(req.url())});
    await page.goto(exam + '/hazards-bank-3.html');
    await expect(page.locator('#main')).toBeVisible();
    await page.evaluate(() => MBUPageReady);
    const build=await page.evaluate(() => window.MBU_BUILD_ID);
    const versioned=requests.filter(url=>!/build-bootstrap\.js(?:\?|$)/.test(url));
    expect(versioned.length).toBeGreaterThan(0);
    expect(versioned.every(url=>new URL(url).searchParams.get('b')===build)).toBeTruthy();
    expect(versioned.some(url=>new URL(url).searchParams.has('v'))).toBeFalsy();
  });

  test('Application dashboards load shared navigation through the build bootstrap', async ({ page }) => {
    for(const file of ['/','/equipment/','/equipment/exam-1/','/equipment/exam-1/hazards.html']){
      await page.goto(file);
      await page.evaluate(() => MBUPageReady);
      await expect(page.locator('.mbu-global-nav')).toBeVisible();
      expect(await page.evaluate(() => !!window.MBU_BUILD_ID)).toBe(true);
    }
  });

  test('Canonical Bank 1 startup performs one request per shared dependency and data source', async ({ page }) => {
    const counts={};
    page.on('request',req=>{
      const u=new URL(req.url()),p=u.pathname;
      if(p.includes('/equipment/assets/')||p.includes('/equipment/exam-1/data/')||p.endsWith('/equipment/exam-1/banks.json')) counts[p]=(counts[p]||0)+1;
    });
    await page.goto(exam + '/quiz-bank-1.html');
    await page.evaluate(() => MBUPageReady);
    await expect(page.locator('#dashboard')).toBeVisible();

    for(const name of ['canonical-bank-page.js','site-nav.css','bank1-quiz-ui.css','site-nav.js','studio-sync.js','navigator.js','calculator.js','quiz-engine.js','auto-update.js']){
      const matches=Object.entries(counts).filter(([p])=>p.endsWith('/'+name));
      expect(matches).toHaveLength(1);
      expect(matches[0][1], name+' request count').toBe(1);
    }
    expect(counts['/equipment/exam-1/banks.json']).toBe(1);
    expect(counts['/equipment/exam-1/data/bank1.json']).toBe(1);
  });

  test('Studio hydration deduplicates shared canonical data requests', async ({ page }) => {
    const counts={};
    page.on('request',req=>{
      const p=new URL(req.url()).pathname;
      if(p.includes('/equipment/exam-1/data/')||p.endsWith('/equipment/exam-1/banks.json')) counts[p]=(counts[p]||0)+1;
    });
    await page.goto(exam + '/studio.html');
    await expect.poll(() => page.evaluate(() => typeof ALL_BY_UID!=='undefined'?ALL_BY_UID.size:0),{timeout:20000}).toBe(2000);
    await page.evaluate(() => MBUPageReady);

    expect(counts['/equipment/exam-1/banks.json']).toBe(1);
    for(const name of ['bank1.json','bank2.json','bank3.json','combined.json','hazards.json']){
      expect(counts['/equipment/exam-1/data/'+name],name+' request count').toBe(1);
    }
  });

  test('Build bootstrap does not create an update reload loop', async ({ page }) => {
    let buildRequests=0;
    page.on('request',req=>{if(new URL(req.url()).pathname==='/equipment/build.json')buildRequests++});
    await page.goto(exam + '/quiz-bank-1.html');
    await page.evaluate(() => MBUPageReady);
    const firstUrl=page.url();
    await page.reload();
    await page.evaluate(() => MBUPageReady);
    expect(new URL(page.url()).pathname).toBe(new URL(firstUrl).pathname);
    expect(buildRequests).toBeLessThanOrEqual(4);
  });

  test('Successful updater reload marker is removed without another navigation', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.evaluate(() => MBUPageReady);
    const build=await page.evaluate(() => window.MBU_BUILD_ID);
    await page.goto(exam + '/quiz-bank-1.html?_mbu_reload=' + encodeURIComponent(build));
    await page.evaluate(() => MBUPageReady);
    await expect.poll(() => new URL(page.url()).searchParams.has('_mbu_reload')).toBe(false);
    expect(new URL(page.url()).pathname).toBe(exam + '/quiz-bank-1.html');
  });


  test('App core exposes stable device identity, diagnostics, and a global Tools dialog', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');
    await page.evaluate(() => MBUPageReady);
    const first=await page.evaluate(() => MBUSync.deviceId());
    expect(first).toMatch(/^[A-Za-z0-9-]+$/);
    await page.reload();await page.evaluate(() => MBUPageReady);
    expect(await page.evaluate(() => MBUSync.deviceId())).toBe(first);
    await expect(page.locator('.mbu-global-nav__tools')).toBeVisible();
    await page.locator('.mbu-global-nav__tools').click();
    await expect(page.locator('#mbu-app-tools')).toHaveClass(/open/);
    await expect(page.locator('#mbu-app-tools')).toContainText('Progress saves locally');
    await expect(page.locator('.mbu-global-nav__cloud')).toBeVisible();
    const diag=await page.evaluate(() => MBUDiagnostics.snapshot());
    expect(diag.build).toMatch(/^2026-/);expect(diag.deviceId).toBe(first);
  });

  test('A real quiz save updates sync metadata and exports a portable schema-1 snapshot', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    await page.locator('#options .opt').first().click();
    await page.locator('#submit-multi').click();
    const out=await page.evaluate(async()=>({meta:JSON.parse(localStorage.getItem('mbu_sync_meta_v1')||'{}'),snapshot:await MBUSync.exportSnapshot()}));
    expect(out.meta['SRNA_COMBINED_EXAM_SET_1_2026_V1']?.revision).toBeGreaterThan(0);
    expect(out.snapshot.schema).toBe(1);expect(out.snapshot.app).toBe('SRNA Study Tool');
    expect(out.snapshot.stores['SRNA_COMBINED_EXAM_SET_1_2026_V1']).toBeTruthy();
  });

  test('Backup import uses deterministic newer-save conflict handling', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    const result=await page.evaluate(async()=>{
      const key='SRNA_COMBINED_EXAM_SET_1_2026_V1',local='{"local":true}',remote='{"remote":true}',device=MBUSync.deviceId();
      localStorage.setItem(key,local);localStorage.setItem('mbu_sync_meta_v1',JSON.stringify({[key]:{revision:2,updatedAt:200,deviceId:device}}));
      const older=await MBUSync.importSnapshot({app:'SRNA Study Tool',schema:1,createdAt:100,deviceId:'other',stores:{[key]:remote},meta:{[key]:{revision:1,updatedAt:100,deviceId:'other'}}});
      const afterOlder=localStorage.getItem(key);
      const newer=await MBUSync.importSnapshot({app:'SRNA Study Tool',schema:1,createdAt:300,deviceId:'other',stores:{[key]:remote},meta:{[key]:{revision:3,updatedAt:300,deviceId:'other'}}});
      return{older,newer,afterOlder,afterNewer:localStorage.getItem(key)}
    });
    expect(result.older.imported).toBe(0);expect(result.afterOlder).toBe('{"local":true}');
    expect(result.newer.imported).toBe(1);expect(result.afterNewer).toBe('{"remote":true}');
  });

  test('Newer offline local progress is not overwritten by an older higher server revision', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    const result=await page.evaluate(async()=>{
      const key='SRNA_COMBINED_EXAM_SET_1_2026_V1',device=MBUSync.deviceId();
      localStorage.setItem(key,JSON.stringify({local:'newer'}));
      localStorage.setItem('mbu_sync_meta_v1',JSON.stringify({[key]:{revision:7,updatedAt:2000,deviceId:device,serverRevision:5,dirty:true}}));
      const olderHigherServer=await MBUSync.importSnapshot({
        app:'SRNA Study Tool',schema:1,createdAt:1000,deviceId:'other',
        stores:{[key]:JSON.stringify({cloud:'older'})},
        meta:{[key]:{revision:12,updatedAt:1000,deviceId:'other',serverRevision:6}}
      });
      const afterOlder=localStorage.getItem(key);
      const blockedWhileDirty=await MBUSync.importSnapshot({
        app:'SRNA Study Tool',schema:1,createdAt:3000,deviceId:'other',
        stores:{[key]:JSON.stringify({cloud:'newer'})},
        meta:{[key]:{revision:13,updatedAt:3000,deviceId:'other',serverRevision:6}}
      });
      const submitted=JSON.parse(localStorage.getItem('mbu_sync_meta_v1'))[key];
      MBUSync.acknowledgeServerWrite(key,{server_revision:6},submitted);
      const afterAck=JSON.parse(localStorage.getItem('mbu_sync_meta_v1'))[key];
      const newerAfterAck=await MBUSync.importSnapshot({
        app:'SRNA Study Tool',schema:1,createdAt:4000,deviceId:'other',
        stores:{[key]:JSON.stringify({cloud:'newer'})},
        meta:{[key]:{revision:14,updatedAt:4000,deviceId:'other',serverRevision:7}}
      });
      return{olderHigherServer,blockedWhileDirty,newerAfterAck,afterOlder,afterAck,afterNewer:localStorage.getItem(key)}
    });
    expect(result.olderHigherServer.imported).toBe(0);
    expect(result.afterOlder).toBe(JSON.stringify({local:'newer'}));
    expect(result.blockedWhileDirty.imported).toBe(0);
    expect(result.afterAck.dirty).toBe(false);
    expect(result.afterAck.serverRevision).toBe(6);
    expect(result.newerAfterAck.imported).toBe(1);
    expect(result.afterNewer).toBe(JSON.stringify({cloud:'newer'}));
  });

  test('Future cloud adapters can pull, merge, and push through the stable sync interface', async ({ page }) => {
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    const result=await page.evaluate(async()=>{
      let pushed=null;
      MBUSync.registerAdapter('memory',{pull:async()=>null,push:async snapshot=>{pushed=snapshot}});
      const sync=await MBUSync.syncWith('memory');return{sync,pushed}
    });
    expect(result.sync.pushed).toBe(true);expect(result.pushed.schema).toBe(1);expect(result.pushed.deviceId).toBeTruthy();
  });

  test('Keyboard and mobile accessibility contracts remain usable', async ({ page }) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    await expect(page.locator('.mbu-skip-link')).toHaveText('Skip to main content');
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    const cross=page.locator('.mbu-cross').first();await cross.focus();await page.keyboard.press('Enter');
    await expect(cross).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#progress')).toHaveAttribute('aria-live','polite');
  });


  test('Canonical answer selection updates in place without rebuilding the question DOM', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    await page.evaluate(() => { window.__mbuFirstOption=document.querySelector('#options .opt'); window.__mbuOptionsNode=document.getElementById('options'); });
    await page.locator('#options .opt').first().click();
    const state=await page.evaluate(() => ({
      sameOption:window.__mbuFirstOption===document.querySelector('#options .opt'),
      sameContainer:window.__mbuOptionsNode===document.getElementById('options'),
      selected:document.querySelector('#options .opt')?.classList.contains('selected')
    }));
    expect(state).toEqual({sameOption:true,sameContainer:true,selected:true});
  });

  test('Canonical navigator renders only when opened', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    expect(await page.locator('#mbuNavigator').innerHTML()).toBe('');
    await page.getByRole('button',{name:'Navigator'}).click();
    await expect(page.locator('#mbuNavigator')).toBeVisible();
    expect(await page.locator('#mbuNavigator button').count()).toBe(100);
  });

  test('Header cloud status opens account controls without any secret browser credential', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    await expect(page.locator('.mbu-global-nav__cloud')).toContainText('Cloud: Signed out');
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('#mbu-account-panel')).toBeVisible();
    await expect(page.locator('[data-cloud-signin]')).toBeVisible();
    const config=await page.evaluate(() => MBU_SUPABASE_CONFIG);
    expect(config.url).toBe('https://xqyasyambwdyhsjkftqu.supabase.co');
    expect(config.publishableKey).toMatch(/^sb_publishable_/);
    expect(JSON.stringify(config)).not.toContain('sb_secret_');
  });

  test('Tools prioritizes study status and keeps recovery and diagnostics secondary', async ({ page }) => {
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.locator('.mbu-global-nav__tools').click();
    await expect(page.locator('#mbu-app-tools')).toBeVisible();
    await expect(page.locator('[data-tools-saves]')).toHaveText(/\d+ of \d+/);
    await expect(page.locator('[data-tools-saves-help]')).toContainText(/study (area|progress)/i);
    await expect(page.getByText('Backup & recovery')).toBeVisible();
    await expect(page.getByText('Troubleshooting & app info')).toBeVisible();
    await expect(page.locator('[data-export]')).toBeVisible();
    await page.getByText('Troubleshooting & app info').click();
    await expect(page.locator('.mbu-tools-legal-links')).toContainText('Privacy Notice');
    await expect(page.locator('.mbu-tools-legal-links')).toContainText('Terms of Use');
  });

  test('Supabase adapter signs in and writes progress through server-revision guard', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co',writes=[];
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'test@example.com'}})}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/rpc/mbu_sync_write_state',route=>{
      const body=JSON.parse(route.request().postData()||'{}');writes.push(body);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({applied:true,row:{store_key:body.p_store_key,payload:body.p_payload,device_id:body.p_device_id,client_revision:body.p_client_revision,client_updated_at:body.p_client_updated_at,server_revision:1,server_updated_at:new Date().toISOString()}})})
    });
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>route.fulfill({status:201,contentType:'application/json',body:''}));
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    await waitForAuth(page);
    await page.locator('.mbu-global-nav__cloud').click();
    await page.locator('[data-cloud-email]').fill('test@example.com');
    await page.locator('[data-cloud-password]').fill('correct horse battery staple');
    await page.locator('[data-cloud-signin]').click();
    await expect(page.locator('[data-cloud-signed-in]')).toBeVisible();
    await expect(page.locator('.mbu-global-nav__cloud')).toContainText('Cloud: Synced');
    await page.locator('[data-account-close]').click();
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    await page.locator('#options .opt').first().click();
    await page.evaluate(() => MBUSupabase.syncNow());
    expect(writes.some(row=>row.p_store_key==='SRNA_COMBINED_EXAM_SET_1_2026_V1')).toBe(true);
    expect(writes.every(row=>Number.isInteger(Number(row.p_expected_server_revision)))).toBe(true);
    const meta=await page.evaluate(()=>JSON.parse(localStorage.getItem('mbu_sync_meta_v1')||'{}').SRNA_COMBINED_EXAM_SET_1_2026_V1);
    expect(meta.serverRevision).toBe(1);
    expect(meta.dirty).toBe(false);
  });

  test('Switching accounts clears the previous account local study stores before cloud sync', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co',newId='00000000-0000-0000-0000-000000000002';
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'switch-access',refresh_token:'switch-refresh',expires_in:3600,user:{id:newId,email:'second@example.com'}})}));
    await page.route(cloud+'/rest/v1/rpc/snar_has_current_legal_acceptance',route=>route.fulfill({status:200,contentType:'application/json',body:'true'}));
    await page.route(cloud+'/rest/v1/rpc/snar_account_access_status',route=>route.fulfill({status:200,contentType:'application/json',body:'"active"'}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>route.fulfill({status:201,contentType:'application/json',body:''}));
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(()=>{
      localStorage.setItem('mbu_cloud_local_owner_v1','00000000-0000-0000-0000-000000000001');
      localStorage.setItem('mbu_exam1_studio_v1',JSON.stringify({ans:{old:{ok:true}}}));
      localStorage.setItem('mbu_sync_meta_v1',JSON.stringify({mbu_exam1_studio_v1:{revision:3,updatedAt:Date.now(),deviceId:'old',serverRevision:2}}));
    });
    await page.locator('.mbu-global-nav__cloud').click();
    await page.locator('[data-cloud-email]').fill('second@example.com');
    await page.locator('[data-cloud-password]').fill('correct horse battery staple');
    await Promise.all([
      page.waitForNavigation(),
      page.locator('[data-cloud-signin]').click()
    ]);
    await page.evaluate(() => MBUPageReady);
    expect(await page.evaluate(()=>localStorage.getItem('mbu_exam1_studio_v1'))).toBeNull();
    expect(await page.evaluate(()=>localStorage.getItem('mbu_sync_meta_v1'))).toBeNull();
    expect(await page.evaluate(()=>localStorage.getItem('mbu_cloud_local_owner_v1'))).toBe(newId);
  });

  test('Sign out attempts a final cloud sync before clearing the session', async ({ page }) => {
    await seedSignedIn(page);
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co',writes=[];
    await page.route(cloud+'/rest/v1/rpc/mbu_sync_write_state',route=>{const body=JSON.parse(route.request().postData()||'{}');writes.push(body);return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({applied:true,row:{store_key:body.p_store_key,payload:body.p_payload,device_id:body.p_device_id,client_revision:body.p_client_revision,client_updated_at:body.p_client_updated_at,server_revision:1}})})});
    await page.route(cloud+'/auth/v1/logout',route=>route.fulfill({status:204,body:''}));
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);await waitForAuth(page);
    await page.evaluate(()=>{localStorage.setItem('mbu_exam1_studio_v1',JSON.stringify({ans:{final:{ok:true}}}));MBUAppCore.touchStore('mbu_exam1_studio_v1')});
    await page.evaluate(()=>MBUSupabase.signOut());
    expect(writes.some(x=>x.p_store_key==='mbu_exam1_studio_v1')).toBe(true);
    expect(await page.evaluate(()=>MBUSupabase.status().signedIn)).toBe(false);
  });

  test('Account creation requires adult Terms and Privacy acknowledgement', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let signupCalls=0;
    let signupBody=null;await page.route(cloud+'/auth/v1/signup?*',route=>{signupCalls++;signupBody=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:'new-user',email:'new@example.com'},session:null})})});
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(()=>{localStorage.removeItem('mbu_supabase_session_v1')});
    await page.reload();await page.evaluate(() => MBUPageReady);
    await page.locator('.mbu-global-nav__cloud').click();
    await page.locator('[data-auth-view="signup"]').click();
    await page.locator('[data-cloud-signup-email]').fill('new@example.com');
    await page.locator('[data-cloud-signup-password]').fill('long-enough-password');
    await page.locator('[data-cloud-signup-confirm]').fill('long-enough-password');
    await page.locator('[data-cloud-signup]').click();
    await expect(page.locator('[data-account-message]')).toContainText('18+');
    expect(signupCalls).toBe(0);
    await page.locator('[data-cloud-consent]').check();
    await page.locator('[data-cloud-signup]').click();
    await expect.poll(()=>signupCalls).toBe(1);
    expect(signupBody.data).toMatchObject({snar_terms_version:'2026-09-27-v5',snar_privacy_version:'2026-09-27-v5',snar_adult_ack:true});
    expect(signupBody.data.snar_accepted_at).toBeTruthy();
    await expect(page.locator('#mbu-account-panel')).toContainText('Privacy Notice');
    await expect(page.locator('#mbu-account-panel')).toContainText('Terms of Use');
  });

  test('Existing signed-in account is prompted to re-accept current legal versions before sync or Adaptive Mode', async ({ page }) => {
    await seedSignedIn(page);
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';
    await page.unroute(cloud+'/rest/v1/rpc/snar_has_current_legal_acceptance');
    await page.route(cloud+'/rest/v1/rpc/snar_has_current_legal_acceptance',route=>route.fulfill({status:200,contentType:'application/json',body:'false'}));
    let calibrationRefreshes=0;
    await page.route(cloud+'/rest/v1/rpc/snar_accept_current_legal',route=>route.fulfill({status:200,contentType:'application/json',body:'true'}));
    await page.route(cloud+'/rest/v1/mbu_item_calibration?*',route=>{calibrationRefreshes++;return route.fulfill({status:200,contentType:'application/json',body:'[]'})});
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await waitForAuth(page);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-cloud-legal-required]')).toBeVisible();
    await expect(page.locator('[data-cloud-sync]')).toBeDisabled();
    await page.locator('[data-cloud-reaccept-consent]').check();
    await page.locator('[data-cloud-reaccept]').click();
    await expect.poll(()=>page.evaluate(()=>MBUSupabase.status().legalAccepted)).toBe(true);
    await expect(page.locator('[data-cloud-legal-required]')).toBeHidden();
    await expect.poll(()=>calibrationRefreshes).toBeGreaterThan(0);
  });

  test('Account access check fails closed when the server status cannot be resolved', async ({ page }) => {
    await page.route(cloud+'/rest/v1/rpc/snar_account_access_status',route=>route.abort());
    await seedSignedIn(page);
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await expect.poll(()=>page.evaluate(()=>MBUSupabase.status().accessStatus)).toBe('unknown');
    const result=await page.evaluate(async()=>{try{await MBUSupabase.syncNow();return 'allowed'}catch(e){return e.message}});
    expect(result).toContain('suspended');
    await page.locator('#adaptiveToggle').check();
    await expect(page.locator('#adaptiveToggle')).not.toBeChecked();
  });

  test('Suspended accounts keep privacy and deletion controls but cannot sync or use Adaptive Mode', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'suspended-access',refresh_token:'suspended-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000009',email:'suspended@example.com'}})}));
    await page.route(cloud+'/rest/v1/rpc/snar_has_current_legal_acceptance',route=>route.fulfill({status:200,contentType:'application/json',body:'true'}));
    await page.route(cloud+'/rest/v1/rpc/snar_account_access_status',route=>route.fulfill({status:200,contentType:'application/json',body:'"suspended"'}));
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(() => MBUSupabase.signIn('suspended@example.com','correct horse battery staple'));
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-cloud-suspended]')).toBeVisible();
    await expect(page.locator('[data-cloud-sync]')).toBeDisabled();
    await expect(page.locator('[data-cloud-devices-details]')).toBeHidden();
    await expect(page.locator('[data-cloud-history-details]')).toBeHidden();
    await page.locator('[data-cloud-signed-in] summary').filter({hasText:'Privacy & account'}).click();
    await expect(page.locator('[data-privacy-submit]')).toBeVisible();
    await expect(page.locator('[data-cloud-delete-account]')).toBeVisible();

    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(()=>{document.querySelectorAll('#sourceChecks input[type=checkbox]').forEach((x,i)=>x.checked=i===0)});
    await page.locator('#adaptiveToggle').click();
    await expect(page.locator('#adaptiveToggle')).not.toBeChecked();
    await expect(page.locator('#mbu-account-panel')).toHaveClass(/open/);
  });

  test('Privacy Notice and Terms are publicly accessible and independently branded', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page.getByRole('heading',{name:'Privacy Notice'})).toBeVisible();
    await expect(page.locator('body')).toContainText('SRNA Study Tool');
    await page.goto('/terms.html');
    await expect(page.getByRole('heading',{name:'Terms of Use'})).toBeVisible();
    await expect(page.locator('body')).toContainText('Independent educational resource');
  });

  test('Operator admin exposes compliance controls without raw learner payload access', async ({ page }) => {
    await seedSignedIn(page);
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';
    await page.unroute(cloud+'/rest/v1/rpc/snar_admin_status');
    await page.route(cloud+'/rest/v1/rpc/snar_admin_status',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({is_admin:true,role:'operator_admin'})}));
    await page.route(cloud+'/rest/v1/rpc/snar_admin_system_summary',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({accounts:2,active_accounts:2,suspended_accounts:0,legal_acceptances:2,privacy_requests:0,item_contributions:0,cat_users:1,adaptive_first_attempts:4,calibrated_items_25:0,guest_active_15m:3,guest_sessions_24h:8})}));
    await page.route(cloud+'/rest/v1/rpc/snar_admin_accounts',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{user_id:'00000000-0000-0000-0000-000000000001',email:'e2e@example.com',created_at:new Date().toISOString(),last_sign_in_at:new Date().toISOString(),access_status:'active',current_legal_accepted:true,cat_used:true,is_admin:true},{user_id:'00000000-0000-0000-0000-000000000002',email:'learner@example.com',created_at:new Date().toISOString(),last_sign_in_at:null,access_status:'active',current_legal_accepted:true,cat_used:false,is_admin:false}])}));
    let accessChange=null,deletedAccount=null;
    await page.route(cloud+'/rest/v1/rpc/snar_admin_privacy_requests',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/rpc/snar_admin_set_account_access',route=>{accessChange=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:'true'})});
    await page.route(cloud+'/rest/v1/rpc/snar_admin_delete_account',route=>{deletedAccount=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:'true'})});
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);await waitForAuth(page);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-admin-details]')).toBeVisible();
    await page.locator('[data-admin-details] > summary').click();
    await expect(page.locator('[data-admin-stats]')).toContainText('Guests active ~15m');
    await expect(page.locator('[data-admin-stats]')).toContainText('CAT users');
    await expect(page.locator('[data-admin-accounts]')).toContainText('learner@example.com');
    await page.locator('[data-admin-accounts] [data-admin-access]').click();
    await expect.poll(()=>accessChange?.p_status).toBe('suspended');
    page.on('dialog',dialog=>dialog.accept());
    await page.locator('[data-admin-accounts] [data-admin-delete-account]').click();
    await expect.poll(()=>deletedAccount?.p_user_id).toBe('00000000-0000-0000-0000-000000000002');
    await expect(page.locator('[data-admin-details]')).toContainText('Raw learner study payloads');
  });

  test('Signed-in account can submit a private privacy request', async ({ page }) => {
    await seedSignedIn(page);
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let requestBody=null;
    await page.route(cloud+'/rest/v1/snar_privacy_requests',route=>{requestBody=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify([{id:17,...requestBody,status:'received'}])})});
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await waitForAuth(page);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-cloud-signed-in]')).toBeVisible();
    await page.locator('[data-cloud-signed-in] summary').filter({hasText:'Privacy & account'}).click();
    await page.locator('[data-privacy-type]').selectOption('access');
    await page.locator('[data-privacy-details]').fill('Please provide my account-linked data.');
    await page.locator('[data-privacy-submit]').click();
    await expect(page.locator('[data-account-message]')).toContainText('Privacy request received');
    expect(requestBody).toMatchObject({request_type:'access',details:'Please provide my account-linked data.'});
  });

  test('Signed-in user can delete account and return to signed-out state', async ({ page }) => {
    await seedSignedIn(page);
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let deleted=0;
    await page.route(cloud+'/functions/v1/snar-delete-account',route=>{deleted++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({deleted:true})})});
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await waitForAuth(page);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-cloud-signed-in]')).toBeVisible();
    page.on('dialog',dialog=>dialog.accept());
    await page.locator('[data-cloud-signed-in] summary').filter({hasText:'Privacy & account'}).click();
    await page.evaluate(()=>{localStorage.setItem('mbu_exam1_studio_v1',JSON.stringify({ans:{deleteMe:{ok:true}}}));MBUAppCore.touchStore('mbu_exam1_studio_v1')});
    await page.locator('[data-cloud-delete-account]').click();
    await expect.poll(()=>deleted).toBe(1);
    await expect.poll(()=>page.evaluate(()=>MBUSupabase.status().signedIn)).toBe(false);
    await expect(page.locator('[data-cloud-signed-out]')).toBeVisible();
    expect(await page.evaluate(()=>localStorage.getItem('mbu_exam1_studio_v1'))).toBeNull();
    expect(await page.evaluate(()=>localStorage.getItem('mbu_sync_meta_v1'))).toBeNull();
    expect(await page.evaluate(()=>localStorage.getItem('mbu_cloud_local_owner_v1'))).toBeNull();
  });

  test('Supabase signup sends confirmation back to the deployed app root', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let signupUrl='';
    await page.route(cloud+'/auth/v1/signup?*',route=>{signupUrl=route.request().url();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:{id:'new-user',email:'new@example.com'},session:null})})});
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(() => MBUSupabase.signUp('new@example.com','long-enough-password',true));
    const redirect=new URL(signupUrl).searchParams.get('redirect_to');
    expect(redirect).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
  });

  test('Supabase email confirmation fragment is converted into a stored browser session', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';
    await page.route(cloud+'/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'00000000-0000-0000-0000-000000000001',email:'verified@example.com'})}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>route.fulfill({status:201,contentType:'application/json',body:''}));
    await page.goto(exam + '/index.html#access_token=test-access&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=signup');
    await page.evaluate(() => MBUPageReady);
    await expect.poll(() => page.evaluate(() => MBUSupabase.status().signedIn)).toBe(true);
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect(await page.evaluate(() => MBUSupabase.status().email)).toBe('verified@example.com');
  });

  test('Cloud account reports the five-minute automatic sync schedule', async ({ page }) => {
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    expect(await page.evaluate(() => MBUSupabase.status().autoSyncIntervalMs)).toBe(300000);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-cloud-auto]')).toContainText('Starts when signed in');
  });

  test('Expired cloud session refreshes before sync without losing the account', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let refreshBody=null;
    await page.addInitScript(()=>localStorage.setItem('mbu_supabase_session_v1',JSON.stringify({access_token:'expired-access',refresh_token:'refresh-me',expires_at:1,user:{id:'00000000-0000-0000-0000-000000000001',email:'refresh@example.com'}})));
    await page.route(cloud+'/auth/v1/token?grant_type=refresh_token',route=>{refreshBody=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'fresh-access',refresh_token:'fresh-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'refresh@example.com'}})})});
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>route.fulfill({status:201,contentType:'application/json',body:''}));
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mbu_supabase_session_v1')||'null')?.access_token)).toBe('fresh-access');
    expect(refreshBody).toEqual({refresh_token:'refresh-me'});
    expect(await page.evaluate(()=>MBUSupabase.status().signedIn)).toBe(true);
  });

  test('Cloud failure leaves local quiz progress intact and reports sync error', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let failWrites=false;
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'offline@example.com'}})}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>route.fulfill({status:201,contentType:'application/json',body:''}));
    await page.route(cloud+'/rest/v1/rpc/mbu_sync_write_state',route=>failWrites?route.abort('internetdisconnected'):route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({applied:true,row:null})}));
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(()=>MBUSupabase.signIn('offline@example.com','correct horse battery staple'));
    await page.locator('#cards button').filter({hasText:/start|continue/i}).first().click();
    const answer=await page.evaluate(()=>currentData[currentIndex].answer);
    await clickIndexes(page.locator('#options .opt'),answer);
    const before=await storageJSON(page,'SRNA_COMBINED_EXAM_SET_1_2026_V1');
    failWrites=true;
    await page.evaluate(()=>MBUSupabase.syncNow().catch(()=>null));
    expect(await page.evaluate(()=>MBUSupabase.status().state)).toBe('error');
    const after=await storageJSON(page,'SRNA_COMBINED_EXAM_SET_1_2026_V1');
    expect(after).toEqual(before);
  });

  test('Cloud account can request password recovery and resend confirmation', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let recoverBody=null,resendBody=null;
    await page.route(cloud+'/auth/v1/recover?*',route=>{recoverBody=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:'{}'})});
    await page.route(cloud+'/auth/v1/resend?*',route=>{resendBody=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:'{}'})});
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await waitForAuth(page);
    await page.locator('.mbu-global-nav__cloud').click();
    await page.locator('[data-cloud-email]').fill('recover@example.com');
    await page.locator('[data-cloud-forgot]').click();
    await expect(page.locator('[data-account-message]')).toHaveText('');
    expect(recoverBody).toEqual({email:'recover@example.com'});
    await page.locator('[data-cloud-resend]').click();
    await expect(page.locator('[data-account-message]')).toHaveText('');
    expect(resendBody).toEqual({type:'signup',email:'recover@example.com'});
  });

  test('Password recovery redirect exposes new-password form and updates password', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let passwordBody=null;
    await page.route(cloud+'/auth/v1/user',async route=>{
      if(route.request().method()==='PUT'){passwordBody=JSON.parse(route.request().postData()||'{}');return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'00000000-0000-0000-0000-000000000001',email:'recover@example.com'})})}
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'00000000-0000-0000-0000-000000000001',email:'recover@example.com'})})
    });
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>route.fulfill({status:201,contentType:'application/json',body:''}));
    await page.goto(exam + '/index.html#access_token=test-access&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=recovery');
    await page.evaluate(() => MBUPageReady);
    await expect.poll(() => page.evaluate(() => MBUSupabase.status().recoveryMode)).toBe(true);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-cloud-recovery]')).toBeVisible();
    await page.locator('[data-cloud-new-password]').fill('new-password-123');
    await page.locator('[data-cloud-update-password]').click();
    await expect.poll(() => page.evaluate(() => MBUSupabase.status().recoveryMode)).toBe(false);
    expect(passwordBody).toEqual({password:'new-password-123'});
  });

  test('Tools and account dialogs trap keyboard focus and restore it when closed', async ({ page }) => {
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    const cloud=page.locator('.mbu-global-nav__cloud');await cloud.focus();await cloud.click();
    const account=page.locator('#mbu-account-panel');
    await expect(account).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('#mbu-account-panel')!==null)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(account).not.toBeVisible();
    await expect(cloud).toBeFocused();

    const tools=page.locator('.mbu-global-nav__tools');await tools.focus();await tools.click();
    const dialog=page.locator('#mbu-app-tools');await expect(dialog).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('#mbu-app-tools')!==null)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(tools).toBeFocused();
  });

  test('Studio and Hazards preserve shared keyboard and image accessibility', async ({ page }) => {
    await page.setViewportSize({width:390,height:844});

    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await expect(page.locator('.mbu-skip-link')).toHaveText('Skip to main content');
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    await page.evaluate(() => {
      const q=ALL.find(x=>Array.isArray(x.opts)&&x.opts.length>=2)||ALL[0];
      session=[q];pos=0;DB.active={uids:[q.uid],pos:0,answers:{},updated:Date.now()};save();showQ();
    });
    const studioCross=page.locator('.mbu-cross').first();
    if(await studioCross.count()){await studioCross.focus();await expect(studioCross).toHaveAttribute('aria-label',/Cross out option/)}
    const studioImages=page.locator('#qimage img');
    if(await studioImages.count())await expect(studioImages.first()).toHaveAttribute('alt',/.+/);

    await page.goto(exam + '/hazards-bank-3.html');await page.evaluate(() => MBUPageReady);
    await expect(page.locator('.mbu-skip-link')).toHaveText('Skip to main content');
    expect(await page.evaluate(() => document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    const hazardCross=page.locator('button[aria-label^="Cross out"]').first();
    if(await hazardCross.count())await expect(hazardCross).toHaveAttribute('aria-pressed',/true|false/);
    await expect(page.locator('img:not([alt])')).toHaveCount(0);
  });

  test('iPad-style rotation and bfcache return preserve an active Studio session', async ({ page }) => {
    await page.setViewportSize({width:1024,height:768});
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(()=>{
      const first=document.querySelector('#sourceChecks input[type=checkbox]');
      if(first)first.checked=true;
      document.getElementById('count').value='10';
      document.getElementById('adaptiveToggle').checked=false;
      startMode('custom');
    });
    const before=await page.evaluate(()=>({uid:session[pos].uid,pos,active:[...DB.active.uids]}));
    await page.setViewportSize({width:768,height:1024});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    await page.evaluate(()=>{
      const e=new Event('pageshow');Object.defineProperty(e,'persisted',{value:true});window.dispatchEvent(e);
    });
    await expect(page.locator('#quiz')).toBeVisible();
    const after=await page.evaluate(()=>({uid:session[pos].uid,pos,active:[...DB.active.uids]}));
    expect(after).toEqual(before);
  });

  test('Mature 2,000-question learning history remains usable in Studio and Adaptive Mode', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const result=await page.evaluate(()=>{
      const now=Date.now(),attempts={},reviews={},activity=[];
      ALL.forEach((q,i)=>{
        const ok=i%3!==0,at=now-(i%30)*86400000;
        attempts[q.uid]={uid:q.uid,bank:q.bank,bankLabel:q.bankLabel,set:q.set,questionId:q.uid,topic:q.topic,stem:q.stem,href:location.href,attempts:3,correct:ok?2:1,incorrect:ok?1:2,lastAt:at,lastCorrect:ok,streak:ok?2:0};
        reviews[q.uid]={uid:q.uid,dueAt:at+86400000,intervalDays:1,lastAt:at,lastCorrect:ok};
        if(i>=ALL.length-1200)activity.push({id:q.uid+':'+at,at,type:'answer',uid:q.uid,bank:q.bank,bankLabel:q.bankLabel,topic:q.topic,ok,href:location.href});
      });
      localStorage.setItem(MBUStudyIntelligence.STORE,JSON.stringify({schema:1,updatedAt:now,attempts,reviews,activity,issues:[],seededLegacy:true}));
      window.dispatchEvent(new StorageEvent('storage',{key:MBUStudyIntelligence.STORE}));
      renderHome();
      const summary=MBUStudyIntelligence.summary();
      const pool=ALL.slice(0,500),adaptive=MBUAdaptiveQuiz.start(pool,50);
      return{loaded:ALL.length,attempts:summary.overall.attempts,activity:MBUStudyIntelligence.recentActivity(1200).length,adaptiveUid:adaptive.question?.uid||'',poolContains:pool.some(q=>q.uid===adaptive.question?.uid)};
    });
    expect(result.loaded).toBe(2000);
    expect(result.attempts).toBe(6000);
    expect(result.activity).toBe(1200);
    expect(result.adaptiveUid).not.toBe('');
    expect(result.poolContains).toBe(true);
    await expect(page.locator('#analyticsSummary')).toContainText('Overall accuracy');
  });

  test('Server revision upgrade does not discard legacy unsynced local progress', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    const result=await page.evaluate(async()=>{
      const key='SRNA_COMBINED_EXAM_SET_1_2026_V1',device=MBUSync.deviceId();
      localStorage.setItem(key,'{"legacyLocal":true}');
      localStorage.setItem('mbu_sync_meta_v1',JSON.stringify({[key]:{revision:9,updatedAt:500,deviceId:device}}));
      const merge=await MBUSync.importSnapshot({
        app:'SRNA Study Tool',schema:1,createdAt:100,deviceId:'cloud',
        stores:{[key]:'{"olderCloud":true}'},
        meta:{[key]:{revision:2,updatedAt:100,deviceId:'cloud',serverRevision:8}}
      });
      return{merge,value:localStorage.getItem(key),meta:JSON.parse(localStorage.getItem('mbu_sync_meta_v1'))[key]}
    });
    expect(result.merge.imported).toBe(0);
    expect(result.value).toBe('{"legacyLocal":true}');
    expect(result.meta.serverRevision||0).toBe(0);
  });

  test('Server revision wins once both local and cloud state have authoritative revisions', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    const result=await page.evaluate(async()=>{
      const key='SRNA_COMBINED_EXAM_SET_1_2026_V1',device=MBUSync.deviceId();
      localStorage.setItem(key,'{"local":true}');
      localStorage.setItem('mbu_sync_meta_v1',JSON.stringify({[key]:{revision:20,updatedAt:900,deviceId:device,serverRevision:4}}));
      const merge=await MBUSync.importSnapshot({
        app:'SRNA Study Tool',schema:1,createdAt:100,deviceId:'cloud',
        stores:{[key]:'{"cloud":true}'},
        meta:{[key]:{revision:2,updatedAt:100,deviceId:'cloud',serverRevision:5}}
      });
      return{merge,value:localStorage.getItem(key),meta:JSON.parse(localStorage.getItem('mbu_sync_meta_v1'))[key]}
    });
    expect(result.merge.imported).toBe(1);
    expect(result.value).toBe('{"cloud":true}');
    expect(result.meta.serverRevision).toBe(5);
  });

  test('Question generator framework is provider-neutral and disabled by default', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const status=await page.evaluate(async()=>{
      const api=MBUQuestionGenerator;
      let disabledError='';
      try{await api.generate('anything',{material:'test'})}catch(e){disabledError=e.message}
      const draft=api.addDraft({
        stem:'Which statement is correct?',
        options:['Correct answer','Distractor'],
        answer:[0],
        type:'single',
        explanation:'The source material supports the first answer.',
        sourceExcerpt:'This is the supporting source excerpt.',
        sourceName:'Test material'
      });
      const approved=api.approveDraft(draft.id);
      const keys=await MBUSync.trackedKeys();
      return{
        enabled:api.enabled(),
        providers:api.providerNames(),
        disabledError,
        approved:api.list().approved.length,
        approvedStem:approved.stem,
        tracked:keys.includes(api.STORE),
        feature:window.MBU_FEATURES.questionGenerator
      }
    });
    expect(status.enabled).toBe(false);
    expect(status.providers).toEqual([]);
    expect(status.disabledError).toContain('not enabled');
    expect(status.approved).toBe(1);
    expect(status.approvedStem).toBe('Which statement is correct?');
    expect(status.tracked).toBe(true);
    expect(status.feature).toMatchObject({enabled:false,status:'unconfigured',provider:null});
  });

  test('Generated questions require source traceability before approval', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const result=await page.evaluate(()=>{
      const q={
        stem:'Draft without source?',
        options:['Yes','No'],
        answer:[0],
        type:'single',
        explanation:'An explanation exists.'
      };
      const draft=MBUQuestionGenerator.addDraft(q);
      const errors=MBUQuestionGenerator.validateQuestion(draft);
      let approvalError='';
      try{MBUQuestionGenerator.approveDraft(draft.id)}catch(e){approvalError=e.message}
      return{errors,approvalError}
    });
    expect(result.errors.join(' ')).toContain('source excerpt or citation');
    expect(result.approvalError).toContain('source excerpt or citation');
  });

  test('Study intelligence records attempts, schedules review, and ranks weak questions first', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUPageReady);
    const out=await page.evaluate(()=>{
      MBUStudyIntelligence.clearAll();
      const weak={uid:'test-weak',bank:'b1',bankLabel:'Quiz Bank 1',id:'weak',set:1,topic:'Airway',stem:'Weak question'};
      const strong={uid:'test-strong',bank:'b1',bankLabel:'Quiz Bank 1',id:'strong',set:1,topic:'Airway',stem:'Strong question'};
      MBUStudyIntelligence.recordAnswer('b1',weak,false,{bankLabel:'Quiz Bank 1'});
      MBUStudyIntelligence.recordAnswer('b1',strong,true,{bankLabel:'Quiz Bank 1'});
      const raw=JSON.parse(localStorage.getItem(MBUStudyIntelligence.STORE));
      raw.reviews['test-weak'].dueAt=Date.now()-1000;
      localStorage.setItem(MBUStudyIntelligence.STORE,JSON.stringify(raw));
      window.dispatchEvent(new StorageEvent('storage',{key:MBUStudyIntelligence.STORE}));
      return {
        due:MBUStudyIntelligence.due().map(x=>x.uid),
        ranked:MBUStudyIntelligence.smartReview([strong,weak],2).map(x=>x.uid),
        summary:MBUStudyIntelligence.summary()
      }
    });
    expect(out.due).toContain('test-weak');
    expect(out.ranked[0]).toBe('test-weak');
    expect(out.summary.overall.attempts).toBe(2);
    expect(out.summary.overall.accuracy).toBe(50);
  });

  test('Adaptive intelligence moves challenge up after correct and down after incorrect', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const out=await page.evaluate(()=>{
      MBUStudyIntelligence.clearAll();
      const easy={uid:'adaptive-easy',bank:'b1',topic:'Monitoring',set:1,stem:'Easy',ans:[0]};
      const hard={uid:'adaptive-hard',bank:'b1',topic:'Monitoring',set:1,stem:'Hard',ans:[0,1]};
      for(let i=0;i<3;i++)MBUStudyIntelligence.recordAnswer('b1',easy,true,{bankLabel:'Quiz Bank 1'});
      for(let i=0;i<3;i++)MBUStudyIntelligence.recordAnswer('b1',hard,false,{bankLabel:'Quiz Bank 1'});
      const start=MBUAdaptiveQuiz.start([easy,hard,{uid:'adaptive-new',bank:'b2',topic:'Airway',set:1,stem:'New',ans:[0]}],3);
      const up=MBUAdaptiveQuiz.advance(start.state,start.question,true);
      const down=MBUAdaptiveQuiz.advance(up,start.question,false);
      const frozen=MBUAdaptiveQuiz.advance({...start.state,currentDifficulty:-2,currentChallenge:1},start.question,false);
      return{easy:MBUAdaptiveQuiz.challenge(easy),hard:MBUAdaptiveQuiz.challenge(hard),startTheta:start.state.theta,upTheta:up.theta,downTheta:down.theta,startLevel:start.state.level,upLevel:up.level,downLevel:down.level,seen:start.state.seenUids,seStart:start.state.se,seUp:up.se,seDown:down.se,startProbability:start.probability,frozenDifficulty:frozen.path.at(-1).difficulty};
    });
    expect(out.hard).toBeGreaterThan(out.easy);
    expect(out.startTheta).toBeCloseTo(0,5);
    expect(out.upTheta).toBeGreaterThan(out.startTheta);
    expect(out.downTheta).toBeLessThan(out.upTheta);
    expect(out.startLevel).toBe(3);
    expect(out.seen).toHaveLength(1);
    expect(out.seUp).toBeLessThan(out.seStart);
    expect(out.seDown).toBeLessThanOrEqual(out.seUp);
    expect(out.startProbability).toBeCloseTo(0.5,1);
    expect(out.frozenDifficulty).toBe(-2);
  });

  test('First-use legal clickwrap accepts a real pointer click and stays out of the way afterward', async ({ page }) => {
    await page.addInitScript(()=>{if(!sessionStorage.getItem('e2e-first-use-legal')){localStorage.removeItem('snar_legal_acceptance_v5');sessionStorage.setItem('e2e-first-use-legal','1')}});
    await page.goto('/');
    await expect(page.locator('#snar-legal-gate')).toBeVisible();
    await expect(page.locator('#snar-legal-gate')).toContainText('Terms of Use');
    await expect(page.locator('#snar-legal-gate')).toContainText('Privacy Notice');
    const button=page.locator('[data-legal-continue]');
    await expect(button).toBeEnabled();
    await button.click();
    await expect(page.locator('#snar-legal-gate')).toHaveCount(0);
    const acceptance=await page.evaluate(()=>JSON.parse(localStorage.getItem('snar_legal_acceptance_v5')||'null'));
    expect(acceptance?.version).toBe('2026-09-27-v5');
    await page.reload();
    await expect(page.locator('#snar-legal-gate')).toHaveCount(0);
  });

  test('Account panel separates sign in and account creation cleanly', async ({ page }) => {
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('[data-auth-signin]')).toBeVisible();
    await expect(page.locator('[data-auth-signup]')).toBeHidden();
    await page.locator('[data-auth-view="signup"]').click();
    await expect(page.locator('[data-auth-signin]')).toBeHidden();
    await expect(page.locator('[data-auth-signup]')).toBeVisible();
    await expect(page.locator('[data-cloud-signup-confirm]')).toBeVisible();
    await page.locator('[data-account-close]').click();
  });

  test('Guest users can study normally but Adaptive Mode requires an account', async ({ page }) => {
    await page.evaluate(()=>{localStorage.removeItem('mbu_supabase_session_v1');sessionStorage.clear()});
    await page.goto(exam + '/studio.html');
    await waitForStudio(page);
    expect(await page.evaluate(()=>MBUSupabase.status().signedIn)).toBe(false);
    await expect(page.getByRole('button',{name:'Start Smart Review'})).toBeVisible();
    await expect(page.locator('#adaptiveToggle')).toBeVisible();
    await page.locator('#adaptiveToggle').click();
    await expect(page.locator('#adaptiveToggle')).not.toBeChecked();
    await expect(page.locator('#mbu-account-panel')).toBeVisible();
    await expect(page.locator('#mbu-account-panel')).toContainText('Sync progress and access Adaptive Mode.');
    await page.locator('[data-account-close]').click();
    const selected=await page.evaluate(()=>{
      const first=document.querySelector('#sourceChecks input[type=checkbox]');
      if(first)first.checked=true;
      document.getElementById('count').value='10';
      document.getElementById('adaptiveToggle').checked=false;
      startMode('custom');
      return session.length;
    });
    expect(selected).toBeGreaterThan(0);
    await expect(page.locator('#quiz')).toBeVisible();
  });

  test('Privacy, Terms, consent, and account controls are accessible without disrupting study flow', async ({ page }) => {
    await page.goto('/');await page.evaluate(() => MBUPageReady);
    await expect(page.locator('footer a[href="privacy.html"]')).toHaveText('Privacy Notice');
    await expect(page.locator('footer a[href="terms.html"]')).toHaveText('Terms of Use');

    await page.goto('/privacy.html');
    await expect(page.getByRole('heading',{name:'Privacy Notice'})).toBeVisible();
    await expect(page.locator('body')).toContainText('Question reports');
    await expect(page.locator('body')).toContainText('Privacy requests');

    await page.goto('/terms.html');
    await expect(page.getByRole('heading',{name:'Terms of Use'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Independent educational resource'})).toBeVisible();

    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.locator('.mbu-global-nav__tools').click();
    await page.getByText('Troubleshooting & app info',{exact:true}).click();
    await expect(page.locator('.mbu-tools-legal-links')).toContainText('Privacy Notice');
    await expect(page.locator('.mbu-tools-legal-links')).toContainText('Terms of Use');
    await page.locator('[data-close]').click();

    await seedSignedIn(page);
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.locator('.mbu-global-nav__cloud').click();
    await expect(page.locator('#mbu-account-panel')).toContainText('Privacy Notice');
    await expect(page.locator('#mbu-account-panel')).toContainText('Terms of Use');
    await page.locator('[data-cloud-signed-in] summary').filter({hasText:'Privacy & account'}).click();
    await expect(page.locator('[data-cloud-delete-account]')).toBeVisible();
    await expect(page.locator('[data-privacy-submit]')).toBeVisible();
  });

  test('Adaptive session is opt-in, sequentially reviewable, and survives reload with its level', async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    expect(await page.locator('#adaptiveToggle').isChecked()).toBe(false);
    await page.evaluate(()=>{
      const first=document.querySelector('#sourceChecks input[type=checkbox]');
      if(first)first.checked=true;
      document.getElementById('count').value='10';
      document.getElementById('adaptiveToggle').checked=true;
      startMode('custom');
    });
    await expect(page.locator('#qmeta')).toContainText('Adaptive Challenge 3/5');
    await expect(page.locator('#studioPrev')).toBeDisabled();
    await expect(page.locator('#studioNavToggle')).toBeHidden();
    const startTheta=await page.evaluate(()=>DB.active.adaptive.theta);
    await page.evaluate(()=>{const q=session[pos];sel=new Set(q.ans);grade()});
    await expect.poll(()=>page.evaluate(()=>DB.active?.adaptive?.theta)).toBeGreaterThan(startTheta);
    await expect.poll(()=>page.evaluate(()=>session.length)).toBe(2);
    const afterCorrectTheta=await page.evaluate(()=>DB.active.adaptive.theta);
    const before=await page.evaluate(()=>({uids:[...DB.active.uids],level:DB.active.adaptive.level,theta:DB.active.adaptive.theta,se:DB.active.adaptive.se,pos:DB.active.pos}));
    await page.reload();await waitForStudio(page);
    await expect.poll(()=>page.evaluate(()=>DB.active?.mode)).toBe('adaptive');
    const after=await page.evaluate(()=>({uids:[...DB.active.uids],level:DB.active.adaptive.level,theta:DB.active.adaptive.theta,se:DB.active.adaptive.se,pos:DB.active.pos}));
    expect(after).toEqual(before);
    await expect(page.locator('#studioPrev')).toBeEnabled();
    await expect(page.locator('#studioNavToggle')).toBeHidden();
    await page.locator('#studioPrev').click();
    await expect(page.locator('#qprog')).toContainText('Question 1 of 10');
    await expect(page.locator('#next')).toBeEnabled();
    await page.locator('#next').click();
    await expect(page.locator('#qprog')).toContainText('Question 2 of 10');
    await page.evaluate(()=>{
      const q=session[pos],need=q.ans.length,wrong=[];
      for(let i=0;i<q.opts.length&&wrong.length<need;i++)if(!q.ans.includes(i))wrong.push(i);
      for(let i=0;i<q.opts.length&&wrong.length<need;i++)if(!wrong.includes(i))wrong.push(i);
      sel=new Set(wrong.slice(0,need));grade()
    });
    await expect.poll(()=>page.evaluate(()=>DB.active?.adaptive?.theta)).toBeLessThan(afterCorrectTheta);
  });

  test('Studio grading is idempotent under duplicate submission', async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(()=>{
      const first=document.querySelector('#sourceChecks input[type=checkbox]');
      if(first)first.checked=true;
      document.getElementById('count').value='10';
      document.getElementById('adaptiveToggle').checked=true;
      startMode('custom');
    });
    const before=await page.evaluate(()=>MBUStudyIntelligence.analytics().overall.attempts);
    await page.evaluate(()=>{const q=session[pos];sel=new Set(q.ans);grade();grade()});
    const state=await page.evaluate(()=>({
      answered:DB.active.adaptive.answered,
      path:DB.active.adaptive.path.length,
      attempts:MBUStudyIntelligence.analytics().overall.attempts
    }));
    expect(state.answered).toBe(1);
    expect(state.path).toBe(1);
    expect(state.attempts-before).toBe(1);
  });

  test('Adaptive Mode does not repeat duplicate question stems in one session', async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const result=await page.evaluate(()=>{
      const dupA={uid:'dup-a',stem:'What is the PISS pin configuration for oxygen?',topic:'Medical Gases',opts:['A','B','C','D'],ans:[1]};
      const dupB={uid:'dup-b',stem:'What is the PISS pin configuration for Oxygen?',topic:'Medical Gases',opts:['D','C','B','A'],ans:[2]};
      const unique={uid:'unique-c',stem:'A completely different adaptive item',topic:'Monitoring',opts:['A','B'],ans:[0]};
      const first=MBUAdaptiveQuiz.start([dupA,dupB,unique],3);
      const state=MBUAdaptiveQuiz.advance(first.state,first.question,true);
      const second=MBUAdaptiveQuiz.pick([dupA,dupB,unique],state);
      return{max:first.state.maxQuestions,first:first.question.stem.toLowerCase(),second:second.question?.stem?.toLowerCase()||'',seenContent:second.state.seenContentKeys.length};
    });
    expect(result.max).toBe(2);
    expect(result.second).not.toBe(result.first);
    expect(result.seenContent).toBe(2);
  });

  test('Adaptive scored answers cannot be reset or mutate CAT state', async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(()=>{
      const first=document.querySelector('#sourceChecks input[type=checkbox]');
      if(first)first.checked=true;
      document.getElementById('count').value='10';
      document.getElementById('adaptiveToggle').checked=true;
      startMode('custom');
    });
    await page.evaluate(()=>{const q=session[pos];sel=new Set(q.ans);grade()});
    await expect.poll(()=>page.evaluate(()=>DB.active?.adaptive?.answered)).toBe(1);
    const before=await page.evaluate(()=>({
      answered:DB.active.adaptive.answered,
      theta:DB.active.adaptive.theta,
      path:JSON.stringify(DB.active.adaptive.path),
      answer:JSON.stringify(DB.active.answers[session[0].uid])
    }));
    await expect(page.locator('#studioReset')).toBeDisabled();
    await page.evaluate(()=>resetStudioCurrent());
    const after=await page.evaluate(()=>({
      answered:DB.active.adaptive.answered,
      theta:DB.active.adaptive.theta,
      path:JSON.stringify(DB.active.adaptive.path),
      answer:JSON.stringify(DB.active.answers[session[0].uid])
    }));
    expect(after).toEqual(before);
  });

  test('All-bank Adaptive Mode advances after correct and incorrect answers without freezing', async ({ page }) => {
    await seedSignedIn(page);
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(()=>{
      document.querySelectorAll('#sourceChecks input[type=checkbox]').forEach(x=>x.checked=true);
      document.getElementById('count').value='50';
      document.getElementById('adaptiveToggle').checked=true;
      startMode('custom');
    });
    await expect(page.locator('#quiz')).toBeVisible();
    await expect(page.locator('#studioNavToggle')).toBeHidden();

    await page.evaluate(()=>{const q=session[pos];sel=new Set(q.ans);grade()});
    await expect.poll(()=>page.evaluate(()=>session.length)).toBe(2);
    await expect.poll(()=>page.evaluate(()=>pos)).toBe(1);

    await page.evaluate(()=>{
      const q=session[pos],need=q.ans.length,wrong=[];
      for(let i=0;i<q.opts.length&&wrong.length<need;i++)if(!q.ans.includes(i))wrong.push(i);
      for(let i=0;i<q.opts.length&&wrong.length<need;i++)if(!wrong.includes(i))wrong.push(i);
      sel=new Set(wrong.slice(0,need));grade()
    });
    await expect(page.locator('#next')).toBeEnabled();
    await page.locator('#next').click();
    await expect.poll(()=>page.evaluate(()=>session.length)).toBe(3);
    await expect.poll(()=>page.evaluate(()=>pos)).toBe(2);
    await page.locator('#studioPrev').click();
    await expect.poll(()=>page.evaluate(()=>pos)).toBe(1);
    await page.locator('#next').click();
    await expect.poll(()=>page.evaluate(()=>pos)).toBe(2);
  });

  test('Malformed study-intelligence storage recovers without breaking Studio', async ({ page }) => {
    await page.addInitScript(()=>localStorage.setItem('mbu_study_intelligence_v1','{bad json'));
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const summary=await page.evaluate(()=>MBUStudyIntelligence.summary());
    expect(summary.overall.attempts).toBe(0);
    await expect(page.locator('#adaptiveToggle')).toBeVisible();
    expect(await page.locator('#adaptiveToggle').isChecked()).toBe(false);
    await expect(page.locator('#analyticsSummary')).toContainText('Overall accuracy');
  });

  test('Universal question search is lazy, global, and routes results into Studio', async ({ page }) => {
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await expect(page.locator('.mbu-global-nav__search')).toBeVisible();
    await page.locator('.mbu-global-nav__search').click();
    await expect(page.locator('#mbu-question-search')).toBeVisible();
    await page.locator('[data-search-input]').fill('soda lime');
    await expect.poll(async()=>await page.locator('.mbu-search-result').count()).toBeGreaterThan(0);
    const href=await page.locator('.mbu-search-result__action').first().getAttribute('href');
    expect(href).toContain('studio.html?question=');
    await page.keyboard.press('Escape');
    await expect(page.locator('#mbu-question-search')).not.toBeVisible();
  });

  test('Studio exposes Smart Review, opt-in Adaptive Mode, Due Review, and multi-window analytics', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await expect(page.getByRole('button',{name:'Start Smart Review'})).toBeVisible();
    await expect(page.locator('#adaptiveToggle')).toBeVisible();
    expect(await page.locator('#adaptiveToggle').isChecked()).toBe(false);
    await expect(page.getByRole('button',{name:'Review Due'})).toBeVisible();
    await expect(page.locator('#analyticsSummary')).toContainText('Overall accuracy');
    await expect(page.locator('#analyticsSummary')).toContainText('Last 7 days');
    await expect(page.locator('#analyticsSummary')).toContainText('Last 30 days');
  });

  test('Exam dashboard surfaces Continue Studying and recent study activity', async ({ page }) => {
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(()=>{
      const at=Date.now();
      localStorage.setItem('mbu_exam1_studio_v1',JSON.stringify({ans:{},flags:{},crosses:{},reports:[],active:{uids:['b1-1','b1-2','b1-3'],pos:1,answers:{},updated:at}}));
      MBUStudyIntelligence.clearAll();
      MBUStudyIntelligence.recordAnswer('b1',{uid:'dash-test',id:'dash-test',topic:'Monitoring',stem:'Dashboard test'},true,{bankLabel:'Quiz Bank 1'});
    });
    await page.reload();await page.evaluate(() => MBUPageReady);
    await expect(page.locator('#continuePanel')).toContainText('Study Studio');
    await expect(page.locator('#continuePanel')).toContainText('Question 2 / 3');
    await expect(page.locator('#recentPanel')).toContainText('Today');
    await expect(page.locator('#recentPanel')).toContainText('100%');
  });

  test('Signed-in cloud account exposes device and restore-history data', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'test@example.com'}})}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>{
      if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{device_id:'other-device',device_label:'Mac',app_build:'test-build',first_seen_at:new Date().toISOString(),last_seen_at:new Date().toISOString()}])});
      return route.fulfill({status:201,contentType:'application/json',body:''})
    });
    await page.route(cloud+'/rest/v1/mbu_sync_versions?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:7,store_key:'mbu_exam1_studio_v1',device_id:'other-device',server_revision:3,saved_at:new Date().toISOString(),client_revision:2,client_updated_at:new Date().toISOString()}])}));
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(() => MBUSupabase.signIn('test@example.com','correct horse battery staple'));
    const data=await page.evaluate(async()=>({devices:await MBUSupabase.listDevices(),history:await MBUSupabase.listHistory(10)}));
    expect(data.devices[0]).toMatchObject({device_id:'other-device',device_label:'Mac'});
    expect(data.history[0]).toMatchObject({id:7,store_key:'mbu_exam1_studio_v1',server_revision:3});
  });

  test('Smart Review cold start is distributed and Due Review keeps due-time order', async ({ page }) => {
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    const out=await page.evaluate(()=>{
      MBUStudyIntelligence.clearAll();
      const sample=[];
      for(let b=1;b<=4;b++)for(let i=0;i<30;i++)sample.push({uid:'bank'+b+'-'+i,bank:'bank'+b,topic:'Topic '+b,stem:'Question '+b+' '+i});
      const smart=MBUStudyIntelligence.smartReview(sample,50);
      const banks=[...new Set(smart.map(q=>q.bank))];

      const first=ALL[0],second=ALL[1];
      MBUStudyIntelligence.recordAnswer(first.bank,first,false,{bankLabel:first.bankLabel,set:first.set,questionId:first.uid});
      MBUStudyIntelligence.recordAnswer(second.bank,second,false,{bankLabel:second.bankLabel,set:second.set,questionId:second.uid});
      const raw=JSON.parse(localStorage.getItem(MBUStudyIntelligence.STORE));
      raw.reviews[first.uid].dueAt=Date.now()-1000;
      raw.reviews[second.uid].dueAt=Date.now()-5000;
      localStorage.setItem(MBUStudyIntelligence.STORE,JSON.stringify(raw));
      window.dispatchEvent(new StorageEvent('storage',{key:MBUStudyIntelligence.STORE}));
      startMode('due');
      return{banks,dueOrder:session.slice(0,2).map(q=>q.uid),expected:[second.uid,first.uid]};
    });
    expect(out.banks.length).toBeGreaterThan(1);
    expect(out.dueOrder).toEqual(out.expected);
  });

  test('Question report also persists normalized issue metadata', async ({ page }) => {
    await page.route('https://script.google.com/**',route=>route.fulfill({status:200,contentType:'text/plain',body:'ok'}));
    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(()=>{
      MBUStudyIntelligence.clearAll();
      const q=ALL[0];
      MBUStudio.report(q.bank,q,{bankLabel:q.bankLabel,set:q.set,questionNumber:q.seq+1,selected:[]});
    });
    await expect(page.locator('#mbu-report-modal')).toHaveClass(/open/);
    await page.locator('#mbu-report-reason').selectOption({index:1});
    await page.locator('#mbu-report-comment').fill('Regression test issue');
    await page.locator('#mbu-report-submit').click();
    await expect.poll(()=>page.evaluate(()=>MBUStudyIntelligence.issues().length)).toBe(1);
    const issue=await page.evaluate(()=>MBUStudyIntelligence.issues()[0]);
    expect(issue.comment).toBe('Regression test issue');
    expect(issue.status).toBe('open');
  });

  test('Cloud account renders devices and restore points in the account UI', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'test@example.com'}})}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>{
      if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{device_id:'other-device',device_label:'MacBook',app_build:'stable-test',first_seen_at:new Date().toISOString(),last_seen_at:new Date().toISOString()}])});
      return route.fulfill({status:201,contentType:'application/json',body:''})
    });
    await page.route(cloud+'/rest/v1/mbu_sync_versions?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:9,store_key:'mbu_exam1_studio_v1',device_id:'other-device',server_revision:4,saved_at:new Date().toISOString(),client_revision:3,client_updated_at:new Date().toISOString()}])}));
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(() => MBUSupabase.signIn('test@example.com','correct horse battery staple'));
    await page.locator('.mbu-global-nav__cloud').click();
    await page.getByText('Devices',{exact:true}).click();
    await expect(page.locator('[data-cloud-devices]')).toContainText('MacBook');
    await page.getByText('Restore progress',{exact:true}).click();
    await expect(page.locator('[data-cloud-history]')).toContainText('Study Studio');
    await expect(page.locator('[data-cloud-history]')).toContainText('revision 4');
  });

  test('Quiz session stat bars use Answered, Correct, Missed, and Accuracy', async ({ page }) => {
    await page.goto(exam + '/quiz-bank-1.html');await page.evaluate(() => MBUQuizReady);
    await page.getByRole('button',{name:/Start Practice Set 1/}).click();
    await expect(page.locator('#quiz .stats')).toContainText('Answered:');
    await expect(page.locator('#quiz .stats')).toContainText('Correct:');
    await expect(page.locator('#quiz .stats')).toContainText('Missed:');
    await expect(page.locator('#quiz .stats')).toContainText('Accuracy:');
    await expect(page.locator('#quiz .stats')).not.toContainText('Completed:');

    await page.goto(exam + '/studio.html');await waitForStudio(page);
    await page.evaluate(()=>{
      const first=document.querySelector('#sourceChecks input[type=checkbox]');
      if(first)first.checked=true;
      document.getElementById('count').value='10';
      startMode('custom');
    });
    await expect(page.locator('#quiz .stats')).toContainText('Answered:');
    await expect(page.locator('#quiz .stats')).toContainText('Correct:');
    await expect(page.locator('#quiz .stats')).toContainText('Accuracy:');
  });

  test('Continue Studying deep-links directly into the saved canonical practice set', async ({ page }) => {
    await page.addInitScript(() => {
      const blank=()=>({answers:{},graded:{},correct:{},strikes:{},current:0});
      const state={sets:{1:blank(),2:blank(),3:blank(),4:blank(),5:blank()},missed:{1:[],2:[],3:[],4:[],5:[]},test6:blank()};
      state.sets[2].current=4;
      localStorage.setItem('SRNA_COMBINED_EXAM_SET_1_2026_V1',JSON.stringify(state));
      localStorage.setItem('mbu_sync_meta_v1',JSON.stringify({SRNA_COMBINED_EXAM_SET_1_2026_V1:{revision:1,updatedAt:Date.now(),deviceId:'test'}}));
    });
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    const link=page.locator('#continuePanel a').filter({hasText:'Quiz Bank 1'}).first();
    await expect(link).toHaveAttribute('href',/quiz-bank-1\.html\?set=2$/);
    await link.click();
    await page.evaluate(() => MBUQuizReady);
    await expect(page.locator('#quiz')).toBeVisible();
    await expect(page.locator('#progress')).toContainText('Question 5 of 100');
  });

  test('Advanced Hazards attempts preserve topic metadata in shared analytics', async ({ page }) => {
    await page.goto(exam + '/hazards-bank-3.html');await page.evaluate(() => MBUPageReady);
    const result=await page.evaluate(()=>{
      MBUStudyIntelligence.clearAll();
      const q=BANK[0];
      MBUStudyIntelligence.recordAnswer('h3',q,false,{bankLabel:'Workstation Hazards',set:q.set,questionId:q.id});
      const summary=MBUStudyIntelligence.summary();
      return{topic:q.topic,topics:Object.keys(summary.byTopic),banks:Object.keys(summary.byBank)};
    });
    expect(result.topic).toBeTruthy();
    expect(result.topic).not.toBe('Other');
    expect(result.topics).toContain(result.topic);
    expect(result.banks).toContain('Workstation Hazards');
  });

  test('Cloud device removal deletes only the selected non-current device row', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let deletedUrl='';
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'test@example.com'}})}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>{
      if(route.request().method()==='DELETE'){deletedUrl=route.request().url();return route.fulfill({status:204,body:''})}
      if(route.request().method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:'[]'});
      return route.fulfill({status:201,contentType:'application/json',body:''})
    });
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(() => MBUSupabase.signIn('test@example.com','correct horse battery staple'));
    await expect(page.evaluate(() => MBUSupabase.removeDevice(MBUSync.deviceId()))).rejects.toThrow(/cannot remove/i);
    await page.evaluate(() => MBUSupabase.removeDevice('old-device'));
    expect(deletedUrl).toContain('device_id=eq.old-device');
    expect(deletedUrl).toContain('user_id=eq.');
  });

  test('Cloud version restore uses the current server revision as an atomic write guard', async ({ page }) => {
    const cloud='https://xqyasyambwdyhsjkftqu.supabase.co';let rpcBody=null;
    await page.route(cloud+'/auth/v1/token?grant_type=password',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'00000000-0000-0000-0000-000000000001',email:'test@example.com'}})}));
    await page.route(cloud+'/rest/v1/mbu_sync_versions?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:44,store_key:'mbu_exam1_studio_v1',payload:{restored:true},server_revision:8,saved_at:new Date().toISOString()}])}));
    await page.route(cloud+'/rest/v1/mbu_sync_state?*',route=>{
      const url=route.request().url();
      if(url.includes('store_key=eq.mbu_exam1_studio_v1'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{store_key:'mbu_exam1_studio_v1',server_revision:12,client_revision:5,payload:{current:true},device_id:'other',client_updated_at:new Date().toISOString()}])});
      return route.fulfill({status:200,contentType:'application/json',body:'[]'})
    });
    await page.route(cloud+'/rest/v1/rpc/mbu_sync_write_state',route=>{
      rpcBody=JSON.parse(route.request().postData()||'{}');
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({applied:true,row:{store_key:rpcBody.p_store_key,payload:rpcBody.p_payload,device_id:rpcBody.p_device_id,client_revision:rpcBody.p_client_revision,client_updated_at:rpcBody.p_client_updated_at,server_revision:13}})})
    });
    await page.route(cloud+'/rest/v1/mbu_sync_devices?*',route=>route.fulfill({status:201,contentType:'application/json',body:''}));
    await page.goto(exam + '/index.html');await page.evaluate(() => MBUPageReady);
    await page.evaluate(() => MBUSupabase.signIn('test@example.com','correct horse battery staple'));
    await page.evaluate(() => MBUSupabase.restoreVersion(44));
    expect(rpcBody.p_store_key).toBe('mbu_exam1_studio_v1');
    expect(rpcBody.p_payload).toEqual({restored:true});
    expect(rpcBody.p_expected_server_revision).toBe(12);
    expect(rpcBody.p_client_revision).toBe(6);
  });

  test('Hazards dashboard loads the canonical styled card layout', async ({ page }) => {
    await page.setViewportSize({width:1024,height:1366});
    await page.goto(exam + '/hazards.html');await page.evaluate(() => MBUPageReady);
    const styles=await page.evaluate(()=>{
      const body=getComputedStyle(document.body),panel=getComputedStyle(document.querySelector('.panel')),grid=getComputedStyle(document.querySelector('.grid')),card=getComputedStyle(document.querySelector('.card')),btn=getComputedStyle(document.querySelector('.card .btn'));
      return{
        bodyFont:body.fontFamily,
        bodyBg:body.backgroundColor,
        panelBg:panel.backgroundColor,
        gridDisplay:grid.display,
        gridColumns:grid.gridTemplateColumns,
        cardBorder:card.borderTopWidth,
        cardRadius:card.borderRadius,
        buttonDisplay:btn.display,
        buttonColor:btn.color
      }
    });
    expect(styles.bodyFont).toMatch(/Segoe UI|Arial|Helvetica|sans-serif/i);
    expect(styles.bodyBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(styles.panelBg).toBe('rgb(255, 255, 255)');
    expect(styles.gridDisplay).toBe('grid');
    expect(styles.gridColumns).not.toBe('none');
    expect(styles.cardBorder).not.toBe('0px');
    expect(styles.cardRadius).not.toBe('0px');
    expect(['flex','inline-flex']).toContain(styles.buttonDisplay);
    expect(styles.buttonColor).toBe('rgb(255, 255, 255)');
  });

  test('Primary study surfaces stay visually intact across phone, iPad, and desktop widths', async ({ page }) => {
    const viewports=[
      {name:'phone',width:390,height:844},
      {name:'ipad-portrait',width:768,height:1024},
      {name:'ipad-landscape',width:1024,height:768},
      {name:'desktop',width:1440,height:900}
    ];
    const pages=[
      ['Exam dashboard','index.html'],
      ['Bank 1','quiz-bank-1.html'],
      ['Bank 2','quiz-bank-2.html'],
      ['Bank 3','quiz-bank-3.html'],
      ['Combined','combined.html'],
      ['Hazards','hazards.html'],
      ['Studio','studio.html']
    ];
    for(const vp of viewports){
      await page.setViewportSize({width:vp.width,height:vp.height});
      for(const [label,path] of pages){
        await page.goto(exam+'/'+path);await page.evaluate(() => MBUPageReady);
        const result=await page.evaluate(()=>{
          const body=getComputedStyle(document.body),nav=document.querySelector('.mbu-global-nav'),main=document.getElementById('mbu-main')||document.querySelector('main,.panel,.container,.wrap');
          return{
            overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
            font:body.fontFamily,
            navVisible:!!nav&&getComputedStyle(nav).display!=='none'&&nav.getBoundingClientRect().height>20,
            mainVisible:!!main&&main.getBoundingClientRect().height>20
          }
        });
        expect(result.overflow, label+' overflows at '+vp.name).toBeLessThanOrEqual(2);
        expect(result.font, label+' fell back to default serif at '+vp.name).not.toMatch(/Times New Roman/i);
        expect(result.navVisible, label+' nav hidden at '+vp.name).toBe(true);
        expect(result.mainVisible, label+' main content hidden at '+vp.name).toBe(true);
      }
    }
  });

});
