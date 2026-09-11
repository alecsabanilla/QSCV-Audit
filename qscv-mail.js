/* QSCV report mail — recipient routing, evidence upload, and the email body.
   The auditor taps Send on the report screen; this module compresses the
   findings' photos into Firebase Storage, builds the HTML summary, and writes a
   document to the `mail` collection that the Firestore Trigger Email extension
   picks up and sends through Workspace SMTP. Nothing is sent from the phone. */

import * as C from "./qscv-cloud.js";

/* ---------- recipients ---------- */

export const ALWAYS = [
  "qscvcavten@cavallino.com.ph",
  "alessandra.abanilla@cavallino.com.ph",
  "jennard.gonzales@cavallino.com.ph"
];

export const REPLY_TO = "qscvcavten@cavallino.com.ph";

/* Area managers own specific stores, not whole North/South halves. */
export const AREA_OWNERS = [
  {email:"roxie.picarzo@cavallino.com.ph",   name:"Roxie Picarzo",
   branches:["Southmall","Festival","Glorietta (G2)","Sta. Rosa","NAIA T3"]},
  {email:"neil.gutierrez@cavallino.com.ph",  name:"Neil Gutierrez",
   branches:["Trinoma","SM North EDSA","MOA","SM Pampanga","Magallanes"]},
  {email:"albert.ignacio@cavallino.com.ph",  name:"Albert Ignacio",
   branches:["Tiendesitas","Ermita","Timog","Greenhills"]}
];

/* "Glorietta (G2)", "glorietta", "G2" and "SM North Edsa" all have to match. */
const norm = s => String(s||"").toLowerCase().replace(/\(.*?\)/g," ").replace(/[^a-z0-9]+/g,"");
const ALIAS = {glorietta:"glorietta", g2:"glorietta", naiat3:"naiat3", smnorthedsa:"smnorthedsa"};
const canon = s => { const n = norm(s); return ALIAS[n] || n; };

const OWNER_BY_BRANCH = (() => {
  const m = {};
  AREA_OWNERS.forEach(o => o.branches.forEach(b => { m[canon(b)] = o; }));
  return m;
})();

export const ownerFor = branch => OWNER_BY_BRANCH[canon(branch)] || null;

/* to = fixed QSCV list + the store's area manager. cc = the MOD who signed,
   when the branch record carries an address. */
export function routeFor(branch, branchRec, extraCc){
  const owner = ownerFor(branch);
  const to = ALWAYS.slice();
  if(owner) to.push(owner.email);
  const modEmail = branchRec && branchRec.modEmail ? String(branchRec.modEmail).trim() : "";
  /* The store's own people: the auditor keys these in on the report screen and
     the app remembers them per branch, so the second audit is prefilled. */
  const store = (extraCc || []).map(e=>String(e).trim()).filter(Boolean);
  const cc = (modEmail ? [modEmail] : []).concat(store.filter(e=>e !== modEmail));
  return {
    to, cc,
    owner, modEmail, store,
    warning: owner ? "" : "No area manager is mapped to " + (branch||"this branch") + " — sending to the QSCV list only."
  };
}

/* ---------- photo compression ---------- */

const MAX_EDGE = 1200, QUALITY = 0.72;

/* Phone cameras produce 3-4MB frames; a branch on mobile data can't upload
   fifteen of those. 1200px on the long edge is still enough to read a label. */
export function compress(dataUrl){
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const cx = cv.getContext("2d");
      cx.fillStyle = "#fff"; cx.fillRect(0,0,w,h);
      cx.drawImage(img, 0, 0, w, h);
      cv.toBlob(b => res(b || null), "image/jpeg", QUALITY);
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}

/* ---------- send ---------- */

const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const DASH = "https://alecsabanilla.github.io/QSCV-Audit/QSCV%20Dashboard.dc.html";
const fmtDate = d => {
  const t = new Date(String(d||"") + "T00:00:00");
  return isNaN(t) ? String(d||"") : t.toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"});
};

export const subjectFor = rec => "QSCV Audit Report — " + (rec.branch||"Branch") + " (" + fmtDate(rec.date) + ")";

/* rec: the archived audit record. findings: [{cat, item, severity, note, urls}].
   onProgress(done, total) drives the button's uploading state. */
