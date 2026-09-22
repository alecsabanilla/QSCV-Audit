/* QSCV cloud layer — Firebase Auth + Firestore, offline-first.
   Local storage stays the mirror of record on the device; Firestore is the shared
   truth across auditors. Writes queue while offline and flush on reconnect. */

const CDN = "https://www.gstatic.com/firebasejs/10.12.2/";

export const CONFIG = {
  apiKey: "AIzaSyB26QxGuFVj7Ov4rnPKOaw3eL7xsnMNQOQ",
  authDomain: "racks-qscv-audit.firebaseapp.com",
  projectId: "racks-qscv-audit",
  storageBucket: "racks-qscv-audit.firebasestorage.app",
  messagingSenderId: "197029007787",
  appId: "1:197029007787:web:482e9708b02c514ee7c2ee",
  measurementId: "G-M556K23K3S"
};

/* Fallback rosters — used until the config docs exist in Firestore.
   config/branches holds RACKS, config/branchesTenya holds Tenya. */
export const BRANCH_DOCS = {racks:"branches", tenya:"branchesTenya"};

export const FALLBACK_BY_BRAND = {
  racks: [
    {name:"SM Pampanga", area:"North"}, {name:"SM North EDSA", area:"North"},
    {name:"Trinoma", area:"North"}, {name:"Timog", area:"North"},
    {name:"Greenhills", area:"North"}, {name:"Tiendesitas", area:"North"},
    {name:"Glorietta (G2)", area:"South"}, {name:"Magallanes", area:"South"},
    {name:"NAIA T3", area:"South"}, {name:"Ermita", area:"South"},
    {name:"MOA", area:"South"}, {name:"Southmall", area:"South"},
    {name:"Sta. Rosa", area:"South"}, {name:"Festival", area:"South"}
  ],
  tenya: [
    {name:"Tenya Express Market! Market!", area:"Express"},
    {name:"Tenya Express Mitsukoshi", area:"Express"},
    {name:"Tenya SM Southmall", area:"Full store"},
    {name:"Tenya Festival Mall", area:"Full store"},
    {name:"Tenya Glorietta 2", area:"Full store"},
    {name:"Tenya Tiendesitas", area:"Full store"},
    {name:"Tenya Paseo De Magallanes", area:"Full store"}
  ]
};

const tag = (list, brand) => (list||[]).map(b => Object.assign({brand}, b));

export const FALLBACK_BRANCHES = tag(FALLBACK_BY_BRAND.racks,"racks")
  .concat(tag(FALLBACK_BY_BRAND.tenya,"tenya"));

let M = null;            // loaded firebase modules
let app, auth, db;
let user = null;
let profile = null;      // users/{uid} doc: {name, role, area}
let audits = [];         // shared audits, newest first
let status = "connecting";
let statusNote = "";

const subs = {auth:new Set(), audits:new Set(), status:new Set(), branches:new Set()};
const byBrand = {racks: tag(FALLBACK_BY_BRAND.racks,"racks"), tenya: tag(FALLBACK_BY_BRAND.tenya,"tenya")};
let branches = byBrand.racks.concat(byBrand.tenya);
const flatten = () => { branches = byBrand.racks.concat(byBrand.tenya); };

const emit = (k, v) => subs[k].forEach(f => { try{ f(v); }catch(e){} });
const setStatus = (s, note) => { status = s; statusNote = note || ""; emit("status", {status, note:statusNote}); };

export const getStatus  = () => ({status, note:statusNote});
export const getUser    = () => user;
export const getProfile = () => profile;
export const getAudits  = () => audits;
export const getBranches= () => branches;
/* The branch roster for one brand — cloud when the config doc exists, the
   built-in list otherwise. */
export const getBranchesFor = brand => byBrand[brand] ? byBrand[brand].slice() : [];
export const isManager  = () => !!profile && profile.role === "manager";

export function onAuth(cb){ subs.auth.add(cb); cb({user, profile}); return () => subs.auth.delete(cb); }
export function onAudits(cb){ subs.audits.add(cb); cb(audits); return () => subs.audits.delete(cb); }
export function onStatus(cb){ subs.status.add(cb); cb({status, note:statusNote}); return () => subs.status.delete(cb); }
export function onBranches(cb){ subs.branches.add(cb); cb(branches); return () => subs.branches.delete(cb); }

