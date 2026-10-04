(function(root){
  'use strict';
  const int = v => { const n = parseInt(String(v).replace(/[^\d-]/g,''),10); return Number.isFinite(n) ? n : 0; };
  const day = ts => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ts));
  // Original SARARA formula: only the list of participating players changes.
  function compute(all){
    const players = all.filter(p => !p.status || p.status === 'playing');
    if(players.length < 2 || players.length > 12) throw Error('Select 2–12 players for this round.');
    if(players.filter(p=>p.show).length !== 1) throw Error('Select exactly one Show player who is playing.');
    const n=players.length, gharArr=players.map(p=>int(p.ghar)), ptsArr=players.map(p=>int(p.points));
    const totalGhar=gharArr.reduce((s,v)=>s+v,0), showIndex=players.findIndex(p=>p.show);
    const sumOthersPoints=ptsArr.reduce((s,v,i)=>i===showIndex?s:s+v,0);
    const raw=new Array(n).fill(0);
    for(let i=0;i<n;i++){if(i!==showIndex)raw[i]=ptsArr[i]+totalGhar-(gharArr[i]*n);}
    raw[showIndex]=sumOthersPoints+(gharArr[showIndex]*n)-totalGhar;
    const netReceive=raw.map((r,i)=>i===showIndex?r:-r);
    return {players:players.map((p,i)=>({...p,netReceive:netReceive[i]})),totalGhar,
      totalPays:netReceive.reduce((s,v)=>s+Math.max(0,-v),0),totalReceives:netReceive.reduce((s,v)=>s+Math.max(0,v),0)};
  }
  function totals(rounds, roster=[]){
    const map=new Map();
    for(const r of rounds) for(const p of r.players){
      if(!map.has(p.id))map.set(p.id,{id:p.id,name:p.name,played:0,wins:0,losses:0,draws:0,won:0,lost:0,net:0});
      const t=map.get(p.id),v=int(p.netReceive);t.name=p.name;t.played++;t.net+=v;
      if(v>0){t.wins++;t.won+=v;}else if(v<0){t.losses++;t.lost-=v;}else t.draws++;
    }
    return [...map.values()].map(t=>({...t,name:roster.find(p=>p.id===t.id)?.name||t.name}));
  }
  function saveRound(state, result, id, now){
    if(state.history.some(r=>r.id===id))throw Error('This round is already saved. Start a new round or reopen it.');
    state.history.push({id,date:state.draft.date,ts:now,players:result.players.map(p=>({...p}))});
    state.draft.saved=true;state.draft.revealed=true;
  }
  const api={int,day,compute,totals,saveRound};
  if(typeof module!=='undefined')module.exports=api;else root.SararaCore=api;
})(typeof window!=='undefined'?window:globalThis);
