/* Branch roster, category weights and audit cycles for the QSCV dashboard.
   RECORDS is intentionally empty: real audits only. */

export const AREAS = ["North", "South"];

export const BRANCHES = [
  {name:"SM Pampanga",  area:"North", stype:"Mall",         base:0.93, weak:["IV"],        skip:0},
  {name:"SM North EDSA",area:"North", stype:"Mall",         base:0.87, weak:["V","III"],   skip:0},
  {name:"Trinoma",      area:"North", stype:"Mall",         base:0.90, weak:["VIII"],      skip:0},
  {name:"Timog",        area:"North", stype:"Free standing",base:0.78, weak:["V","II"],    skip:0},
  {name:"Greenhills",   area:"North", stype:"Mall",         base:0.84, weak:["VII"],       skip:1},
  {name:"Tiendesitas",  area:"North", stype:"Free standing",base:0.81, weak:["III","IX"],  skip:0},
  {name:"G2",           area:"South", stype:"Free standing",base:0.88, weak:["IX"],        skip:0},
  {name:"Magallanes",   area:"South", stype:"Free standing",base:0.92, weak:[],            skip:0},
  {name:"NAIA T3",      area:"South", stype:"Mall",         base:0.74, weak:["V","VIII","IV"], skip:0},
  {name:"Ermita",       area:"South", stype:"Free standing",base:0.83, weak:["IV"],        skip:0},
  {name:"MOA",          area:"South", stype:"Mall",         base:0.94, weak:[],            skip:0},
  {name:"Southmall",    area:"South", stype:"Mall",         base:0.86, weak:["VII"],       skip:2},
  {name:"Sta. Rosa",    area:"South", stype:"Free standing",base:0.80, weak:["III","V"],   skip:0},
  {name:"Festival",     area:"South", stype:"Mall",         base:0.89, weak:["II"],        skip:0}
];

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

/* Six weekly cycles ending 2026-08-31 (most recent last). */
export const WEEKS = (() => {
  const out = [], end = Date.UTC(2026, 7, 31);
  for (let i = 5; i >= 0; i--) out.push(new Date(end - i * 7 * 864e5).toISOString().slice(0, 10));
  return out;
})();

function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = v => Math.max(0.42, Math.min(1, v));

/* No seeded history — the portfolio starts empty so every number on the
   dashboard is a real audit arriving in real time. */
export const RECORDS = [];

export const ARCHIVE_KEY = "qscv-archive-v1";
