(()=>{'use strict';
const C=SararaCore,$=id=>document.getElementById(id),KEY='sarara_v6',id=()=>crypto.randomUUID(),today=()=>C.day(Date.now());
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
let state,showUndo=[],loadError=false;
try{const saved=localStorage.getItem(KEY);if(saved){state=JSON.parse(saved);validate(state);}else{
 const old=JSON.parse(localStorage.getItem('sarara_players_v5')||'null');
 const players=(old||['Roshan','Jayesh','Mayank','Bhawesh','Raunak'].map((name,i)=>({id:id(),name,ghar:0,points:0,show:i===0}))).map(p=>({...p,status:'playing'}));
 const history=JSON.parse(localStorage.getItem('sarara_history_v5')||'[]').map(r=>({...r,id:id(),date:C.day(r.ts)}));
 state={version:6,players,history,trash:[],draft:{id:id(),date:today(),saved:false,revealed:false}};
}}catch(e){loadError=true;state={version:6,players:[],history:[],trash:[],draft:{id:id(),date:today(),saved:false,revealed:false}};}
function validate(s){
 if(s.version!==6||!Array.isArray(s.players)||!Array.isArray(s.history)||!Array.isArray(s.trash)||!s.draft||!/^\d{4}-\d{2}-\d{2}$/.test(s.draft.date)||typeof s.draft.id!=='string')throw Error('Not a SARARA v6 backup.');
 const validPlayer=p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Number.isSafeInteger(p.ghar)&&Number.isSafeInteger(p.points);
 if(!s.players.every(p=>validPlayer(p)&&['playing','sitout','left','absent'].includes(p.status))||new Set(s.players.map(p=>p.id)).size!==s.players.length)throw Error('Invalid players in backup.');
 if(![...s.history,...s.trash].every(r=>r&&typeof r.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Array.isArray(r.players)&&r.players.every(p=>validPlayer(p)&&Number.isSafeInteger(p.netReceive))))throw Error('Invalid round data.');
 if(new Set(s.history.map(r=>r.id)).size!==s.history.length)throw Error('Duplicate rounds in backup.');
}
function notify(message){$('notice').textContent=message;$('notice').style.display='block';}
function persist(){if(loadError){notify('Existing data could not be read. It has not been overwritten. Restore a valid backup before editing.');return false;}try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){notify('Cannot save to this browser. Download a backup now; changes may be lost on refresh.');return false;}}
function locked(){if(state.draft.saved){notify('This round is saved. Start a new round, or reopen the saved round from History.');return true;}return loadError;}
function changed(){state.draft.revealed=false;persist();render();}
function render(){
 $('gameDate').value=state.draft.date;
 $('roundStatus').textContent=state.draft.saved?'Saved — locked':state.draft.revealed?'Result shown':'Draft — not saved';
 $('players').innerHTML=state.players.map(p=>`<div class="player" data-player="${esc(p.id)}"><label class="who"><span class="sr-only">Player</span><input type="text" data-field="name" value="${esc(p.name)}" maxlength="60" ${state.draft.saved?'disabled':''}></label><label class="attendance"><span class="sr-only">Participation</span><select data-field="status" ${state.draft.saved?'disabled':''}>${[['playing','Play'],['sitout','Out'],['left','Left'],['absent','Away']].map(([v,l])=>`<option value="${v}" ${v===p.status?'selected':''}>${l}</option>`).join('')}</select></label><label><span class="sr-only">GHAR</span><input type="number" step="1" min="0" data-field="ghar" value="${p.ghar}" ${p.status!=='playing'||state.draft.saved?'disabled':''}></label><label><span class="sr-only">Points</span><input type="number" step="1" min="0" data-field="points" value="${p.points}" ${p.status!=='playing'||p.show||state.draft.saved?'disabled':''}></label><label class="show"><span class="sr-only">Show player</span><input type="radio" name="show" data-field="show" ${p.show?'checked':''} ${p.status!=='playing'||state.draft.saved?'disabled':''}></label><div class="result" data-result="${esc(p.id)}">${p.status==='playing'?'—':'—'}</div></div>`).join('');
 $('summary').hidden=true;
 if(state.draft.revealed){try{const r=C.compute(state.players);document.querySelectorAll('[data-result]').forEach(el=>{const p=r.players.find(p=>p.id===el.dataset.result);if(p){el.textContent=p.netReceive>0?'+'+p.netReceive:String(p.netReceive);el.className='result '+(p.netReceive>0?'positive':p.netReceive<0?'negative':'');}});$('summary').textContent=`GHAR: ${r.totalGhar} · Pays: ${r.totalPays} · Receives: ${r.totalReceives} · Balanced: ${r.totalPays===r.totalReceives?'Yes':'No'}`;$('summary').hidden=false;}catch(e){notify(e.message);}}
 $('saveRound').disabled=state.draft.saved||!state.draft.revealed||loadError;$('showResult').disabled=state.draft.saved||loadError;$('hideResult').disabled=state.draft.saved||!state.draft.revealed;$('undoShow').disabled=state.draft.saved||!showUndo.length;
 $('addPlayer').disabled=state.draft.saved||loadError;
 renderReports();renderHistory();
}
$('players').addEventListener('change',e=>{const field=e.target.dataset.field;if(!field||locked())return;const p=state.players.find(p=>p.id===e.target.closest('[data-player]').dataset.player);
 if(field==='show'){showUndo.push(state.players.map(p=>({id:p.id,show:!!p.show})));state.players.forEach(x=>x.show=x.id===p.id);}
 else if(field==='status'){if(e.target.value==='playing'&&state.players.filter(x=>x.status==='playing').length>=12&&p.status!=='playing'){notify('Only 12 players can play a round.');render();return;}p.status=e.target.value;if(p.status!=='playing')p.show=false;}
 else if(field==='name'){p.name=e.target.value.trim()||p.name;}
 else {const v=Number(e.target.value);if(!Number.isSafeInteger(v)||v<0||v>1000000000){notify('Enter a whole number from 0 to 1,000,000,000.');render();return;}p[field]=v;}
 changed();});
$('addPlayer').onclick=()=>{if(locked())return;const name=$('newName').value.trim();if(!name){notify('Enter the player’s name.');return;}if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase())){notify('This name is already on the list. Select Playing to rejoin.');return;}state.players.push({id:id(),name,ghar:0,points:0,show:false,status:state.players.filter(p=>p.status==='playing').length<12?'playing':'sitout'});$('newName').value='';changed();};
$('undoShow').onclick=()=>{if(locked())return;const previous=showUndo.pop();if(!previous)return;state.players.forEach(p=>p.show=p.status==='playing'&&!!previous.find(x=>x.id===p.id)?.show);changed();};
$('showResult').onclick=()=>{if(locked())return;try{C.compute(state.players);state.draft.revealed=true;persist();render();}catch(e){notify(e.message);}};
$('hideResult').onclick=()=>{if(!locked())changed();};
$('saveRound').onclick=()=>{if(locked()||!state.draft.revealed)return;try{C.saveRound(state,C.compute(state.players),state.draft.id,Date.now());persist();render();}catch(e){notify(e.message);}};
function newDraft(date,resetAttendance){state.draft={id:id(),date,saved:false,revealed:false};showUndo=[];state.players.forEach(p=>{p.ghar=0;p.points=0;p.show=false;if(resetAttendance)p.status='absent';});persist();render();}
$('nextRound').onclick=()=>{if(loadError)return;if(!state.draft.saved&&!confirm('Discard this unsaved round and start a new one?'))return;newDraft(state.draft.date,false);};
$('newDay').onclick=()=>{if(loadError)return;const date=$('gameDate').value;if(!date){notify('Select a game date.');return;}if(!confirm('Start a fresh round on '+date+'? Unsaved entries will be cleared. Select who is playing for this day; saved history stays unchanged.')){$('gameDate').value=state.draft.date;return;}newDraft(date,true);$('reportDate').value=date;renderReports();};
function filtered(){return state.history.filter(r=>$('reportMode').value==='all'||r.date===$('reportDate').value);}
const columns=['Player','Net ±','Shows','Played','Wins','Losses'];
function reportRows(rounds){return C.totals(rounds,state.players).map(p=>[p.name,p.net,p.unknownShows?p.shows+'*':p.shows,p.played,p.wins,p.losses]);}
function table(rows,headers){return '<table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((x,i)=>'<td class="'+(headers[i]==='Net ±'?(x>0?'positive':x<0?'negative':''):'')+'">'+esc(headers[i]==='Net ±'&&x>0?'+'+x:x)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
function renderReports(){const rounds=filtered();$('reportLabel').textContent=($('reportMode').value==='all'?'All dates':$('reportDate').value)+' · '+rounds.length+' saved rounds';$('report').innerHTML=rounds.length?table(reportRows(rounds),columns):'<p class="muted">No saved rounds for this selection.</p>';}
$('reportMode').onchange=renderReports;$('reportDate').onchange=renderReports;
function renderHistory(){const rounds=filtered();$('history').innerHTML=rounds.length?[...rounds].reverse().map((r)=>`<details><summary>${esc(r.date)} · ${esc(new Date(r.ts).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'}))} · ${r.players.length} players</summary><div class="tablewrap">${table(r.players.map(p=>[p.name,p.ghar,p.points,p.netReceive]),['Player','GHAR','Points','Net'])}</div><div class="toolbar spacer"><button class="secondary" data-reopen="${esc(r.id)}">Reopen to correct</button><button class="danger" data-delete="${esc(r.id)}">Delete round</button></div></details>`).join(''):'<p class="muted">No saved rounds for this selection.</p>';
 $('trash').innerHTML=state.trash.map(r=>`<p>${esc(r.date)} · ${r.players.length} players <button class="secondary" data-restore="${esc(r.id)}">Restore deleted round</button></p>`).join('')||'<p class="muted">No deleted rounds.</p>';}
$('reportMode').onchange=()=>{renderReports();renderHistory();};$('reportDate').onchange=$('reportMode').onchange;
$('history').onclick=e=>{const del=e.target.dataset.delete,reopen=e.target.dataset.reopen;if(!del&&!reopen||loadError)return;const r=state.history.find(r=>r.id===(del||reopen));if(!r)return;
 if(del){if(!confirm('Delete this saved round from all totals? You can restore it below.'))return;state.trash.push({...r,deletedAt:Date.now()});state.history=state.history.filter(x=>x.id!==r.id);if(state.draft.id===r.id)newDraft(state.draft.date,false);}
 else{if(!confirm('Reopen this round? It will leave report totals until saved again. Any current unsaved entries will be discarded.'))return;state.history=state.history.filter(x=>x.id!==r.id);const roster=new Map(state.players.map(p=>[p.id,{...p,ghar:0,points:0,show:false,status:'sitout'}]));r.players.forEach(p=>roster.set(p.id,{...p,status:'playing',show:!!p.show}));state.players=[...roster.values()];state.draft={id:r.id,date:r.date,saved:false,revealed:false};showUndo=[];notify('Round reopened. Check participants and the Show player, then Show result and Save round.');}
 persist();render();};
$('trash').onclick=e=>{const rid=e.target.dataset.restore;if(!rid||loadError)return;const r=state.trash.find(r=>r.id===rid);if(!r||state.history.some(x=>x.id===rid))return;if(!confirm('Restore this round and include it in reports again?'))return;state.history.push(r);state.history.sort((a,b)=>a.ts-b.ts);state.trash=state.trash.filter(x=>x.id!==rid);persist();render();};
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('backup').onclick=()=>download(JSON.stringify(state,null,2),'sarara-backup-'+today()+'.json','application/json');
$('restore').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const s=JSON.parse(await f.text());validate(s);if(!confirm('Replace this browser’s data with this backup? Download your current backup first.'))return;state=s;loadError=false;showUndo=[];persist();render();notify('Backup restored.');}catch(err){notify('Backup not restored: '+err.message);}finally{e.target.value='';}};
$('csv').onclick=()=>{const safe=x=>{let s=String(x);if(typeof x==='string'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};download('\uFEFF'+[columns,...reportRows(filtered())].map(r=>r.map(safe).join(',')).join('\r\n'),'sarara-report.csv','text/csv;charset=utf-8');};
$('export').onclick=()=>{if(typeof XLSX==='undefined'){notify('Excel export needs the internet to load. Use CSV export instead.');return;}const wb=XLSX.utils.book_new();const sheet=(rows,headers,name)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers,...rows]),name);
 sheet(reportRows(filtered()),columns,'Selected report');sheet(reportRows(state.history),columns,'Consolidated');
 sheet([...new Set(state.history.map(r=>r.date))].sort().flatMap(d=>reportRows(state.history.filter(r=>r.date===d)).map(r=>[d,...r])),['Date',...columns],'Date-wise');
 sheet(state.history.flatMap(r=>r.players.map(p=>[r.date,r.id,p.id,p.name,p.ghar,p.points,p.netReceive])),['Date','Round ID','Player ID','Player','GHAR','Points','Net'],'Round details');XLSX.writeFile(wb,'sarara-results.xlsx');};
// Another tab may have newer data. Never silently overwrite it with an older draft.
window.addEventListener('storage',e=>{if(e.key===KEY){loadError=true;notify('SARARA changed in another tab. Reload this page before making changes.');document.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);}});
$('focusRound').onclick=()=>{const focused=document.body.classList.toggle('round-focus');$('focusRound').textContent=focused?'Exit full screen':'Full-screen players';if(focused)window.scrollTo(0,0);};
$('reportDate').value=state.draft.date;render();if(loadError)notify('Existing data could not be read; it has not been overwritten. Restore a valid backup.');else persist();
})();
