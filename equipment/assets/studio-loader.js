/* Build-driven Study Studio loader. Shared dependencies and the Studio runtime have one source of truth. */
(()=>{'use strict';
const runtime=window.MBUBuild;
async function start(){
  if(!runtime)throw Error('MBU build runtime is missing');
  await Promise.all([runtime.loadStyle('site-nav.css'),runtime.loadStyle('bank1-quiz-ui.css')]);
  await runtime.loadScript({src:'site-nav.js',data:{page:'studio'}});
  await runtime.loadScript('studio-sync.js');
  await runtime.loadScript('navigator.js');
  await runtime.loadScript('calculator.js');
  await runtime.loadScript('question-generator.js');
  await runtime.loadScript('studio-page.js');
  await runtime.loadScript('auto-update.js');
  return true
}
window.MBUStudioPageReady=start();
})();