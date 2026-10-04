(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const states=['playing','sitout','left','absent'];
 function normalize(s){s=copy(s);s.players=s.players||{};s.history=s.history||{};s.trash=s.trash||{};return s;}
 function fresh(id,date){return {id,date,phase:'open',show:'',previousShow:''};}
 function change(current,action){
  const s=normalize(current),d=s.draft;
  const open=()=>{if(d.phase!=='open')throw Error('Hide/reopen the result before changing this round.');};
  switch(action.type){
   case 'add':open();if(s.players[action.player.id])throw Error('Player already added.');s.players[action.player.id]=action.player;break;
   case 'status':open();if(!s.players[action.id])throw Error('Player not found.');s.players[action.id].status=action.status;if(d.show===action.id&&action.status!=='playing')d.show='';break;
   case 'controller':open();s.players[action.id].controller=action.uid;break;
   case 'showPlayer':open();if(s.players[action.id]?.status!=='playing')throw Error('Choose a playing player.');d.previousShow=d.show;d.show=action.id;break;
   case 'undoShow':open();d.show=s.players[d.previousShow]?.status==='playing'?d.previousShow:'';d.previousShow='';break;
   case 'lock':open();if(!d.show)throw Error('Select the Show player first.');d.phase='locking';break;
   case 'reveal':if(d.phase!=='locking')throw Error('Round has changed.');d.result=action.result;d.phase='shown';break;
   case 'hide':if(d.phase==='saved')throw Error('Use Reopen on this saved round.');d.phase='open';delete d.result;break;
   case 'save':if(d.phase!=='shown'||!d.result)throw Error('Show the result before saving.');if(s.history[d.id])throw Error('Already saved.');s.history[d.id]={id:d.id,date:d.date,ts:action.ts,show:d.show,players:copy(d.result.players)};d.phase='saved';break;
   case 'next':s.draft=fresh(action.id,action.date||d.date);if(action.newDay)Object.values(s.players).forEach(p=>p.status='absent');break;
   case 'delete':if(!s.history[action.id])throw Error('Round no longer exists.');s.trash[action.id]=s.history[action.id];delete s.history[action.id];if(d.id===action.id)s.draft=fresh(action.newId,d.date);break;
   case 'restore':if(!s.trash[action.id]||s.history[action.id])throw Error('Round cannot be restored.');s.history[action.id]=s.trash[action.id];delete s.trash[action.id];break;
   case 'reopen':{
    const r=s.history[action.id];if(!r)throw Error('Round no longer exists.');
    Object.values(s.players).forEach(p=>p.status='sitout');
    r.players.forEach(p=>s.players[p.id]={...p,status:'playing',controller:s.players[p.id]?.controller||p.controller});
    s.draft=fresh(action.newId,r.date);s.draft.show=r.show;s.draft.seed={};r.players.forEach(p=>s.draft.seed[p.id]={ghar:p.ghar,points:p.points,submitted:true});
    delete s.history[action.id];break;
   }
   default:throw Error('Unknown action.');
  }
  if(Object.values(s.players).some(p=>!states.includes(p.status)))throw Error('Invalid participation status.');
  if(Object.values(s.players).filter(p=>p.status==='playing').length>12)throw Error('Only 12 players can play in a round.');
  s.rev=(s.rev||0)+1;return s;
 }
 const api={normalize,fresh,change};if(typeof module!=='undefined')module.exports=api;else root.LiveModel=api;
})(typeof window!=='undefined'?window:globalThis);