export async function sendReport(rec, findings, opts){
  const o = opts || {};
  const route = routeFor(rec.branch, o.branchRec, o.extraCc);
  const auditId = await C.currentAuditId(rec);

  /* Upload evidence first — the email links Storage URLs, so managers see the
     photos without the auditor's phone being involved. */
  const shots = [];
  findings.forEach(f => (f.urls||[]).forEach((u, i) => { if(u) shots.push({f, url:u, i}); }));
  const uploaded = [];
  for(let n = 0; n < shots.length; n++){
    const s = shots[n];
    if(o.onProgress) o.onProgress(n, shots.length);
    try{
      const blob = await compress(s.url);
      if(!blob) continue;
      const path = "evidence/" + auditId + "/" + s.f.key.replace(/[^A-Za-z0-9_-]+/g,"_") + "-" + s.i + ".jpg";
      const link = await C.uploadEvidence(path, blob);
      uploaded.push({link, cat:s.f.cat, item:s.f.item, severity:s.f.severity});
    }catch(e){ /* one bad photo must not block the report */ }
  }
  if(o.onProgress) o.onProgress(shots.length, shots.length);

  const html = buildHtml(rec, uploaded, route);
  await C.queueMail({
    to: route.to,
    cc: route.cc,
    replyTo: REPLY_TO,
    message: {subject: subjectFor(rec), html, text: buildText(rec, uploaded)},
    meta: {auditId, branch:rec.branch, date:rec.date, photos:uploaded.length}
  });
  return {auditId, photos:uploaded.length, to:route.to, cc:route.cc, warning:route.warning};
}

/* ---------- the email ---------- */

/* Literal hex, not var(--*): email clients don't support custom properties.
   These mirror the design system's --color-accent / --color-accent-700 /
   --color-bg / --color-text — change them together with the palette. */
const ACCENT = "#3f6b4a", DEEP = "#2f5a3b", INK = "#1d1f20", GROUND = "#f2f2f3", RULE = "#c9cdd1";
const SEV = {H:"Critical", M:"Major", L:"Minor"};

function gradeOf(score){
  const s = Number(score)||0;
  return s>=95 ? "A" : s>=90 ? "B" : s>=85 ? "C" : s>=80 ? "D" : "F";
}

