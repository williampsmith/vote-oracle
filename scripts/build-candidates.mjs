#!/usr/bin/env node
// Builds src/data/districts/candidates.json: Nov 3, 2026 California general-election finalists
// (top two from the June 2, 2026 primary) for U.S. House, State Senate and State Assembly.
//
// Source of truth: English Wikipedia wikitext (which cites the CA SOS certified Statement of Vote
// for the June 2, 2026 primary). Every chamber is parsed from two independent places on Wikipedia
// and any disagreement / non-2 count is written into "_verify" for that chamber.
//   House:    summary table on "2026 United States House of Representatives elections in California"
//             vs. general-election boxes on the "(districts 1–26)" / "(districts 27–52)" subpages.
//   Senate:   general-election box in each "==District N==" section vs. that section's infobox nominees.
//   Assembly: same as Senate.
// Photos: Wikipedia pageimages API, only for candidates the article itself wikilinks (so the page is
// the editor-chosen article for that person) and never for disambiguation pages.
//
// Usage: node scripts/build-candidates.mjs   (Node 18+, no deps)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "districts", "candidates.json");
const API = "https://en.wikipedia.org/w/api.php";
const UA = { "User-Agent": "VoteOracle/0.1 (nonpartisan voter guide; build script)" };

const PAGES = {
  house: "2026 United States House of Representatives elections in California",
  house1: "2026 United States House of Representatives elections in California (districts 1–26)",
  house2: "2026 United States House of Representatives elections in California (districts 27–52)",
  senate: "2026 California State Senate election",
  assembly: "2026 California State Assembly election",
};
const SOURCES = [
  ...Object.values(PAGES).map((t) => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`),
  "https://elections.cdn.sos.ca.gov/sov/2026-primary/sov/complete-sov.pdf",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(u) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(u, { headers: UA });
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && attempt < 6) {
      await sleep(Number(r.headers.get("retry-after")) * 1000 || 2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${r.status} ${u}`);
  }
}
async function wikitext(title) {
  const u = `${API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
  const j = await getJSON(u);
  await sleep(500);
  if (j.error) throw new Error(`${title}: ${j.error.info}`);
  return j.parse.wikitext;
}

// ---------- helpers ----------
const stripRefs = (s) =>
  s.replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "").replace(/<!--[\s\S]*?-->/g, "");
function parseName(raw) {
  // returns { name, link } from wikitext like "[[Foo Bar (politician)|Foo Bar]]" or "Foo Bar"
  let s = stripRefs(raw).trim();
  let link = null;
  const m = s.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (m) {
    link = m[1].trim();
    s = s.replace(m[0], (m[2] ?? m[1]).trim());
  }
  s = s
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/'''?/g, "")
    .replace(/\s*\((?:incumbent|write-in)\)/gi, "")
    .replace(/[†*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { name: s, link };
}
function normParty(p) {
  p = (p || "").replace(/\[\[|\]\]/g, "");
  if (/Democrat/i.test(p)) return "Democratic";
  if (/Republican/i.test(p)) return "Republican";
  if (/Libertarian/i.test(p)) return "Libertarian";
  if (/Green/i.test(p)) return "Green";
  if (/Peace and Freedom/i.test(p)) return "Peace and Freedom";
  if (/American Independent/i.test(p)) return "American Independent";
  if (/Independent|No party|Nonpartisan|None/i.test(p)) return "No Party Preference";
  return p.trim() || "Unknown";
}
const key = (n) =>
  n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii)\b\.?/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const sameSet = (a, b) => a.length === b.length && a.map(key).sort().join("|") === b.map(key).sort().join("|");
// Same person even if one source uses a nickname / middle initial: compare last names.
const lastName = (n) => key(n).split(" ").filter((w) => w.length > 1).pop();
const samePerson = (a, b) => key(a) === key(b) || lastName(a) === lastName(b);

// Election boxes: extract general-election candidates from a wikitext chunk.
function generalFromBoxes(chunk) {
  const i = chunk.search(/\{\{Election box open primary general election/i);
  if (i < 0) return null;
  const rest = chunk.slice(i);
  const end = rest.search(/\{\{Election box (end|total)/i);
  const body = end > 0 ? rest.slice(0, end) : rest;
  const out = [];
  for (const m of body.matchAll(/\{\{Election box (?:winning )?candidate[^|]*\|([\s\S]*?)\n\}\}/gi)) {
    const f = Object.fromEntries(
      m[1].split(/\n\s*\|/).map((kv) => {
        const k = kv.indexOf("=");
        return [kv.slice(0, k).replace(/^\|/, "").trim(), kv.slice(k + 1).trim()];
      }),
    );
    if (!f.candidate) continue;
    out.push({ ...parseName(f.candidate), party: normParty(f.party) });
  }
  return out;
}
function primaryWinners(chunk) {
  const out = [];
  for (const m of chunk.matchAll(/\{\{Election box winning candidate[^|]*\|([\s\S]*?)\n\}\}/gi)) {
    const party = (m[1].match(/\|\s*party\s*=\s*([^\n]*)/) || [])[1];
    const cand = (m[1].match(/\|\s*candidate\s*=\s*([^\n]*)/) || [])[1];
    const pn = cand ? parseName(cand) : null;
    if (pn?.name) out.push({ ...pn, party: normParty(party) });
  }
  return out;
}
function infobox(chunk) {
  const nominees = [];
  for (let n = 1; n <= 4; n++) {
    const m = chunk.match(new RegExp(`\\|\\s*(?:nominee|candidate)${n}\\s*=\\s*([^\\n]*)`));
    if (m && parseName(m[1]).name) nominees.push(parseName(m[1]).name);
  }
  const before = chunk.match(/\|\s*before_election\s*=\s*([^\n]*)/);
  return { nominees, before: before ? parseName(before[1]).name : null };
}

// ---------- House ----------
function parseHouseSummary(w) {
  const start = w.indexOf("==Districts 1");
  const text = w.slice(start);
  const parts = text.split(/(?=\{\{ushr\|CA\|\d+\|X\}\})/).slice(1);
  const res = {};
  for (const p of parts) {
    const d = Number(p.match(/^\{\{ushr\|CA\|(\d+)\|X\}\}/)[1]);
    const chunk = p.split(/\n\|\}/)[0];
    const members = [...chunk.matchAll(/\{\{sortname\|([^|}]+)\|([^|}]+)/g)].map((m) => `${m[1]} ${m[2]}`);
    const cands = [];
    for (const m of chunk.matchAll(/^\*\{\{Party stripe\|([^}]*)\}\}(.*)$/gm)) {
      const line = m[2];
      const pm = line.match(/\(([^()]*)\)\s*$/);
      const { name, link } = parseName(line.replace(/\(([^()]*)\)\s*$/, ""));
      cands.push({ name, link, party: normParty(pm ? pm[1] : m[1]) });
    }
    res[d] = { cands, members };
  }
  return res;
}
function sections(w) {
  const res = {};
  const re = /^==\s*District (\d+)\s*==\s*$/gm;
  const idx = [...w.matchAll(re)];
  idx.forEach((m, i) => {
    res[Number(m[1])] = w.slice(m.index, i + 1 < idx.length ? idx[i + 1].index : undefined);
  });
  return res;
}

// ---------- legislature ----------
function parseLegislature(w) {
  // incumbents from "Summary by district" table
  const inc = {};
  const sumStart = w.search(/==\s*Summary by district\s*==/);
  const sum = w.slice(sumStart, w.indexOf("\n|}", sumStart));
  for (const row of sum.split(/\n\|-/)) {
    const d = row.match(/\[\[California's (\d+)(?:st|nd|rd|th) State (?:Senate|Assembly) district/);
    if (!d) continue;
    const cells = row.split(/\n\|/).slice(1);
    const incCell = cells.find((c) => c.includes("[[") && !c.includes("California's")) ?? cells[1] ?? "";
    inc[Number(d[1])] = parseName(incCell.replace(/^\s*\|?/, "")).name;
  }
  const secs = sections(w);
  const res = {};
  for (const [d, chunk] of Object.entries(secs)) {
    const ib = infobox(chunk);
    let cands = generalFromBoxes(chunk);
    let note = null;
    if (!cands || cands.length === 0) {
      cands = primaryWinners(chunk);
      note = "no general-election box; used primary winners";
    }
    res[d] = { cands, ib, incumbent: inc[d] ?? ib.before, note, chunk };
  }
  return res;
}

// ---------- photos ----------
async function photos(titles) {
  const map = {};
  const uniq = [...new Set(titles)];
  for (let i = 0; i < uniq.length; i += 50) {
    const batch = uniq.slice(i, i + 50);
    const u = `${API}?action=query&titles=${encodeURIComponent(batch.join("|"))}&prop=pageimages|pageprops|description&ppprop=disambiguation&pithumbsize=300&format=json&redirects=1`;
    const j = await getJSON(u);
    await sleep(500);
    const q = j.query || {};
    const alias = {};
    for (const n of q.normalized || []) alias[n.from] = n.to;
    for (const r of q.redirects || []) alias[r.from] = r.to;
    const byTitle = {};
    for (const p of Object.values(q.pages || {})) {
      if (p.missing !== undefined || p.pageprops?.disambiguation !== undefined) continue;
      // The candidate is wikilinked by the article's editors, so the target is that person's article;
      // just guard against links to non-biographical pages (election/district articles).
      const desc = p.description || "";
      const ok = !/^\d{4} |election|district/i.test(p.title) && !/election|district/i.test(desc);
      byTitle[p.title] = ok ? (p.thumbnail?.source ?? null) : null;
      if (!ok && p.thumbnail) console.warn(`photo rejected (description "${desc}"): ${p.title}`);
    }
    for (const t of batch) {
      let x = t;
      for (let k = 0; k < 3 && alias[x]; k++) x = alias[x];
      map[t] = byTitle[x] ?? null;
    }
  }
  return map;
}

// ---------- main ----------
const w = {};
for (const [k, t] of Object.entries(PAGES)) w[k] = await wikitext(t);

const out = { sources: SOURCES, generated: new Date().toISOString(), congress: {}, senate: {}, assembly: {} };
const verify = { congress: [], senate: [], assembly: [] };
const notes = { congress: {}, senate: {}, assembly: {} };
const pending = []; // [chamber, district, cands]

// House
const summary = parseHouseSummary(w.house);
const sub = { ...sections(w.house1), ...sections(w.house2) };
for (let d = 1; d <= 52; d++) {
  const s = summary[d];
  const subGen = sub[d] ? generalFromBoxes(sub[d]) : null;
  const subInfo = sub[d] ? infobox(sub[d]) : { nominees: [] };
  const subPrim = sub[d] ? primaryWinners(sub[d]) : [];
  if (!s || s.cands.length === 0) {
    verify.congress.push(String(d));
    notes.congress[d] = "missing from summary table";
    pending.push(["congress", d, (subGen || []).map((c) => ({ ...c, incumbent: false }))]);
    continue;
  }
  const cands = s.cands.map((c) => ({ ...c, incumbent: s.members.some((m) => samePerson(m, c.name) && key(m).split(" ")[0][0] === key(c.name)[0]) }));
  const problems = [];
  if (cands.length !== 2) problems.push(`${cands.length} candidates`);
  if (subGen && subGen.length && !sameSet(subGen.map((c) => c.name), cands.map((c) => c.name)))
    problems.push(`subpage general box: ${subGen.map((c) => c.name).join(" / ")}`);
  if (subInfo.nominees.length >= 2 && !subInfo.nominees.every((n) => cands.some((c) => samePerson(n, c.name))))
    problems.push(`subpage infobox: ${subInfo.nominees.join(" / ")}`);
  if (subPrim.length && !subPrim.every((c) => cands.some((x) => samePerson(c.name, x.name))))
    problems.push(`subpage primary winners: ${subPrim.map((c) => c.name).join(" / ")}`);
  if (!subGen && !subInfo.nominees.length && !subPrim.length) problems.push("no subpage cross-check");
  if (problems.length) {
    verify.congress.push(String(d));
    notes.congress[d] = problems.join("; ");
  }
  pending.push(["congress", d, cands]);
}

// Legislature
for (const [chamber, page, expected] of [
  ["senate", w.senate, Array.from({ length: 20 }, (_, i) => 2 * (i + 1))], // even-numbered seats are up in 2026
  ["assembly", w.assembly, Array.from({ length: 80 }, (_, i) => i + 1)],
]) {
  const parsed = parseLegislature(page);
  for (const d of expected) {
    const p = parsed[d];
    const problems = [];
    if (!p) {
      verify[chamber].push(String(d));
      notes[chamber][d] = "no district section";
      pending.push([chamber, d, []]);
      continue;
    }
    const cands = p.cands.map((c) => ({ ...c, incumbent: !!p.incumbent && key(p.incumbent) === key(c.name) }));
    if (p.note) problems.push(p.note);
    if (cands.length !== 2 && !(cands.length === 1 && /running unopposed/i.test(p.chunk)))
      problems.push(`${cands.length} candidates`);
    if (p.ib.nominees.length && !p.ib.nominees.every((n) => cands.some((c) => samePerson(n, c.name))))
      problems.push(`infobox nominees: ${p.ib.nominees.join(" / ")}`);
    const prim = primaryWinners(p.chunk);
    if (prim.length && (prim.length !== cands.length || !prim.every((c) => cands.some((x) => samePerson(c.name, x.name)))))
      problems.push(`primary winners: ${prim.map((c) => c.name).join(" / ")}`);
    if (!p.ib.nominees.length && !prim.length) problems.push("nothing to cross-check");
    if (p.incumbent && !cands.some((c) => c.incumbent) && cands.some((c) => samePerson(c.name, p.incumbent)))
      problems.push(`incumbent name mismatch (${p.incumbent})`);
    if (problems.length) {
      verify[chamber].push(String(d));
      notes[chamber][d] = problems.join("; ");
    }
    pending.push([chamber, d, cands]);
  }
}

// Photos
const pics = await photos(pending.flatMap(([, , cs]) => cs.map((c) => c.link).filter(Boolean)));
for (const [chamber, d, cs] of pending) {
  out[chamber][String(d)] = cs.map((c) => ({
    name: c.name,
    party: c.party,
    incumbent: c.incumbent,
    photoUrl: c.link ? (pics[c.link] ?? null) : null,
  }));
}
for (const c of ["congress", "senate", "assembly"]) {
  out[c]._verify = verify[c];
  if (Object.keys(notes[c]).length) out[c]._verifyNotes = notes[c];
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
const count = (c) => Object.keys(out[c]).filter((k) => !k.startsWith("_")).length;
console.log(`congress ${count("congress")} senate ${count("senate")} assembly ${count("assembly")}`);
console.log("verify:", JSON.stringify(verify));
console.log("notes:", JSON.stringify(notes, null, 1));
