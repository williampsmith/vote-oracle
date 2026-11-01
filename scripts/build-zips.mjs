// Builds src/data/zips.json: for every California ZIP code (Census ZCTA), the population share
// living in each U.S. House / State Senate / Assembly / BOE district, county and city.
// Lets the app work from a ZIP alone and only ask for more when a ZIP is split between districts.
//
// Method: every populated 2020 census block (~378k in CA) is placed by its interior point into a
// ZCTA, a place, and each district layer (the same simplified layers the app uses for addresses),
// weighted by its 2020 population.
//
// Usage: node scripts/build-zips.mjs <workdir>
// <workdir> must contain (made with `npx mapshaper@0.7.101` from Census files):
//   blocks.csv  ← tl_2020_06_tabblock20.shp  -filter 'POP20 > 0' -filter-fields GEOID20,POP20,INTPTLAT20,INTPTLON20 -o format=csv
//   zcta.json   ← cb_2020_us_zcta520_500k.shp -filter '/^9[0-6]/.test(ZCTA5CE20)' -proj wgs84 -filter-fields ZCTA5CE20 -o format=geojson
//   place.json  ← tl_2024_06_place.shp -proj wgs84 -filter-fields NAME,LSAD -o format=geojson
//   county.csv  ← tl_2024_us_county.dbf -filter 'STATEFP=="06"' -filter-fields COUNTYFP,NAMELSAD -o format=csv
// Sources: https://www2.census.gov/geo/tiger/ (TIGER2020/TABBLOCK20, GENZ2020/shp, TIGER2024/PLACE, TIGER2024/COUNTY)
import fs from "node:fs";
import path from "node:path";

const work = process.argv[2];
if (!work) throw new Error("usage: node scripts/build-zips.mjs <workdir>");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Grid-indexed point-in-polygon lookup over a GeoJSON layer. */
function index(geo, key) {
  const CELL = 0.1;
  const grid = new Map();
  const polys = [];
  for (const f of geo.features) {
    if (!f.geometry) continue;
    const parts = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const rings of parts) {
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of rings[0]) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      const p = { id: key(f.properties), rings, bbox: [x0, y0, x1, y1] };
      polys.push(p);
      for (let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++)
        for (let gy = Math.floor(y0 / CELL); gy <= Math.floor(y1 / CELL); gy++) {
          const k = gx + ":" + gy;
          if (!grid.has(k)) grid.set(k, []);
          grid.get(k).push(p);
        }
    }
  }
  return (x, y) => {
    for (const p of grid.get(Math.floor(x / CELL) + ":" + Math.floor(y / CELL)) ?? []) {
      const [x0, y0, x1, y1] = p.bbox;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (!inRing(x, y, p.rings[0])) continue;
      if (p.rings.slice(1).some((h) => inRing(x, y, h))) continue;
      return p.id;
    }
    return null;
  };
}

const zcta = index(read(path.join(work, "zcta.json")), (p) => p.ZCTA5CE20);
const place = index(read(path.join(work, "place.json")), (p) => p.NAME);
const layers = Object.fromEntries(
  ["congress", "senate", "assembly", "boe"].map((n) => [
    n,
    index(read(path.join(root, "src/data/districts", `${n}.json`)), (p) => p.district),
  ]),
);
const counties = Object.fromEntries(
  fs.readFileSync(path.join(work, "county.csv"), "utf8").trim().split("\n").slice(1).map((l) => {
    const [fp, ...name] = l.split(",");
    return [fp, name.join(",").replace(/"/g, "")];
  }),
);

const zips = new Map();
let unplaced = 0;
const lines = fs.readFileSync(path.join(work, "blocks.csv"), "utf8").trim().split("\n").slice(1);
for (const line of lines) {
  const [geoid, popS, latS, lngS] = line.split(",");
  const pop = Number(popS);
  const lat = Number(latS);
  const lng = Number(lngS);
  const z = zcta(lng, lat);
  if (!z) { unplaced += pop; continue; }
  let e = zips.get(z);
  if (!e) zips.set(z, (e = { pop: 0, x: 0, y: 0, county: {}, city: {}, congress: {}, senate: {}, assembly: {}, boe: {} }));
  e.pop += pop;
  e.x += lng * pop;
  e.y += lat * pop;
  const bump = (o, k) => { o[k ?? "_"] = (o[k ?? "_"] ?? 0) + pop; };
  bump(e.county, counties[geoid.slice(2, 5)]);
  bump(e.city, place(lng, lat));
  for (const [n, f] of Object.entries(layers)) bump(e[n], f(lng, lat));
}

// [[value, share], ...] sorted by share; drops slivers under 1%. "_" = none (unincorporated / unmatched).
const shares = (o, total, num) =>
  Object.entries(o)
    .map(([k, v]) => [k === "_" ? null : num ? Number(k) : k, Math.round((v / total) * 100) / 100])
    .filter(([, s]) => s >= 0.01)
    .sort((a, b) => b[1] - a[1]);

const out = {};
for (const z of [...zips.keys()].sort()) {
  const e = zips.get(z);
  out[z] = {
    pop: e.pop,
    lat: Math.round((e.y / e.pop) * 1e4) / 1e4,
    lng: Math.round((e.x / e.pop) * 1e4) / 1e4,
    county: shares(e.county, e.pop),
    city: shares(e.city, e.pop),
    congress: shares(e.congress, e.pop, true),
    senate: shares(e.senate, e.pop, true),
    assembly: shares(e.assembly, e.pop, true),
    boe: shares(e.boe, e.pop, true),
  };
}
const file = path.join(root, "src/data/zips.json");
fs.writeFileSync(file, JSON.stringify(out));
const split = Object.values(out).filter((v) => ["congress", "senate", "assembly"].some((n) => v[n].length > 1)).length;
console.log(`${Object.keys(out).length} ZIPs, ${split} split across districts; ${unplaced} people outside any ZCTA`);
console.log(`wrote ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
