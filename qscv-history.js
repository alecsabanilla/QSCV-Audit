/* Branch rosters, category weights and audit cycles for the QSCV dashboards.
   Two brands share one database; RECORDS is intentionally empty: real audits only. */

export const BRANDS = {
  tenya: {
    label: "Tenya",
    areas: ["Express", "Full store"],
    branches: [
      {name:"Tenya Express Market! Market!", area:"Express",   stype:"Mall",          weak:[], skip:0},
      {name:"Tenya Express Mitsukoshi",      area:"Express",   stype:"Mall",          weak:[], skip:0},
      {name:"Tenya SM Southmall",            area:"Full store",stype:"Mall",          weak:[], skip:0},
      {name:"Tenya Festival Mall",           area:"Full store",stype:"Mall",          weak:[], skip:0},
      {name:"Tenya Glorietta 2",             area:"Full store",stype:"Mall",          weak:[], skip:0},
      {name:"Tenya Tiendesitas",             area:"Full store",stype:"Free standing", weak:[], skip:0},
      {name:"Tenya Paseo De Magallanes",     area:"Full store",stype:"Free standing", weak:[], skip:0}
    ]
  },
  racks: {
    label: "RACKS",
    areas: ["North", "South"],
    branches: [
      {name:"SM Pampanga",    area:"North", stype:"Mall",          weak:[], skip:0},
      {name:"SM North EDSA",  area:"North", stype:"Mall",          weak:[], skip:0},
      {name:"Trinoma",        area:"North", stype:"Mall",          weak:[], skip:0},
      {name:"Timog",          area:"North", stype:"Free standing", weak:[], skip:0},
      {name:"Greenhills",     area:"North", stype:"Mall",          weak:[], skip:0},
      {name:"Tiendesitas",    area:"North", stype:"Free standing", weak:[], skip:0},
      {name:"Glorietta (G2)", area:"South", stype:"Free standing", weak:[], skip:0},
      {name:"Magallanes",     area:"South", stype:"Free standing", weak:[], skip:0},
      {name:"NAIA T3",        area:"South", stype:"Mall",          weak:[], skip:0},
      {name:"Ermita",         area:"South", stype:"Free standing", weak:[], skip:0},
      {name:"MOA",            area:"South", stype:"Mall",          weak:[], skip:0},
      {name:"Southmall",      area:"South", stype:"Mall",          weak:[], skip:0},
      {name:"Sta. Rosa",      area:"South", stype:"Free standing", weak:[], skip:0},
      {name:"Festival",       area:"South", stype:"Mall",          weak:[], skip:0}
    ]
  }
};

export const BRAND = "tenya";
export const AREAS = BRANDS.tenya.areas;
export const BRANCHES = BRANDS.tenya.branches;

export const CATS = [
  {num:"I",    short:"Product quality",  weight:15},
  {num:"II",   short:"Personnel health", weight:10},
  {num:"III",  short:"Cleaning",         weight:10},
  {num:"IV",   short:"Maintenance",      weight:10},
  {num:"V",    short:"Food handling",    weight:20},
  {num:"VI",   short:"Complaints",       weight:5},
  {num:"VII",  short:"Front of house",   weight:10},
  {num:"VIII", short:"Speed of service", weight:10},
  {num:"IX",   short:"Records",          weight:10}
];

/* Eight weekly cycles, the newest ending today. Rolling rather than fixed —
   a hardcoded end date silently hides every audit signed off after it. */
export const WEEKS = (() => {
  const out = [], now = new Date();
  const end = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 7; i >= 0; i--) out.push(new Date(end - i * 7 * 864e5).toISOString().slice(0, 10));
  return out;
})();

function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = v => Math.max(0.42, Math.min(1, v));

/* No seeded history — the portfolio starts empty so every number on the
   dashboard is a real audit arriving in real time. */
export const RECORDS = [];

export const ARCHIVE_KEY  = "qscv-archive-tenya-v1";
/* The RACKS field app writes its own on-device archive under this key; the
   dashboard reads both so a manager sees every brand on one device. */
export const ARCHIVE_KEYS = {tenya:"qscv-archive-tenya-v1", racks:"qscv-archive-v1"};
export const BRAND_KEY    = "qscv-dashboard-brand-v1";
