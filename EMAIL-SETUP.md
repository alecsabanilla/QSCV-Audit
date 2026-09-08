# Report email — Firebase setup

The app writes a send request; **Firebase sends the email**. Three things to switch on, once.

## 1. Blaze plan
Console → ⚙ → Usage and billing → Details & settings → Modify plan → Blaze.
Storage and the email extension both require it. Free monthly allowance covers this
workload (~5 GB stored, 2M function calls); expect ~₱0/month at 100 audits.
Set a budget alert at ₱500 while you're in there.

## 2. Trigger Email extension
Console → Extensions → search "Trigger Email from Firestore" → Install.

| Setting | Value |
| --- | --- |
| Firestore collection | `mail` |
| SMTP connection URI | `smtps://qscvcavten@cavallino.com.ph@smtp.gmail.com:465` |
| SMTP password | a Google **App Password**, not the mailbox password |
| Default FROM | `QSCV Audit <qscvcavten@cavallino.com.ph>` |
| Default REPLY-TO | `qscvcavten@cavallino.com.ph` |

App Password: myaccount.google.com → Security → 2-Step Verification → App passwords.
If Workspace uses SMTP relay instead, swap the URI for `smtp-relay.gmail.com:465`
and whitelist the sender in Admin console → Apps → Gmail → Routing.

## 3. Publish the rules
- Firestore → Rules → paste `firestore.rules` → Publish (adds the `mail` queue).
- Storage → Get started, then Rules → paste `storage.rules` → Publish.

## MOD copies
The MOD is cc'd only when the branch record carries an address. Add them once in
Firestore → `config/branches` → the `list` array, giving each entry a `modEmail`:

```json
{"name": "SM North EDSA", "area": "North", "modEmail": "mod.smnorth@cavallino.com.ph"}
```

## Photo retention (12 months)
Console → Storage → ⋮ on the bucket → Lifecycle → Add rule →
Delete object, Age 365 days, prefix `evidence/`. Audit records are unaffected.

## Routing in force

| Always | Area manager |
| --- | --- |
| qscvcavten, alessandra.abanilla, jennard.gonzales | Roxie — Southmall, Festival, Glorietta (G2), Sta. Rosa, NAIA T3 |
| | Neil — Trinoma, SM North EDSA, MOA, SM Pampanga, Magallanes |
| | Albert — Tiendesitas, Ermita, Timog, Greenhills |

Edit `AREA_OWNERS` in `qscv-mail.js` to change it.

## Checking a send
Firestore → `mail` → newest document. The extension writes a `delivery` field:
`state: SUCCESS` means Workspace accepted it. `ERROR` shows the SMTP reason —
almost always a wrong App Password.
