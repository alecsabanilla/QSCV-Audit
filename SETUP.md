# Connecting your QSCV app to Firebase

## 1. Get your config values
In the Firebase console: **Project settings** (gear icon, top left) → **General** tab →
scroll to **"Your apps"**. If you haven't added a web app yet, click the **</>** icon to
create one (name it anything, e.g. "QSCV Web"). You'll be shown a `firebaseConfig` object.

Copy those 6 values into **`qscv-cloud.js`**, replacing the `REPLACE_WITH_...` placeholders:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 2. Turn on Firestore and Storage
Still in the Firebase console, left sidebar:
- **Build → Firestore Database → Create database**. Start in **production mode**, pick a
  location close to the Philippines (e.g. `asia-southeast1`).
- **Build → Storage → Get started**. Same region if it asks.

## 3. Set security rules
By default, production mode blocks everyone. Since there's no login system yet, open both
up for read/write so auditors and viewers can use the app (fine for an internal tool with a
private link — just don't post the link publicly):

**Firestore rules** (Firestore Database → Rules tab):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /audits/{auditId} {
      allow read, write: if true;
    }
  }
}
```

**Storage rules** (Storage → Rules tab):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /audits/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

(When you're ready to lock this down to real logged-in auditors, tell me — that's the
Firebase Auth step I mentioned, and it's a small follow-up on top of this.)

## 4. Push to GitHub Pages
Replace the files in your `QSCV-Audit` repo with everything in this folder (keep the same
file names/paths — `qscv-cloud.js` sits next to the `.dc.html` files, same level as
`qscv-history.js`). Commit and push; GitHub Pages will redeploy automatically.

## 5. Test it
- Open the audit app on your phone, fill in a full audit for one branch, sign both
  signatures, and submit.
- Open the dashboard on your laptop (or your boss's). The submitted audit should appear
  in the league table and heatmap within a couple seconds, with no page refresh needed.
- If it doesn't show up: open the browser console (F12) on the audit app — errors there
  usually mean the config values or security rules aren't right yet.

## What changed in the code
- **`qscv-cloud.js`** (new file) — holds your Firebase keys and three functions:
  `saveAudit()`, `subscribeAudits()`, `uploadPhoto()`.
- **`QSCV Audit App.dc.html`** — on submit, the audit now also uploads to Firestore
  (with any deviation photos going to Firebase Storage), in addition to the existing
  on-device save. If there's no signal, it queues locally and retries next time the app
  opens.
- **`QSCV Dashboard.dc.html`** — instead of reading local data once, it now subscribes
  live to the shared Firestore collection, so it updates in real time as audits come in
  from any device.