let booting = null;
export function init(){
  if(booting) return booting;
  booting = (async () => {
    const [a, b, c] = await Promise.all([
      import(CDN + "firebase-app.js"),
      import(CDN + "firebase-auth.js"),
      import(CDN + "firebase-firestore.js")
    ]);
    let d = {};
    try{ d = await import(CDN + "firebase-storage.js"); }catch(e){}
    M = Object.assign({}, a, b, c, d);
    app = M.initializeApp(CONFIG);
    auth = M.getAuth(app);
    try{
      db = M.initializeFirestore(app, {
        localCache: M.persistentLocalCache({tabManager: M.persistentMultipleTabManager()}),
        /* Corporate proxies, VPNs and some extensions block Firestore's WebChannel
           stream, which leaves the SDK serving cache forever. Auto-detect falls
           back to long-polling instead of silently staying offline. */
        experimentalAutoDetectLongPolling: true
      });
    }catch(e){
      db = M.getFirestore(app);   // another tab already owns the cache
    }

    M.onAuthStateChanged(auth, async u => {
      user = u ? {uid:u.uid, email:u.email} : null;
      profile = null;
      if(u){
        profile = {name:u.email, role:"auditor", _found:false, _uid:u.uid, _err:null, _createErr:null, _cached:false};
        watchProfile(u.uid);
        setStatus("connecting", "");
        watchAudits();
        watchBranches();
        probe();
        if(typeof window !== "undefined" && !window.__qscvNet){
          window.__qscvNet = true;
          window.addEventListener("online", () => { if(user) probe(); });
          window.addEventListener("offline", () => { if(user) setStatus("offline", ""); });
        }
      }else{
        stopWatch();
        setStatus("signed-out", "");
      }
      emit("auth", {user, profile});
    });
    return true;
  })().catch(err => {
    setStatus("error", err && err.message ? err.message : "Firebase failed to load");
    throw err;
  });
  return booting;
}

let unProfile = null;
const createTried = new Set();
function watchProfile(uid){
  if(unProfile){ unProfile(); unProfile = null; }
  /* Live rather than one-shot: a role granted after sign-in applies immediately,
     and a failed first read (offline, cold cache) recovers on its own. */
  unProfile = M.onSnapshot(M.doc(db, "users", uid),
    snap => {
      const d = snap.exists() ? snap.data() : null;
      profile = Object.assign({name:(user && user.email) || "", role:"auditor"}, d || {}, {
        _found: snap.exists(), _uid: uid, _err: null,
        _cached: snap.metadata.fromCache,
        _createErr: (profile && profile._createErr) || null
      });
      emit("auth", {user, profile});
      /* Create the profile from the device so its id is guaranteed to be the
         real uid — typing a 28-character uid into the console by hand is the
         single most common way this breaks. Role stays auditor; a manager
         promotes it in the console. */
      if(!snap.exists() && !snap.metadata.fromCache && !createTried.has(uid)){
        createTried.add(uid);
        const nice = ((user && user.email) || "").split("@")[0]
          .split(/[._-]+/).filter(Boolean)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        M.setDoc(M.doc(db, "users", uid), {
          name: nice || (user && user.email) || "Auditor",
          role: "auditor",
          email: (user && user.email) || null,
          createdAt: Date.now()
        }, {merge:true}).catch(err => {
          profile = Object.assign({}, profile, {_createErr:(err && err.code) || "create failed"});
          emit("auth", {user, profile});
        });
      }
    },
    err => {
      profile = {name:(user && user.email) || "", role:"auditor", _found:false, _uid:uid,
                 _err:(err && err.code) || "read failed"};
      emit("auth", {user, profile});
    }
  );
}

let degradeTimer = null;
/* A snapshot flagged fromCache does NOT mean the connection is gone — Firestore
   emits cached snapshots routinely. Only call it offline if a real server read
   then fails, so a healthy listener never gets mislabelled. */
function maybeDegrade(){
  if(degradeTimer) return;
  degradeTimer = setTimeout(() => {
    degradeTimer = null;
    if(typeof navigator !== "undefined" && navigator.onLine === false){ setStatus("offline", ""); return; }
    M.getDocsFromServer(M.query(M.collection(db, "audits"), M.limit(1)))
      .then(() => setStatus("live", ""))
      .catch(() => setStatus("offline", ""));
  }, 2000);
}

let unAudits = null, unBranches = null;
let everLive = false;
function watchAudits(){
  if(unAudits) return;
  const q = M.query(M.collection(db, "audits"), M.orderBy("submittedAt", "desc"), M.limit(600));
  unAudits = M.onSnapshot(q, {includeMetadataChanges:true},
    snap => {
      audits = snap.docs.map(d => Object.assign({id:d.id}, d.data()));
      emit("audits", audits);
      if(!snap.metadata.fromCache){
        everLive = true;
        setStatus("live", snap.metadata.hasPendingWrites ? "Some changes are still uploading." : "");
      }else if(everLive){
        maybeDegrade();
      }
    },
    err => setStatus("error", err.message)
  );
}
function watchBranches(){
  if(unBranches) return;
  /* Both brands read their own document, so editing either roster in the
     Firebase console reaches the app without a re-upload. */
  const stops = Object.keys(BRANCH_DOCS).map(brand =>
    M.onSnapshot(M.doc(db, "config", BRANCH_DOCS[brand]),
      snap => {
        const d = snap.data();
        if(d && Array.isArray(d.list) && d.list.length){
          byBrand[brand] = tag(d.list, brand);
          flatten();
          emit("branches", branches);
        }
      },
      () => {}
    )
  );
  unBranches = () => stops.forEach(s => { try{ s(); }catch(e){} });
}
function stopWatch(){
  if(unAudits){ unAudits(); unAudits = null; }
  if(unBranches){ unBranches(); unBranches = null; }
  if(unProfile){ unProfile(); unProfile = null; }
  everLive = false;
  createTried.clear();
  audits = []; emit("audits", audits);
}

