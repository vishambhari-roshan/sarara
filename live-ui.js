(()=>{'use strict';
const $=id=>document.getElementById(id),C=SararaCore,M=LiveModel,uid=()=>crypto.randomUUID().replaceAll('-',''),day=()=>C.day(Date.now()),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let api,code='',meta={},members={},state=null,entries={},proposals={},requests={},stops=[],entryStops=[],entrySignature='',busy=false,online=false;
const inputCache={};
const base=()=>`games/${code}`,host=()=>meta.host===api?.uid,notify=s=>$('message').textContent=s;
const attempt=fn=>async()=>{if(busy)return;busy=true;try{await fn();}catch(e){notify((e.code?e.code+': ':'')+e.message);}finally{busy=false;}};
const action=async a=>{if(!online)throw Error('You are offline. Reconnect before changing the game.');if(!host())throw Error('Only the host can do this.');const result=await api.transact(base()+'/state',state.rev,s=>M.change(s,a));state=M.normalize(result);return state;};
function stop(){stops.forEach(f=>f());entryStops.forEach(f=>f());stops=[];entryStops=[];entrySignature='';state=null;entries={};members={};proposals={};requests={};}
function watch(path,fn){stops.push(api.watch(base()+'/'+path,fn,e=>notify('Access failed: '+e.message+' Check that the supplied database rules have been published.')));}
async function enter(room){
 stop();code=room;meta=await api.read(base()+'/meta');if(!meta)throw Error('Game not found.');
 localStorage.setItem('sarara_live_room',code);history.replaceState(null,'','#'+code);
 $('lobby').hidden=true;$('room').hidden=false;$('roomTitle').textContent='Game '+code;$('role').textContent=host()?'Host':'Player';$('hostPanel').hidden=!host();$('hostActions').hidden=!host();
 $('hostNote').textContent=host()?'Host access belongs to this browser. Keep this browser’s data; clearing it loses this anonymous host identity.':'The host approves participation and controls Show, Save and corrections.';
 watch('members',v=>{members=v||{};render();});watch('state',v=>{if(v){state=M.normalize(v);subscribeEntries();render();}});watch('proposals',v=>{proposals=v||{};renderPending();});watch('requests',v=>{requests=v||{};renderPending();});
 notify('Joined game '+code+'. Share the invitation link with your players.');
}
function subscribeEntries(){
 if(!state)return;const paths=host()?['']:Object.values(state.players).filter(p=>p.id===api.uid||p.controller===api.uid).map(p=>p.id);
 const signature=state.draft.id+':'+paths.join(',');if(signature===entrySignature)return;
 entryStops.forEach(f=>f());entryStops=[];entrySignature=signature;entries={};
 paths.forEach(p=>entryStops.push(api.watch(`${base()}/entries/${state.draft.id}${p?'/'+p:''}`,v=>{if(p)entries[p]=v;else entries=v||{};renderRoster();},e=>notify('Entries unavailable: '+e.message))));
}
function rowEntry(p){return entries[p.id]||state.draft.seed?.[p.id]||null;}
function render(){if(!state)return;$('date').value=state.draft.date;if(!$('reportDate').value)$('reportDate').value=state.draft.date;$('phase').textContent=state.draft.date+' · '+state.draft.phase;
 renderRoster();renderPending();renderReports();
 const phase=state.draft.phase;$('reveal').disabled=phase!=='open'||!online;$('hide').disabled=phase==='saved'||phase==='open'||!online;$('undoShow').disabled=phase!=='open'||!state.draft.previousShow;$('save').disabled=phase!=='shown'||!online;
 $('result').textContent=state.draft.result&&['shown','saved'].includes(phase)?'Net shown above: + receive / − pay. Total pays '+state.draft.result.totalPays+' · Total receives '+state.draft.result.totalReceives: 'Results are hidden until the host presses Show result.';
}
const labels={playing:'Playing',sitout:'Sit out',left:'Left for today',absent:'Absent today'};

function renderRoster(){
 if(!state)return;
 const active=document.activeElement,focusId=active?.closest('[data-id]')?.dataset.id,focusField=active?.dataset.input;
 const open=state.draft.phase==='open',revealed=['shown','saved'].includes(state.draft.phase),short={playing:'Play',sitout:'Out',left:'Left',absent:'Away'};
 $('roster').innerHTML=Object.values(state.players).map(p=>{
  const can=host()||p.id===api.uid||p.controller===api.uid,e=rowEntry(p),key=state.draft.id+':'+p.id,typed=inputCache[key]||e||{},selected=state.draft.show===p.id;
  const result=revealed?state.draft.result?.players.find(x=>x.id===p.id):null,v=result?.netReceive;
  const sent=!!e?.submitted&&Number(typed.ghar)===e.ghar&&(selected||Number(typed.points)===e.points);
  const fields=can&&p.status==='playing';
  return `<div class="player compact-player" data-id="${esc(p.id)}">
   <strong class="player-name" title="${esc(p.name)}">${esc(p.name)}</strong>
   ${host()?`<select data-status ${open?'':'disabled'} aria-label="Participation for ${esc(p.name)}" title="${labels[p.status]}">${Object.entries(short).map(([value,label])=>`<option value="${value}" ${p.status===value?'selected':''}>${label}</option>`).join('')}</select>`:`<span class="status-text" title="${labels[p.status]}">${short[p.status]}</span>`}
   ${fields?`<input aria-label="GHAR for ${esc(p.name)}" data-input="ghar" type="number" inputmode="numeric" min="0" max="1000000000" step="1" value="${esc(typed.ghar??'')}" ${open?'':'disabled'}>
   <input aria-label="Points for ${esc(p.name)}" data-input="points" type="number" inputmode="numeric" min="0" max="1000000000" step="1" value="${esc(selected?0:typed.points??'')}" ${open&&!selected?'':'disabled'}>`:'<span class="private-value" aria-label="Private GHAR">—</span><span class="private-value" aria-label="Private points">—</span>'}
   ${host()?`<button data-show class="show-choice ${selected?'selected':''}" aria-label="Select ${esc(p.name)} as Show player" aria-pressed="${selected}" ${open&&p.status==='playing'?'':'disabled'}>${selected?'●':'○'}</button>`:`<span class="show-mark" aria-label="${selected?'Show player':'Not Show player'}">${selected?'●':'—'}</span>`}
   ${fields?`<button data-submit class="submit-small ${sent?'submitted':''}" aria-label="Submit figures for ${esc(p.name)}" title="${sent?'Submitted — tap to submit again':'Submit figures'}" ${open&&online?'':'disabled'}>${sent?'✓':'↑'}</button>`:'<span class="private-value">—</span>'}
   <strong data-net class="net-cell ${v>0?'positive':v<0?'negative':''}" aria-label="Net for ${esc(p.name)}">${v==null?'—':v>0?'+'+v:v}</strong>
  </div>`;
 }).join('');
 $('entryAssignments').hidden=!host();
 $('assignments').innerHTML=host()?Object.values(state.players).map(p=>`<label class="assignment-row" data-id="${esc(p.id)}"><span>${esc(p.name)}</span><select data-controller ${open?'':'disabled'} aria-label="Entry by for ${esc(p.name)}">${Object.entries(members).map(([u,m])=>`<option value="${esc(u)}" ${u===p.controller?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label>`).join(''):'';
 if(focusId&&focusField){const row=[...$('roster').querySelectorAll('[data-id]')].find(x=>x.dataset.id===focusId);row?.querySelector('[data-input="'+focusField+'"]')?.focus({preventScroll:true});}
}
function renderPending(){if(!state||!host())return;
 $('pending').innerHTML='<h3>Waiting to join</h3>'+Object.entries(members).filter(([u])=>!state.players[u]).map(([u,m])=>`<p>${esc(m.name)} <button data-add="${esc(u)}" class="secondary">Add to roster</button></p>`).join('')+Object.entries(proposals).map(([i,p])=>`<p>${esc(p.name)} · guest added by ${esc(members[p.addedBy]?.name||'member')} <button data-guest="${esc(i)}" class="secondary">Approve guest</button></p>`).join('');
 $('requests').innerHTML=Object.entries(requests).map(([u,r])=>`<p>${esc(members[u]?.name||'Player')} requests: ${esc(labels[r.status])} <button class="secondary" data-accept="${esc(u)}">Apply</button></p>`).join('');
}
function selectedRounds(){return Object.values(state?.history||{}).filter(r=>$('view').value==='all'||r.date===$('reportDate').value).sort((a,b)=>a.ts-b.ts);}
const headers=['Player','Net ±','Shows','Played','Wins','Losses'];
function reportRows(){return C.totals(selectedRounds(),Object.values(state.players)).map(t=>[t.name,t.net,t.unknownShows?t.shows+'*':t.shows,t.played,t.wins,t.losses]);}
function table(rows,cols){return '<div class="tablewrap"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((c,i)=>'<td class="'+(cols[i]==='Net ±'?(c>0?'positive':c<0?'negative':''):'')+'">'+esc(cols[i]==='Net ±'&&c>0?'+'+c:c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
function renderReports(){if(!state)return;const rounds=selectedRounds();$('report').innerHTML=rounds.length?table(reportRows(),headers):'<p>No saved rounds for this selection.</p>';
 $('history').innerHTML=[...rounds].reverse().map(r=>`<details><summary>${esc(r.date)} · ${esc(new Date(r.ts).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'}))} · ${r.players.length} players</summary>${table(r.players.map(p=>[p.name,p.ghar,p.points,p.netReceive]),['Player','GHAR','Points','Net'])}${host()?`<div class="actions"><button class="secondary" data-reopen="${esc(r.id)}">Reopen / correct</button><button class="danger" data-delete="${esc(r.id)}">Delete round</button></div>`:''}</details>`).join('');
 $('trash').innerHTML=Object.values(state.trash).map(r=>`<p>${esc(r.date)} · ${r.players.length} players ${host()?`<button data-restore="${esc(r.id)}" class="secondary">Restore</button>`:''}</p>`).join('')||'<p>None.</p>';
}
$('roster').addEventListener('input',e=>{if(!e.target.dataset.input)return;const row=e.target.closest('[data-id]'),key=state.draft.id+':'+row.dataset.id;inputCache[key]={ghar:row.querySelector('[data-input="ghar"]').value,points:row.querySelector('[data-input="points"]').value};const button=row.querySelector('[data-submit]');if(button){button.textContent='↑';button.classList.remove('submitted');button.title='Submit changed figures';}});
$('liveRound').addEventListener('change',e=>{const pid=e.target.closest('[data-id]')?.dataset.id;if(!pid)return;if(e.target.hasAttribute('data-status'))attempt(()=>action({type:'status',id:pid,status:e.target.value}))();if(e.target.hasAttribute('data-controller'))attempt(()=>action({type:'controller',id:pid,uid:e.target.value}))();});
$('roster').addEventListener('click',e=>{const row=e.target.closest('[data-id]');if(!row)return;const pid=row.dataset.id;
 if(e.target.hasAttribute('data-show'))attempt(()=>action({type:'showPlayer',id:pid}))();
 if(e.target.hasAttribute('data-submit'))attempt(async()=>{
  if(!online||state.draft.phase!=='open')throw Error('Wait for an open round and internet connection.');
  const gharText=row.querySelector('[data-input="ghar"]').value,pointsText=state.draft.show===pid?'0':row.querySelector('[data-input="points"]').value;
  const ghar=Number(gharText),points=Number(pointsText);if(gharText===''||pointsText===''||![ghar,points].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=1e9))throw Error('Enter whole GHAR and Points values between 0 and 1,000,000,000.');
  await api.write(`${base()}/entries/${state.draft.id}/${pid}`,{ghar,points,submitted:true});delete inputCache[state.draft.id+':'+pid];notify('Figures submitted for '+state.players[pid].name+'.');
 })();});
$('reveal').onclick=attempt(async()=>{
 const playing=Object.values(state.players).filter(p=>p.status==='playing');if(playing.length<2)throw Error('At least two players must be Playing.');
 await action({type:'lock'});try{
  const latest=await api.read(`${base()}/entries/${state.draft.id}`)||{};
  const players=Object.values(state.players).filter(p=>p.status==='playing').map(p=>{const entry=latest[p.id]||state.draft.seed?.[p.id];if(!entry?.submitted)throw Error(p.name+' has not submitted figures.');return {...p,...entry,show:p.id===state.draft.show};});
  const result=C.compute(players);await action({type:'reveal',result});notify('Result shown to all members.');
 }catch(e){await action({type:'hide'});throw e;}
});
$('hide').onclick=attempt(async()=>{await action({type:'hide'});notify('Result hidden. Correct the figures, then Show result again.');});$('undoShow').onclick=attempt(()=>action({type:'undoShow'}));$('save').onclick=attempt(()=>action({type:'save',ts:Date.now()}));
$('next').onclick=attempt(async()=>{if(state.draft.phase!=='saved'&&!confirm('Discard this unsaved round and start the next one?'))return;await action({type:'next',id:uid()});});
$('newDay').onclick=attempt(async()=>{const date=$('date').value;if(!date)throw Error('Select a date.');if(!confirm('Start this day? Unsaved entries are discarded; everyone starts Absent until selected.'))return;await action({type:'next',id:uid(),date,newDay:true});$('reportDate').value=date;renderReports();});
$('hostPanel').addEventListener('click',e=>attempt(async()=>{
 const u=e.target.dataset.add,g=e.target.dataset.guest,r=e.target.dataset.accept;
 if(u){const m=members[u];await action({type:'add',player:{id:u,name:m.name,controller:u,status:'sitout'}});}
 if(g){const p=proposals[g];if(!state.players[g])await action({type:'add',player:{id:g,name:p.name,controller:p.addedBy,status:'sitout'}});await api.write(base()+'/proposals/'+g,null);}
 if(r){const request=requests[r];if(!state.players[r])await action({type:'add',player:{id:r,name:members[r].name,controller:r,status:'sitout'}});await action({type:'status',id:r,status:request.status});await api.write(base()+'/requests/'+r,null);}
})());
$('myRequest').onclick=e=>{const status=e.target.dataset.request;if(status)attempt(async()=>{await api.write(base()+'/requests/'+api.uid,{status});notify('Request sent to host. Your participation changes after approval.');})();};
$('guest').onclick=attempt(async()=>{const name=$('guestName').value.trim();if(!name)throw Error('Enter the guest’s name.');const guestId='guest-'+uid();if(host())await action({type:'add',player:{id:guestId,name,controller:api.uid,status:'sitout'}});else await api.write(base()+'/proposals/'+guestId,{name,addedBy:api.uid});$('guestName').value='';notify(host()?'Guest added. Select Playing to include them.':'Guest sent to host for approval.');});
$('history').onclick=e=>attempt(async()=>{const del=e.target.dataset.delete,reopen=e.target.dataset.reopen;if(!del&&!reopen)return;if(!confirm(del?'Delete this round from reports? It can be restored.':'Reopen this round? It leaves totals until saved again, and the current unsaved round is discarded.'))return;await action({type:del?'delete':'reopen',id:del||reopen,newId:uid()});})();
$('trash').onclick=e=>{if(e.target.dataset.restore)attempt(()=>action({type:'restore',id:e.target.dataset.restore}))();};
$('view').onchange=renderReports;$('reportDate').onchange=renderReports;
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{const safe=x=>'"'+((typeof x==='string'&&/^[=+\-@\t\r]/.test(x)?"'":'')+String(x)).replaceAll('"','""')+'"';download('\uFEFF'+[headers,...reportRows()].map(r=>r.map(safe).join(',')).join('\r\n'),'sarara-'+code+'-'+$('view').value+'.csv','text/csv;charset=utf-8');};
$('backup').onclick=()=>download(JSON.stringify({game:code,meta,state,exportedAt:new Date().toISOString()},null,2),'sarara-live-'+code+'.json','application/json');
$('copyLink').onclick=attempt(async()=>{const link=new URL('live.html',location.href);link.hash=code;try{await navigator.clipboard.writeText(link.href);notify('Invitation link copied.');}catch(e){notify('Copy this link: '+link.href);}});
$('focusLive').onclick=()=>{const focused=document.body.classList.toggle('live-focus');$('focusLive').textContent=focused?'Exit full screen':'Full-screen players';if(focused)window.scrollTo(0,0);};
$('exit').onclick=()=>{document.body.classList.remove('live-focus');$('focusLive').textContent='Full-screen players';stop();$('room').hidden=true;$('lobby').hidden=false;history.replaceState(null,'',location.pathname);notify('You left the screen. Participation is unchanged; use a Sit out / Leave request when needed.');};
$('create').onclick=attempt(async()=>{if(!online)throw Error('Wait for connection.');const name=$('name').value.trim();if(!name)throw Error('Enter your name.');const room=uid().slice(0,16).toUpperCase();const initial={meta:{host:api.uid,createdAt:Date.now()},members:{[api.uid]:{name}},state:{rev:0,players:{[api.uid]:{id:api.uid,name,controller:api.uid,status:'playing'}},draft:M.fresh(uid(),day())}};await api.write('games/'+room,initial);await enter(room);});
$('join').onclick=attempt(async()=>{if(!online)throw Error('Wait for connection.');const room=$('code').value.trim().toUpperCase();if(!/^[A-F0-9]{16}$/.test(room))throw Error('Enter the 16-character game code from the host.');const name=$('name').value.trim();if(!name)throw Error('Enter your name.');const existing=await api.read(`games/${room}/members/${api.uid}`);if(!existing)await api.write(`games/${room}/members/${api.uid}`,{name});await enter(room);});
$('code').value=location.hash.slice(1)||localStorage.getItem('sarara_live_room')||'';
import('./live-firebase.js').then(m=>m.connect()).then(v=>{api=v;api.watch('.info/connected',value=>{online=!!value;$('create').disabled=!online;$('join').disabled=!online;$('connection').textContent=online?'Connected — changes sync across phones':'Offline — reconnect before submitting or changing the round';if(state)render();},e=>notify(e.message));notify('Ready. Create a game or enter the host’s game code.');}).catch(e=>notify('Could not connect: '+e.message+'. Check internet access and Anonymous sign-in.'));
})();
