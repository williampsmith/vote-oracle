#!/usr/bin/env bash
# Rebuilds src/data/districts/{congress,senate,assembly,boe}.json from official sources.
# Usage: bash scripts/build-districts.sh [workdir]
# Requires: curl, unzip, npx (mapshaper is fetched ad hoc via `npx --yes mapshaper`, not a project dep).
#
# Sources (all valid for the Nov 3, 2026 general election):
#  - U.S. House: AB 604 (Stats. 2025, ch. 96) map, made effective for 2026-2030 by Prop 50 (passed Nov 4, 2025).
#    Shapefile from the Assembly Elections & Redistricting Committee: https://aelc.assembly.ca.gov/media/2608
#    (page: https://aelc.assembly.ca.gov/node/1170; same file mirrored by Redistricting Data Hub / Statewide Database)
#  - State Senate / Assembly: 2021 Citizens Redistricting Commission maps (in force 2022-2030), via
#    Census TIGER/Line 2024 tl_2024_06_sldu / tl_2024_06_sldl (full-resolution, statefp 06).
#  - Board of Equalization: 2021 CRC final BOE map,
#    https://wedrawthelines.ca.gov/wp-content/uploads/sites/64/2022/12/BOE_Final_shapefile.zip
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/src/data/districts"
WORK="${1:-${TMPDIR:-/tmp}/vote-oracle-districts}"
mkdir -p "$WORK" "$OUT"
cd "$WORK"

fetch() { [ -s "$2" ] || curl -sSfL -o "$2" "$1"; }
fetch https://aelc.assembly.ca.gov/media/2608 ab604.zip
fetch https://www2.census.gov/geo/tiger/TIGER2024/SLDU/tl_2024_06_sldu.zip sldu.zip
fetch https://www2.census.gov/geo/tiger/TIGER2024/SLDL/tl_2024_06_sldl.zip sldl.zip
fetch https://wedrawthelines.ca.gov/wp-content/uploads/sites/64/2022/12/BOE_Final_shapefile.zip boe.zip
for z in ab604 sldu sldl boe; do rm -rf "$z"; mkdir "$z"; unzip -qo "$z.zip" -d "$z"; rm -rf "$z/__MACOSX"; done

MS="npx --yes mapshaper@0.7.101"
# Simplification tolerance (meters) per file, tuned so each output is < 600 KB.
# Points within ~interval meters of a district line may be misassigned; everything else is exact to the source.
build() { # in.shp field out.json interval_m
  $MS "$1" -proj wgs84 -each "district=Number($2)" -filter-fields district \
    -simplify interval="$4" weighted keep-shapes -clean \
    -sort district -o "$OUT/$3" format=geojson precision=0.0001 force
}
build "$(find ab604 -name '*.shp' | head -1)" DISTRICT congress.json 120
build "$(find sldu -name '*.shp' | head -1)" SLDUST senate.json 100
build "$(find sldl -name '*.shp' | head -1)" SLDLST assembly.json 120
build "$(find boe -name '*.shp' | head -1)" DISTRICT boe.json 60
ls -l "$OUT"/*.json