/* One direct server read so a blocked connection reports a real reason instead
   of sitting on "connecting" forever. */
async function probe(){
  try{
    await M.getDocsFromServer(M.query(M.collection(db, "audits"), M.limit(1)));
    everLive = true;
    setStatus("live", "");
  }catch(err){
    const code = (err && err.code) || "network";
    const msg = code === "permission-denied"
      ? "Firestore rules are blocking reads — publish firestore.rules, and check you're signed in."
      : code === "failed-precondition"
        ? "Firestore isn't set up for this project yet — create the database in the Firebase console."
        : "Can't reach Firestore (" + code + "). A VPN, work proxy or browser blocker may be stopping it.";
    if(!everLive) setStatus("error", msg);
  }
}

export async function signIn(email, password){
  await init();
  const cred = await M.signInWithEmailAndPassword(auth, String(email||"").trim(), String(password||""));
  return cred.user;
}
export async function signOutNow(){
  await init();
  return M.signOut(auth);
}
export async function resetPassword(email){
  await init();
  return M.sendPasswordResetEmail(auth, String(email||"").trim());
}

const slug = s => String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

/* One document per auditor per branch per audit date, so two auditors on the
   same branch in one cycle both persist and the dashboard can show the latest. */
export async function saveAudit(rec){
  await init();
  if(!user) throw new Error("Sign in before signing off an audit.");
  const id = [rec.date, slug(rec.branch), user.uid.slice(0,6)].join("_");
  const doc = Object.assign({}, rec, {
    auditorUid: user.uid,
    auditorEmail: user.email,
    auditor: rec.auditor || (profile && profile.name) || user.email,
    submittedAt: rec.submittedAt || Date.now(),
    updatedAt: Date.now()
  });
  await M.setDoc(M.doc(db, "audits", id), doc, {merge:true});
  return id;
}

/* ---------- report mail ---------- */

/* The same id saveAudit writes under, so evidence, the audit and the email all
   point at one record. */
export async function currentAuditId(rec){
  await init();
  const tail = user ? user.uid.slice(0,6) : "local";
  return [rec.date, slug(rec.branch), tail].join("_");
}

/* Evidence goes to Storage rather than into the email: managers can then view
   findings remotely, which the on-device photo store never allowed. */
export async function uploadEvidence(path, blob){
  await init();
  if(!user) throw new Error("Sign in before sending a report.");
  if(!M.getStorage) throw new Error("Firebase Storage isn't available.");
  const st = M.getStorage(app);
  const ref = M.ref(st, path);
  await M.uploadBytes(ref, blob, {contentType:"image/jpeg", cacheControl:"public,max-age=31536000"});
  return M.getDownloadURL(ref);
}

/* A document in `mail` is the send request. The Trigger Email extension watches
   this collection and does the actual SMTP delivery, so no credentials ever
   touch the phone and a queued send survives the app being closed. */
export async function queueMail(doc){
  await init();
  if(!user) throw new Error("Sign in before sending a report.");
  const ref = await M.addDoc(M.collection(db, "mail"), Object.assign({}, doc, {
    requestedBy: user.email,
    requestedByUid: user.uid,
    requestedAt: Date.now()
  }));
  return ref.id;
}

/* Managers void rather than delete: an audit is a compliance record, so a bad
   one is struck from scoring while staying auditable — who voided it and why. */
export async function voidAudit(auditId, reason){
  await init();
  if(!user) throw new Error("Sign in first.");
  if(!isManager()) throw new Error("Only a QSCV manager can void an audit.");
  await M.updateDoc(M.doc(db, "audits", auditId), {
    voided: true,
    voidReason: String(reason||"").trim() || "No reason given",
    voidedBy: (profile && profile.name) || user.email,
    voidedByUid: user.uid,
    voidedAt: Date.now()
  });
}

export async function unvoidAudit(auditId){
  await init();
  if(!isManager()) throw new Error("Only a QSCV manager can restore an audit.");
  await M.updateDoc(M.doc(db, "audits", auditId), {
    voided: false, voidReason: null, voidedBy: null, voidedByUid: null, voidedAt: null
  });
}

