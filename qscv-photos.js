/* On-device photo store for QSCV evidence.
   Photos are held in IndexedDB (localStorage is far too small for images), keyed
   by the finding they belong to, so they survive reload, airplane mode and a
   force-quit — and the printable report can render them. */

const DB = "qscv-photos";
const STORE = "photos";
let dbp = null;

function open(){
  if(dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  return dbp;
}

function tx(mode, fn){
  return open().then(d => new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  }));
}

const id = (key, slot) => key + "#" + slot;

/* Store a picked File as a data URL (portable into print and Firestore later). */
export function put(key, slot, file){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      tx("readwrite", st => st.put({url, key, slot, at:Date.now()}, id(key, slot)))
        .then(() => res(url)).catch(rej);
    };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function remove(key, slot){
  return tx("readwrite", st => st.delete(id(key, slot))).catch(()=>{});
}

/* Every stored photo as {evidenceKey: [url, url, url]}. */
export function loadAll(){
  return open().then(d => new Promise(res => {
    const out = {};
    const t = d.transaction(STORE, "readonly");
    const rq = t.objectStore(STORE).openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if(!c){ res(out); return; }
      const v = c.value;
      if(v && v.key){
        if(!out[v.key]) out[v.key] = [];
        out[v.key][v.slot] = v.url;
      }
      c.continue();
    };
    rq.onerror = () => res(out);
  })).catch(() => ({}));
}

/* Drop every photo — used when an auditor resets the draft. */
export function clearAll(){
  return tx("readwrite", st => st.clear()).catch(()=>{});
}

export function estimate(){
  if(!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
  return navigator.storage.estimate().then(e => ({used:e.usage, quota:e.quota})).catch(() => null);
}
