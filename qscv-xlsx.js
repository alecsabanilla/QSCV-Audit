/* Minimal XLSX writer — no dependencies.
   Produces a real .xlsx (OOXML in a ZIP) from plain row arrays. Entries are
   stored uncompressed, which Excel, Numbers and Sheets all accept, so no
   deflate implementation is needed. */

/* ---------- zip ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

const utf8 = s => new TextEncoder().encode(s);

function zip(files) {
  const enc = files.map(f => ({ name: utf8(f.name), data: utf8(f.body) }));
  const chunks = [];
  const central = [];
  let offset = 0;

  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

  enc.forEach(f => {
    const crc = crc32(f.data);
    const local = [].concat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(f.data.length), u32(f.data.length),
      u16(f.name.length), u16(0)
    );
    chunks.push(new Uint8Array(local), f.name, f.data);
    central.push({ crc, size: f.data.length, name: f.name, offset });
    offset += local.length + f.name.length + f.data.length;
  });

  const dirStart = offset;
  central.forEach(c => {
    const head = [].concat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(c.crc), u32(c.size), u32(c.size),
      u16(c.name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.offset)
    );
    chunks.push(new Uint8Array(head), c.name);
    offset += head.length + c.name.length;
  });

  chunks.push(new Uint8Array([].concat(
    u32(0x06054b50), u16(0), u16(0),
    u16(central.length), u16(central.length),
    u32(offset - dirStart), u32(dirStart), u16(0)
  )));

  return new Blob(chunks, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ---------- sheet xml ---------- */

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  /* control characters are illegal in OOXML and make Excel refuse the file */
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

function colName(i) {
  let s = "";
  i++;
  while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = (i - r - 1) / 26; }
  return s;
}

/* A cell is a bare value, or {v, s} to pick a style index. */
function cellXml(ref, cell) {
  const v = cell && typeof cell === "object" && !Array.isArray(cell) ? cell.v : cell;
  const st = cell && typeof cell === "object" && !Array.isArray(cell) ? cell.s : 0;
  const sAttr = st ? ` s="${st}"` : "";
  if (v === null || v === undefined || v === "") return `<c r="${ref}"${sAttr}/>`;
  if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"${sAttr}><v>${v}</v></c>`;
  return `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

function sheetXml(rows, widths, merges) {
  const body = rows.map((row, r) => {
    const cells = (row || []).map((cell, c) => cellXml(colName(c) + (r + 1), cell)).join("");
    return `<row r="${r + 1}">${cells}</row>`;
  }).join("");
  const cols = (widths && widths.length)
    ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const mg = (merges && merges.length)
    ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><outlinePr/></sheetPr><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${body}</sheetData>${mg}</worksheet>`;
}

/* Style indices used across the sheets:
   0 normal · 1 bold · 2 title · 3 band header (white on dark) · 4 wrapped
   5 wrapped + bordered (the CAPA write-in boxes) · 6 centred */
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF243C53"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFill="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/* Excel rejects duplicate or over-long tab names, and forbids : \ / ? * [ ] */
function safeNames(names) {
  const seen = {};
  return names.map(n => {
    let s = String(n).replace(/[:\\\/?*\[\]]/g, " ").slice(0, 31).trim() || "Sheet";
    let base = s, i = 2;
    while (seen[s.toLowerCase()]) { const suffix = " " + i++; s = base.slice(0, 31 - suffix.length) + suffix; }
    seen[s.toLowerCase()] = true;
    return s;
  });
}

/* sheets: [{name, rows, widths, merges}] */
export function buildWorkbook(sheets) {
  const names = safeNames(sheets.map(s => s.name));
  const files = [
    { name: "[Content_Types].xml", body: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", body: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", body: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", body: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", body: STYLES }
  ];
  sheets.forEach((s, i) => files.push({
    name: `xl/worksheets/sheet${i + 1}.xml`,
    body: sheetXml(s.rows || [], s.widths, s.merges)
  }));
  return zip(files);
}

/* ---------- the audit workbook ---------- */

const B = v => ({ v, s: 1 });          // bold
const BAND = v => ({ v, s: 3 });       // reversed band header
const WRAP = v => ({ v, s: 4 });
const BOX = v => ({ v, s: 5 });        // bordered write-in cell
const C = v => ({ v, s: 6 });          // centred

