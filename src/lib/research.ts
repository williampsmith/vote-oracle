import "server-only";
import { getCache } from "@vercel/functions";
import type { Location, Race } from "./ballot";

/**
 * Live web research through treg (https://treg.to). treg proxies a catalog of data
 * providers; we use its cited web-answer endpoint so every claim comes with sources.
 * Results are cached in Vercel Runtime Cache, keyed by question, so the same district
 * is researched once and shared across voters (no personal data is ever part of a key).
 */

const TREG_URL = "https://treg.to/call";
const ANSWER_ENDPOINT = "exa.web.answer";
const TTL_SECONDS = 60 * 60 * 6;

export const researchEnabled = () => Boolean(process.env.TREG_TOKEN);

type Citation = { url: string; title?: string };
export type ResearchResult<T = string> = { answer: T; citations: Citation[] };

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let cache: ReturnType<typeof getCache> | null = null;
  try {
    cache = getCache({ namespace: "vote-oracle-research" });
    const hit = (await cache.get(key)) as T | undefined;
    if (hit) return hit;
  } catch {
    // Runtime cache unavailable (e.g. local dev without it) — just compute.
  }
  const value = await fn();
  try {
    await cache?.set(key, value as never, { ttl: TTL_SECONDS });
  } catch {}
  return value;
}

async function tregAnswer<T = string>(
  query: string,
  outputSchema?: object,
  timeoutMs = 25000,
): Promise<ResearchResult<T>> {
  const token = process.env.TREG_TOKEN;
  if (!token) throw new Error("Research is not configured (TREG_TOKEN missing).");
  const res = await fetch(`${TREG_URL}/${ANSWER_ENDPOINT}`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-Treg-Token": token },
    body: JSON.stringify(outputSchema ? { query, outputSchema } : { query }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Research request failed (${res.status}).`);
  const json = await res.json();
  return {
    answer: json.answer as T,
    citations: ((json.citations ?? []) as Citation[])
      .slice(0, 6)
      .map((c) => ({ url: c.url, title: c.title })),
  };
}

/** Free-form research question — used as a tool by the analysis model. */
export function research(query: string) {
  return cached(`q:${query.trim().toLowerCase()}`, () => tregAnswer(query));
}

/** Positions of the finalists in a district race that lacks a prepared dossier. */
export function researchRace(race: Race) {
  const names = race.candidates.map((c) => `${c.name} (${c.party || "nonpartisan"})`).join(" vs. ");
  const query =
    `California November 3, 2026 general election — ${race.office}: ${names}. ` +
    `For each candidate give a neutral 2-3 sentence background and their stated positions on ` +
    `cost of living/taxes, housing, public safety, climate/energy, immigration, and any signature issues. ` +
    `Note major endorsements (newspapers, parties, unions, business groups) if available.`;
  return cached(`race:${race.id}:${names}`, () => tregAnswer(query));
}

export type LocalContests = {
  contests: {
    office: string;
    candidates: { name: string; summary: string }[];
  }[];
  measures: { name: string; title: string; summary: string }[];
};

const localSchema = {
  type: "object",
  properties: {
    contests: {
      type: "array",
      description: "Contested local candidate races on the ballot (county, city, school/community college board, special districts). Max 6, most significant first.",
      items: {
        type: "object",
        properties: {
          office: { type: "string" },
          candidates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                summary: { type: "string", description: "One neutral sentence: background and key positions." },
              },
              required: ["name", "summary"],
            },
          },
        },
        required: ["office", "candidates"],
      },
    },
    measures: {
      type: "array",
      description: "Local ballot measures (county or city). Max 6, most significant first.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "e.g. 'Measure A'" },
          title: { type: "string" },
          summary: { type: "string", description: "One neutral sentence on what a YES vote does." },
        },
        required: ["name", "title", "summary"],
      },
    },
  },
  required: ["contests", "measures"],
};

/** County + city contests and measures on the Nov 2026 ballot. Best effort. */
export function researchLocal(location: Location) {
  const where = [location.city, location.county].filter(Boolean).join(", ");
  const query =
    `What local contests and local ballot measures are on the November 3, 2026 general election ballot for voters in ${where}, California? ` +
    `Include county supervisor, mayor/city council, sheriff, district attorney, school board, and county/city measures — only ones actually on this November 2026 ballot for this location. ` +
    `Use the county registrar of voters' sample ballot or local news voter guides.`;
  return cached(`local:${location.county}:${location.city}`, () =>
    tregAnswer<LocalContests>(query, localSchema, 35000),
  );
}
