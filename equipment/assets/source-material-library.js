(()=>{'use strict';
function fmt(n){if(!n)return'';const u=['B','KB','MB','GB'];let i=0;while(n>=1024&&i<3){n/=1024;i++}return(i?n.toFixed(1):Math.round(n))+' '+u[i]}
function mount({storage,$,esc}){
 async function render(){const out=$('gen-library-list');if(!out||!storage?.list)return;try{const rows=await storage.list();out.innerHTML=rows.length?rows.map(x=>`<div class="gen-library-row" data-source-path="${esc(x.path)}"><div><strong>${esc(x.name)}</strong><span>${esc(fmt(x.size))}${x.createdAt?' · '+esc(new Date(x.createdAt).toLocaleString()):''}</span></div><div><button type="button" data-source-download>Download</button><button type="button" data-source-delete>Delete</button></div></div>`).join(''):'<p class="gen-empty">No saved source materials yet.</p>'}catch(e){out.innerHTML='<p class="gen-empty">'+esc(e.message||'Could not load saved materials.')+'</p>'}}
 $('gen-library-refresh').onclick=render;
 $('gen-library-list').onclick=async e=>{const row=e.target.closest('[data-source-path]');if(!row)return;const path=row.dataset.sourcePath,name=row.querySelector('strong')?.textContent||'source-material';try{if(e.target.matches('[data-source-download]'))await storage.download(path,name);else if(e.target.matches('[data-source-delete]')){if(!confirm('Delete '+name+' from saved source materials?'))return;await storage.remove(path);await render()}}catch(err){$('gen-file-status').textContent=err.message||'Source material action failed.'}};
 return{render}
}
window.MBUSourceMaterialLibrary=Object.freeze({mount});
})();