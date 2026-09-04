/* QSCV — Firebase backend
   This is the ONLY file with your Firebase project's keys in it.
   Get these from: Firebase console -> Project settings (gear icon) -> General
   -> "Your apps" -> click the web app (</>) -> SDK setup and configuration -> Config
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage, ref, uploadString, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB26QxGuFVj7Ov4rnPKOaw3eL7xsnMNQ0Q",
  authDomain: "racks-qscv-audit.firebaseapp.com",
  projectId: "racks-qscv-audit",
  storageBucket: "racks-qscv-audit.firebasestorage.app",
  messagingSenderId: "197029007787",
  appId: "1:197029007787:web:482e9708b02c514ee7c2ee"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

const PENDING_KEY = "qscv-pending-sync-v1";

function docIdFor(rec){
  return (rec.branch + "_" + rec.date).replace(/[^a-zA-Z0-9_-]/g, "_");
}

/* Upload one photo (as a data: URL, straight from FileReader) to Firebase Storage.
   Returns its public download URL. */
export async function uploadPhoto(dataUrl, path){
  const r = ref(storage, path);
  await uploadString(r, dataUrl, "data_url");
  return getDownloadURL(r);
}

/* Write one finished audit to the shared "audits" collection.
   Same branch+date upserts the existing record, matching the old local-archive behavior.
   If the device is offline, the record is queued locally and retried later via flushPending(). */
export async function saveAudit(rec){
  const id = docIdFor(rec);
  try{
    await setDoc(doc(db, "audits", id), Object.assign({}, rec, {syncedAt: serverTimestamp()}));
    return {ok:true};
  }catch(err){
    try{
      const raw = localStorage.getItem(PENDING_KEY);
      const all = raw ? JSON.parse(raw) : [];
      all.push(rec);
      localStorage.setItem(PENDING_KEY, JSON.stringify(all));
    }catch(e){}
    return {ok:false, error:err};
  }
}

/* Call on app load — retries any audits that failed to sync earlier (e.g. no signal in-store). */
export async function flushPending(){
  let all = [];
  try{ const raw = localStorage.getItem(PENDING_KEY); all = raw ? JSON.parse(raw) : []; }catch(e){ return; }
  if(!all.length) return;
  const remaining = [];
  for(const rec of all){
    const res = await saveAudit(rec);
    if(!res.ok) remaining.push(rec);
  }
  try{ localStorage.setItem(PENDING_KEY, JSON.stringify(remaining)); }catch(e){}
}

/* Live-subscribe to every audit in the portfolio. onData fires immediately, then again
   on every create/update from any auditor's device — this is what makes the dashboard live. */
export function subscribeAudits(onData, onError){
  return onSnapshot(collection(db, "audits"), snap=>{
    const records = [];
    snap.forEach(d=> records.push(d.data()));
    onData(records);
  }, onError);
}