function buildHtml(rec, shots, route){
  const grade = rec.grade || gradeOf(rec.score);
  const dev = rec.dev || {};
  const devLine = [["H","Critical"],["M","Major"],["L","Minor"]]
    .map(([k,l]) => (dev[k]||0) + " " + l.toLowerCase()).join(" · ");

  const thumbs = shots.length ? shots.map(s =>
    '<td width="150" valign="top" style="padding:0 8px 14px 0">'
    + '<a href="' + esc(s.link) + '" style="text-decoration:none;color:' + INK + '">'
    + '<img src="' + esc(s.link) + '" width="150" alt="Evidence photo" style="display:block;width:150px;height:112px;object-fit:cover;border:1px solid ' + RULE + '">'
    + '<div style="font:600 9px/1.4 Barlow,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + ACCENT + ';padding-top:5px">'
    + esc(SEV[s.severity] || "Finding") + '</div>'
    + '<div style="font:11px/1.4 Barlow,Arial,sans-serif;color:#4a4f54;padding-top:2px">' + esc(s.item) + '</div>'
    + '</a></td>').reduce((rows, cell, i) => {
      if(i % 3 === 0) rows.push([]);
      rows[rows.length-1].push(cell);
      return rows;
    }, []).map(r => '<tr>' + r.join("") + '</tr>').join("")
    : "";

  const photoBlock = shots.length
    ? '<tr><td style="padding:26px 28px 4px">'
      + '<div style="font:600 10px/1 Barlow,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:' + ACCENT + ';padding-bottom:14px">Photo evidence — ' + shots.length + '</div>'
      + '<table cellpadding="0" cellspacing="0" border="0">' + thumbs + '</table>'
      + '<div style="font:11px/1.5 Barlow,Arial,sans-serif;color:#6b7075">Tap any photo to open it full size.</div>'
      + '</td></tr>'
    : '<tr><td style="padding:26px 28px 4px"><div style="font:12px/1.6 Barlow,Arial,sans-serif;color:#6b7075">No photo evidence was attached to this audit.</div></td></tr>';

  return '<!doctype html><html><head>'
  + '<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet">'
  + '</head><body style="margin:0;padding:0;background:' + GROUND + '">'
  + '<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:' + GROUND + '"><tr><td align="center" style="padding:24px 12px">'
  + '<table cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background:' + GROUND + ';border:1px solid ' + INK + '">'

  + '<tr><td style="padding:22px 28px 18px;border-bottom:1px solid ' + INK + '">'
  + '<div style="font:600 10px/1 Barlow,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:' + ACCENT + '">Cavallino · QSCV Audit</div>'
  + '<div style="font:700 28px/1.1 \'Barlow Condensed\',Barlow,Arial,sans-serif;color:' + INK + ';padding-top:8px">' + esc(rec.branch||"Branch") + '</div>'
  + '<div style="font:12px/1.6 Barlow,Arial,sans-serif;color:#4a4f54;padding-top:4px">'
  + esc(fmtDate(rec.date)) + ' · ' + esc(rec.stype||"") + ' · ' + esc(rec.area||"") + ' area'
  + '<br>Audited by ' + esc(rec.auditor||"—") + '</div>'
  + '</td></tr>'

  + '<tr><td style="padding:0"><table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>'
  + '<td width="45%" valign="middle" style="padding:22px 28px;background:' + ACCENT + ';color:#fff">'
  + '<div style="font:600 10px/1 Barlow,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Grade</div>'
  + '<div style="font:700 50px/1 \'Barlow Condensed\',Barlow,Arial,sans-serif;padding-top:6px">' + esc(grade) + '</div>'
  + '</td>'
  + '<td valign="middle" style="padding:22px 28px;border-bottom:1px solid ' + RULE + '">'
  + '<div style="font:600 10px/1 Barlow,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:' + ACCENT + '">Weighted score</div>'
  + '<div style="font:700 34px/1 \'Barlow Condensed\',Barlow,Arial,sans-serif;color:' + INK + ';padding-top:6px">' + esc((Number(rec.score)||0).toFixed(1)) + '<span style="font:400 14px/1 Barlow,Arial,sans-serif;color:#6b7075"> / 100</span></div>'
  + '<div style="font:12px/1.5 Barlow,Arial,sans-serif;color:#4a4f54;padding-top:8px">' + esc(devLine) + '</div>'
  + (rec.critical ? '<div style="font:600 11px/1.4 Barlow,Arial,sans-serif;color:' + DEEP + ';padding-top:6px">Critical threshold breached — ' + (rec.crit||0) + ' critical fails</div>' : "")
  + '</td></tr></table></td></tr>'

  + photoBlock

  + '<tr><td style="padding:24px 28px 28px">'
  + '<a href="' + DASH + '" style="display:inline-block;background:' + ACCENT + ';color:#fff;font:600 13px/1 Barlow,Arial,sans-serif;letter-spacing:.06em;padding:14px 22px;text-decoration:none">OPEN THE LIVE QSCV DASHBOARD</a>'
  + '<div style="font:11px/1.6 Barlow,Arial,sans-serif;color:#6b7075;padding-top:12px">Scores, coverage and the category heatmap update the moment an audit is signed off.</div>'
  + '</td></tr>'

  + '<tr><td style="padding:14px 28px 18px;border-top:1px solid ' + RULE + ';font:10.5px/1.6 Barlow,Arial,sans-serif;color:#6b7075">'
  + 'Sent automatically when the auditor submitted this report. Reply to this email to reach QSCV.'
  + (route.warning ? '<br>' + esc(route.warning) : "")
  + '</td></tr>'

  + '</table></td></tr></table></body></html>';
}

function buildText(rec, shots){
  return [
    "QSCV Audit Report",
    (rec.branch||"Branch") + " — " + fmtDate(rec.date),
    "Grade " + (rec.grade || gradeOf(rec.score)) + " · " + (Number(rec.score)||0).toFixed(1) + "/100",
    "Auditor: " + (rec.auditor||"—"),
    shots.length + " photo(s) of evidence attached as links.",
    "Dashboard: " + DASH
  ].join("\n");
}