export const isVoid = r => !!(r && r.voided);
export const liveOnly = rows => (rows||[]).filter(r => !isVoid(r));

/* Merge seeded/local records with cloud records. Cloud wins on the same
   branch + date + auditor; the newest submittedAt wins for the dashboard. */
export function mergeAudits(local, cloud){
  const key = r => [r.date, r.branch, r.auditorUid || r.auditor || ""].join("|");
  const out = new Map();
  (local||[]).forEach(r => out.set(key(r), r));
  (cloud||[]).forEach(r => out.set(key(r), r));
  return Array.from(out.values()).sort((x,y) => (y.submittedAt||0) - (x.submittedAt||0));
}

/* Plain-language sign-in errors, shared by the app and the dashboard. */
export function authMessage(err){
  const c = (err && err.code) || "";
  if(c.indexOf("configuration-not-found")>=0 || c.indexOf("operation-not-allowed")>=0)
    return "Email sign-in isn't switched on yet for this project. In the Firebase console: Authentication → Sign-in method → enable Email/Password.";
  if(c.indexOf("invalid-credential")>=0 || c.indexOf("wrong-password")>=0) return "Wrong email or password.";
  if(c.indexOf("invalid-email")>=0) return "That doesn't look like a valid email address.";
  if(c.indexOf("user-not-found")>=0) return "No account for that email — ask your manager to create one.";
  if(c.indexOf("user-disabled")>=0) return "That account has been disabled.";
  if(c.indexOf("too-many-requests")>=0) return "Too many attempts. Wait a minute and try again.";
  if(c.indexOf("network")>=0) return "No connection — you can still audit offline.";
  return "Sign-in failed. " + ((err && err.message) || "");
}

/* ---------- sync check ----------
   "Nothing is syncing" has five very different causes that all look identical
   from the outside. This runs each one as a real request and names the
   failure, so nobody has to read a console to find out which. */
export async function diagnose(){
  const out = [];
  const add = (label, ok, note) => out.push({label, ok, note: note || ""});

  if(typeof navigator !== "undefined" && navigator.onLine === false){
    add("Internet", false, "This device reports no connection. Everything below is skipped — audits stay saved on the phone and upload when you reconnect.");
    return out;
  }
  add("Internet", true, "");

  try{ await init(); add("Firebase loaded", true, ""); }
  catch(e){
    add("Firebase loaded", false, "The Firebase library couldn't load. A work proxy, VPN or browser blocker is usually the cause — try mobile data.");
    return out;
  }

  if(!user){
    add("Signed in", false, "Not signed in on this device. Audits save locally but never reach the shared database — sign in and they upload.");
    return out;
  }
  add("Signed in", true, user.email);

  try{
    const snap = await M.getDocsFromServer(M.query(M.collection(db, "audits"), M.limit(1)));
    add("Read from database", true, snap.size ? "Server responded." : "Server responded, but there are no audit documents yet.");
  }catch(err){
    const c = (err && err.code) || "network";
    add("Read from database", false,
      c === "permission-denied"
        ? "Rules are rejecting reads. In the Firebase console: Firestore → Rules → paste firestore.rules → Publish."
        : c === "failed-precondition" || c === "not-found"
          ? "No Firestore database exists in this project yet. Firebase console → Firestore Database → Create database."
          : "Couldn't reach Firestore (" + c + "). Usually a proxy, VPN or blocked network.");
    return out;
  }

  /* A write is the test that actually matters: reads can pass while rules or a
     missing profile still block every upload. Written to the caller's own
     diag doc, then removed, so it never pollutes the audit collection. */
  try{
    const ref = M.doc(db, "users", user.uid);
    await M.setDoc(ref, {lastSyncCheck: Date.now()}, {merge:true});
    add("Write to database", true, "A test write succeeded — uploads are working.");
  }catch(err){
    const c = (err && err.code) || "unknown";
    add("Write to database", false,
      c === "permission-denied"
        ? "Reads work but writes are blocked — the published rules are out of date. Re-publish firestore.rules."
        : "Write failed (" + c + ").");
    return out;
  }

  try{
    const snap = await M.getDocsFromServer(M.query(M.collection(db, "audits"), M.limit(600)));
    add("Audits in the cloud", true, snap.size + " audit document" + (snap.size===1?"":"s") + " on the server."
      + (snap.size === 0 ? " Nothing has been signed off yet, or earlier audits were completed before sign-in existed — those are still on the auditor's phone." : ""));
  }catch(e){ add("Audits in the cloud", false, "Couldn't count audits."); }

  return out;
}

export const STATUS_LABEL = {
  connecting:"Connecting", live:"Synced", offline:"Offline · queued",
  "signed-out":"Not signed in", error:"Sync error"
};
