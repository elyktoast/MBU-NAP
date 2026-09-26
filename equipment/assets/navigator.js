(() => {
  function button({label,active=false,flagged=false,result=null,onClick=''}) {
    const bg=result===true?'#c6f6d5':result===false?'#fed7d7':active?'#ebf8ff':'white';
    const bd=result===true?'#38a169':result===false?'#e53e3e':active?'#2b6cb0':'#cbd5e0';
    const color=result===true?'#22543d':result===false?'#742a2a':'inherit';
    const status=result===true?'correct':result===false?'incorrect':'unanswered';
    const name='Question '+label+', '+status+(flagged?', flagged':'')+(active?', current':'');
    return '<button type="button" class="'+status+(active?' active':'')+(flagged?' flagged':'')+'" aria-label="'+name+'" title="'+name+'"'+(active?' aria-current="step"':'')+
      ' style="min-width:38px;height:34px;border:2px solid '+bd+';border-radius:6px;background:'+bg+
      ';color:'+color+';'+(flagged?'outline:2px solid #d69e2e;outline-offset:1px;':'')+
      '" onclick="'+onClick+'">'+label+'</button>';
  }
  window.MBUNavigator={button};
})();
