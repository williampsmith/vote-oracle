#!/usr/bin/env node
// Sanity check: point-in-polygon lookups against src/data/districts/*.json (no deps).
// Usage: node scripts/check-districts.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "districts");
const load = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));

// Ray casting on one ring of [lon, lat] pairs.
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Polygon = [outer, ...holes]
const inPolygon = (x, y, poly) => inRing(x, y, poly[0]) && !poly.slice(1).some((h) => inRing(x, y, h));

function lookup(fc, lat, lng) {
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g) continue;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    if (polys.some((p) => inPolygon(lng, lat, p))) return f.properties.district;
  }
  return null;
}

const layers = {
  congress: load("congress.json"),
  senate: load("senate.json"),
  assembly: load("assembly.json"),
  boe: load("boe.json"),
};
let candidates = null;
try {
  candidates = load("candidates.json");
} catch {}

const points = [
  ["SF City Hall", 37.7793, -122.4193],
  ["LA City Hall", 34.0537, -118.2427],
  ["Fresno", 36.7378, -119.7871],
  ["San Diego", 32.7157, -117.1611],
  ["Sacramento Capitol", 38.5766, -121.4934],
  ["Redding", 40.5865, -122.3917],
];

const names = (chamber, d) =>
  (candidates?.[chamber]?.[String(d)] ?? []).map((c) => `${c.name} (${c.party}${c.incumbent ? ", inc." : ""})`).join(" vs ");

let failed = false;
for (const [label, lat, lng] of points) {
  const r = Object.fromEntries(Object.entries(layers).map(([k, fc]) => [k, lookup(fc, lat, lng)]));
  if (Object.values(r).some((v) => v == null)) failed = true;
  console.log(`${label.padEnd(20)} CD ${r.congress}  SD ${r.senate}  AD ${r.assembly}  BOE ${r.boe}`);
  if (candidates) {
    console.log(`   House:    ${names("congress", r.congress) || "-"}`);
    console.log(`   Senate:   ${names("senate", r.senate) || "(not up in 2026)"}`);
    console.log(`   Assembly: ${names("assembly", r.assembly) || "-"}`);
  }
}

// Structural checks
const expect = { congress: 52, senate: 40, assembly: 80, boe: 4 };
for (const [k, n] of Object.entries(expect)) {
  const ds = new Set(layers[k].features.map((f) => f.properties.district));
  const ok = ds.size === n && [...ds].every((d) => Number.isInteger(d) && d >= 1 && d <= n);
  if (!ok) failed = true;
  console.log(`${k}: ${ds.size} districts ${ok ? "OK" : "MISMATCH (expected " + n + ")"}`);
}
if (candidates) {
  const c = Object.keys(candidates.congress).filter((k) => !k.startsWith("_")).length;
  const s = Object.keys(candidates.senate).filter((k) => !k.startsWith("_")).length;
  const a = Object.keys(candidates.assembly).filter((k) => !k.startsWith("_")).length;
  console.log(`candidates: congress ${c}/52, senate ${s}/20, assembly ${a}/80`);
}
process.exit(failed ? 1 : 0);
