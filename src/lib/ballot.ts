import "server-only";
import statewide from "@/data/statewide.json";
import candidatesData from "@/data/districts/candidates.json";
import congressGeo from "@/data/districts/congress.json";
import senateGeo from "@/data/districts/senate.json";
import assemblyGeo from "@/data/districts/assembly.json";
import boeGeo from "@/data/districts/boe.json";

export type Candidate = {
  name: string;
  party: string;
  incumbent: boolean;
  photoUrl: string | null;
  ballotDesignation?: string;
  summary?: string;
  positions?: Record<string, string>;
  website?: string;
};

export type Race = {
  id: string;
  office: string;
  level: "statewide" | "boe" | "congress" | "senate" | "assembly" | "local";
  description: string;
  candidates: Candidate[];
};

export type Proposition = (typeof statewide.propositions)[number];

export type Location = {
  matchedAddress: string;
  lat: number;
  lng: number;
  county: string | null;
  city: string | null;
  zip: string | null;
};

export type Districts = {
  congress: number | null;
  senate: number | null;
  assembly: number | null;
  boe: number | null;
};

export type Ballot = {
  location: Location;
  districts: Districts;
  races: Race[];
  propositions: Proposition[];
};

type Ring = number[][];
type Geo = {
  features: {
    properties: { district: number };
    geometry: { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
  }[];
};

function inRing(x: number, y: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(x: number, y: number, rings: Ring[]) {
  if (!inRing(x, y, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) if (inRing(x, y, rings[k])) return false;
  return true;
}

function ringDistance(x: number, y: number, ring: Ring) {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
  }
  return best;
}

/** Point-in-polygon lookup; falls back to the nearest district for points on simplified edges/coast. */
export function findDistrict(geo: Geo, lng: number, lat: number): number | null {
  let nearest: { d: number; district: number } | null = null;
  for (const f of geo.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const rings of polys) {
      if (inPolygon(lng, lat, rings)) return f.properties.district;
      const d = ringDistance(lng, lat, rings[0]);
      if (!nearest || d < nearest.d) nearest = { d, district: f.properties.district };
    }
  }
  // ~0.03 deg ≈ 3 km: tolerate simplification slop, but don't guess wildly.
  return nearest && nearest.d < 0.03 ? nearest.district : null;
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

type DistrictCandidates = Record<string, Candidate[] | unknown>;
const cand = candidatesData as unknown as Record<"congress" | "senate" | "assembly", DistrictCandidates>;

export class GeocodeError extends Error {}

export async function geocode(address: string): Promise<Location> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress");
  url.searchParams.set("address", address);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("vintage", "Current_Current");
  url.searchParams.set("layers", "Counties,Incorporated Places,County Subdivisions");
  url.searchParams.set("format", "json");
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new GeocodeError("The address lookup service is unavailable. Try again in a moment.");
  const json = await res.json();
  const match = json?.result?.addressMatches?.[0];
  if (!match) throw new GeocodeError("We couldn't find that address. Double-check the street, city and ZIP.");
  const state = match.addressComponents?.state;
  if (state && state !== "CA") throw new GeocodeError("That address isn't in California.");
  const geos = match.geographies ?? {};
  const county: string | null = geos["Counties"]?.[0]?.NAME ?? null;
  const place: string | null =
    geos["Incorporated Places"]?.[0]?.BASENAME ?? geos["County Subdivisions"]?.[0]?.BASENAME ?? null;
  return {
    matchedAddress: match.matchedAddress,
    lng: match.coordinates.x,
    lat: match.coordinates.y,
    county,
    city: place,
    zip: match.addressComponents?.zip ?? null,
  };
}

export function buildBallot(location: Location): Ballot {
  const { lat, lng } = location;
  const districts: Districts = {
    congress: findDistrict(congressGeo as unknown as Geo, lng, lat),
    senate: findDistrict(senateGeo as unknown as Geo, lng, lat),
    assembly: findDistrict(assemblyGeo as unknown as Geo, lng, lat),
    boe: findDistrict(boeGeo as unknown as Geo, lng, lat),
  };

  const races: Race[] = [];
  for (const r of statewide.races) {
    if (r.level === "boe" && r.boeDistrict !== districts.boe) continue;
    races.push({
      id: r.id,
      office: r.level === "boe" ? `Board of Equalization, District ${r.boeDistrict}` : r.office,
      level: r.level as Race["level"],
      description: r.description,
      candidates: r.candidates as Candidate[],
    });
  }

  const add = (
    chamber: "congress" | "senate" | "assembly",
    district: number | null,
    office: string,
    description: string,
  ) => {
    if (district == null) return;
    const list = cand[chamber][String(district)];
    if (!Array.isArray(list) || list.length === 0) return;
    races.push({
      id: `${chamber}-${district}`,
      office,
      level: chamber,
      description,
      candidates: list as Candidate[],
    });
  };
  add(
    "congress",
    districts.congress,
    `U.S. Representative, ${ordinal(districts.congress ?? 0)} District`,
    "Represents your district in the U.S. House: votes on federal laws, the federal budget, and oversight of the executive branch.",
  );
  add(
    "senate",
    districts.senate,
    `State Senator, District ${districts.senate}`,
    "One of 40 state senators who write and pass California laws and the state budget; serves four-year terms.",
  );
  add(
    "assembly",
    districts.assembly,
    `State Assembly Member, District ${districts.assembly}`,
    "One of 80 Assembly members who write and pass California laws and the state budget; serves two-year terms.",
  );

  return { location, districts, races, propositions: statewide.propositions };
}

export const ELECTION_DATE = statewide.electionDate;
