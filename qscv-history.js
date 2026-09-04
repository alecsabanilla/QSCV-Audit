/* Seeded sample audit history for the QSCV portfolio dashboard.
   Replaced by real Firestore records later — every record here is marked sample:true. */

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

/* Six weekly cycles ending today (most recent last). Recomputed on every load so the
   dashboard always has a "current" cycle to show real submitted audits in, instead of
   a fixed past date that real-world audits would eventually fall after. */
export const WEEKS = (() => {
  const out = [], end = Date.now();
  for (let i = 5; i >= 0; i--) out.push(new Date(end - i * 7 * 864e5).toISOString().slice(0, 10));
  return out;
})();

function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = v => Math.max(0.42, Math.min(1, v));

export const RECORDS = (() => {
  const out = [];
  BRANCHES.forEach((b, bi) => {
    const r = rng(9001 + bi * 137);
    WEEKS.forEach((date, wi) => {
      if (wi >= WEEKS.length - b.skip) return;           // branch not yet audited this cycle
      const drift = (wi - 2.5) * 0.011 * (r() > 0.35 ? 1 : -1);
      const cats = {};
      CATS.forEach(c => {
        let v = b.base + drift + (r() - 0.5) * 0.09;
        if (b.weak.indexOf(c.num) === 0) v -= 0.19;
        else if (b.weak.indexOf(c.num) > 0) v -= 0.11;
        cats[c.num] = Math.round(clamp(v) * 100) / 100;
      });
      let score = 0;
      CATS.forEach(c => { score += cats[c.num] * c.weight; });
      score = Math.round(score * 10) / 10;
      let crit = 0, dev = {H:0, M:0, L:0};
      CATS.forEach(c => {
        const miss = 1 - cats[c.num];
        const h = Math.round(miss * (c.weight / 5) * 1.6);
        crit += h;
        dev.H += h; dev.M += Math.round(miss * 9); dev.L += Math.round(miss * 12);
      });
      out.push({branch:b.name, area:b.area, stype:b.stype, date, cats, score, crit, dev,
        critical: crit >= 5, auditor: wi % 2 ? "A. Sabanilla" : "R. Delos Reyes", sample:true});
    });
  });
  return out;
})();

export const ARCHIVE_KEY = "qscv-archive-v1";
