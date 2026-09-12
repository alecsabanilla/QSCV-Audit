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

/* Evidence keys ("I.0.0") repeat across brands and point at different
   questions, so every record is scoped by brand. Records written before
   brands existed carry no prefix and are treated as RACKS. */
const DEFAULT_BRAND = "racks";
const norm = b => b || DEFAULT_BRAND;
const id = (brand, key, slot) => norm(brand) + "|" + key + "#" + slot;

/* Store a picked File as a data URL (portable into print and Firestore later). */
export function put(key, slot, file, brand){
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      tx("readwrite", st => st.put({url, key, slot, brand:norm(brand), at:Date.now()}, id(brand, key, slot)))
        .then(() => res(url)).catch(rej);
    };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function remove(key, slot, brand){
  return tx("readwrite", st => st.delete(id(brand, key, slot))).catch(()=>{});
}

/* One brand's photos as {evidenceKey: [url, url, url]}. */
export function loadAll(brand){
  const want = norm(brand);
  return open().then(d => new Promise(res => {
    const out = {};
    const t = d.transaction(STORE, "readonly");
    const rq = t.objectStore(STORE).openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if(!c){ res(out); return; }
      const v = c.value;
      if(v && v.key && norm(v.brand) === want){
        if(!out[v.key]) out[v.key] = [];
        out[v.key][v.slot] = v.url;
      }
      c.continue();
    };
    rq.onerror = () => res(out);
  })).catch(() => ({}));
}

/* Drop one brand's photos — the other brand's parked draft keeps its evidence. */
export function clearAll(brand){
  const want = norm(brand);
  return open().then(d => new Promise(res => {
    const t = d.transaction(STORE, "readwrite");
    const st = t.objectStore(STORE);
    const rq = st.openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if(!c) return;
      if(norm(c.value && c.value.brand) === want) st.delete(c.key);
      c.continue();
    };
    t.oncomplete = () => res();
    t.onerror = () => res();
  })).catch(()=>{});
}

/* Photos captured before brands existed carry no brand field. Stamp them once
   with whatever brand the app was last used on, rather than guessing RACKS. */
const MIGRATED = "qscv-photos-branded-v1";
export function migrate(brand){
  try{ if(localStorage.getItem(MIGRATED)) return Promise.resolve(0); }catch(e){}
  const want = norm(brand);
  return open().then(d => new Promise(res => {
    let moved = 0;
    const t = d.transaction(STORE, "readwrite");
    const st = t.objectStore(STORE);
    const rq = st.openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if(!c) return;
      const v = c.value;
      if(v && v.key && !v.brand){
        st.delete(c.key);
        st.put(Object.assign({}, v, {brand:want}), id(want, v.key, v.slot));
        moved++;
      }
      c.continue();
    };
    t.oncomplete = () => { try{ localStorage.setItem(MIGRATED, "1"); }catch(e){} res(moved); };
    t.onerror = () => res(moved);
  })).catch(() => 0);
}

export function estimate(){
  if(!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
  return navigator.storage.estimate().then(e => ({used:e.usage, quota:e.quota})).catch(() => null);
}