/* p is built by the app: it already knows the active brand's catalog. */
export function buildAuditWorkbook(p) {
  const m = p.meta || {};
  const sheets = [];

  /* SUMMARY */
  const sum = [
    [{ v: (p.brandLabel || "") + " QSCV Audit", s: 2 }],
    [],
    [B("Branch"), m.branch || "", "", B("Auditor"), m.auditor || ""],
    [B("Store type"), m.stype || "", "", B("Manager on duty"), m.mod || ""],
    [B("Date"), m.date || "", "", B("Time in"), m.time || ""],
    [],
    [B("Overall score"), p.score, "", B("Grade"), p.grade],
    [B("Weight scored"), p.weightSeen, "", B("Critical fails"), p.crit],
    [B("Deviations"), (p.dev && p.dev.H || 0) + " critical · " + (p.dev && p.dev.M || 0) + " major · " + (p.dev && p.dev.L || 0) + " minor"],
    [],
    [B("#"), B("Category"), B("Weight"), B("Scored"), B("Actual"), B("Possible"), B("%"), B("Weighted")]
  ];
  (p.summary || []).forEach(r => sum.push([r.num, r.name, r.weight, r.scored, r.actual, r.possible, r.pct, r.weighted]));
  sum.push([]);
  if (m.highlights) sum.push([B("Highlights")], [WRAP(m.highlights)]);
  sheets.push({ name: "SUMMARY", rows: sum, widths: [8, 46, 9, 10, 9, 10, 8, 10] });

  /* one sheet per category */
  (p.sheets || []).forEach(s => {
    const rows = [
      [{ v: "Category " + s.num + " · " + s.name, s: 2 }],
      [B("Weight"), s.weight, B("Score"), s.pct],
      [],
      [B("Item"), B("Risk"), B("Points"), B("Result"), B("Note"), B("Corrective action")]
    ];
    (s.groups || []).forEach(g => {
      rows.push([BAND(g.name), BAND(""), BAND(""), BAND(""), BAND(""), BAND("")]);
      (g.items || []).forEach(it => rows.push([WRAP(it.text), it.risk, it.pts, C(it.mark), WRAP(it.note), WRAP(it.capa)]));
    });
    if (s.speed) {
      rows.push([B("Measure"), B("Standard"), B("Samples"), B("Within std"), B("Times"), B("Points")]);
      (p.speed || []).forEach(r => rows.push([r.name, r.std, r.taken, r.pass, WRAP(r.times), r.points]));
    }
    rows.push([]);
    sheets.push({ name: "CAT " + s.num, rows, widths: [62, 10, 8, 9, 34, 34] });
  });

  /* DEVIATIONS */
  const dv = [[{ v: "Deviation log", s: 2 }], [], [B("#"), B("Cat"), B("Finding"), B("Severity"), B("Note"), B("Corrective action"), B("Photos"), B("Repeat")]];
  (p.deviations || []).forEach((d, i) => dv.push([i + 1, d.cat, WRAP(d.text), d.sev, WRAP(d.note), WRAP(d.capa), C(d.photos), C(d.repeat ? "Yes" : "")]));
  if (!(p.deviations || []).length) dv.push(["", "", "No deviations recorded."]);
  sheets.push({ name: "DEVIATIONS", rows: dv, widths: [6, 8, 56, 11, 34, 34, 9, 9] });

  /* CAPA PLAN — mirrors the printed form; columns 4 to 6 left for the store */
  const cp = [
    [{ v: "Corrective Action and Preventive Action Plan", s: 2 }],
    [B("Reference No."), "QSCV-1.01", B("Revision"), 0, B("Effective Date"), "March 13, 2026"],
    [],
    [B("Store / Branch"), m.branch || "", B("Prepared by"), BOX("")],
    [B("Auditor/s"), m.auditor || "", B("Date prepared"), BOX("")],
    [B("Inspection date/s"), m.date || ""],
    [],
    [{ v: "Note: store to fill columns 4 to 6. Columns 7 and 8 are for the auditor.", s: 1 }],
    [],
    [B("No. (1)"), B("Description of deviation (2)"), B("Pictures (3)"), B("Corrective & preventive action (4)"),
     B("Evidence of compliance (5)"), B("Completion date (6)"), B("Auditor's comment (7)"), B("Status (8)")]
  ];
  let band = null;
  (p.capa || []).forEach(r => {
    if (r.band !== band) {
      band = r.band;
      cp.push([BAND(band), BAND(""), BAND(""), BAND(""), BAND(""), BAND(""), BAND(""), BAND("")]);
    }
    cp.push([C(r.n), WRAP(r.text), C(r.photos ? r.photos + " attached" : "—"), BOX(""), BOX(""), BOX(""), BOX(""), BOX("")]);
  });
  if (!(p.capa || []).length) cp.push(["", "No deviations — no CAPA required."]);
  cp.push([], [B("Reviewed by"), (m.auditor || "") + " · " + (m.date || "")], [B("Noted by"), BOX("")]);
  sheets.push({ name: "CAPA PLAN", rows: cp, widths: [7, 52, 14, 34, 22, 16, 24, 12] });

  return buildWorkbook(sheets);
}

export function downloadWorkbook(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
