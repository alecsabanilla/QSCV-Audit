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

/* Fallback branch list — used until config/branches exists in Firestore. */
export const FALLBACK_BRANCHES = [
  {name:"SM Pampanga", area:"North"}, {name:"SM North EDSA", area:"North"},
  {name:"Trinoma", area:"North"}, {name:"Timog", area:"North"},
  {name:"Greenhills", area:"North"}, {name:"Tiendesitas", area:"North"},
  {name:"G2", area:"South"}, {name:"Magallanes", area:"South"},
  {name:"NAIA T3", area:"South"}, {name:"Ermita", area:"South"},
  {name:"MOA", area:"South"}, {name:"Southmall", area:"South"},
  {name:"Sta. Rosa", area:"South"}, {name:"Festival", area:"South"}
];

let M = null;            // loaded firebase modules
let app, auth, db;
let user = null;
let profile = null;      // users/{uid} doc: {name, role, area}
let audits = [];         // shared audits, newest first
let status = "connecting";
let statusNote = "";

const subs = {auth:new Set(), audits:new Set(), status:new Set(), branches:new Set()};
let branches = FALLBACK_BRANCHES;

const emit = (k, v) => subs[k].forEach(f => { try{ f(v); }catch(e){} });
const setStatus = (s, note) => { status = s; statusNote = note || ""; emit("status", {status, note:statusNote}); };

export const getStatus  = () => ({status, note:statusNote});
export const getUser    = () => user;
export const getProfile = () => profile;
export const getAudits  = () => audits;
export const getBranches= () => branches;
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
    M = Object.assign({}, a, b, c);
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
        profile = {name:u.email, role:"auditor"};
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
function watchProfile(uid){
  if(unProfile){ unProfile(); unProfile = null; }
  /* Live rather than one-shot: a role granted after sign-in applies immediately,
     and a failed first read (offline, cold cache) recovers on its own. */
  unProfile = M.onSnapshot(M.doc(db, "users", uid),
    snap => {
      const d = snap.exists() ? snap.data() : null;
      profile = d || {name:(user && user.email) || "", role:"auditor"};
      emit("auth", {user, profile});
    },
    () => {
      if(!profile) profile = {name:(user && user.email) || "", role:"auditor"};
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
  unBranches = M.onSnapshot(M.doc(db, "config", "branches"),
    snap => {
      const d = snap.data();
      if(d && Array.isArray(d.list) && d.list.length){ branches = d.list; emit("branches", branches); }
    },
    () => {}
  );
}
function stopWatch(){
  if(unAudits){ unAudits(); unAudits = null; }
  if(unBranches){ unBranches(); unBranches = null; }
  if(unProfile){ unProfile(); unProfile = null; }
  everLive = false;
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

export const STATUS_LABEL = {
  connecting:"Connecting", live:"Synced", offline:"Offline · queued",
  "signed-out":"Not signed in", error:"Sync error"
};
