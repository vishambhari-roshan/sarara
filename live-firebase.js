import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js';
import {getAuth,signInAnonymously,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js';
import {getDatabase,ref,set,get,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getDatabase(app);
export async function connect(){
 await new Promise((resolve,reject)=>{const off=onAuthStateChanged(auth,()=>{off();resolve();},reject);});
 if(!auth.currentUser)await signInAnonymously(auth);
 return {uid:auth.currentUser.uid,read:async p=>(await get(ref(db,p))).val(),write:(p,v)=>set(ref(db,p),v),
  watch:(p,cb,err)=>onValue(ref(db,p),s=>cb(s.val()),err),
  transact:async(p,expected,fn)=>{const result=await runTransaction(ref(db,p),s=>{if(!s||s.rev!==expected)return;return fn(s);},{applyLocally:false});if(!result.committed)throw Error('The game changed on another screen. Review it and try again.');return result.snapshot.val();}
 };
}
