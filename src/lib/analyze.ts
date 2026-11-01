import "server-only";
import { generateText, Output, isStepCount, tool } from "ai";
import { z } from "zod";
import { QUESTIONS, scoreAnswers, AXIS_META, type Answers, type Axis } from "./questions";
import { buildBallot, ELECTION_DATE, type Location, type Race } from "./ballot";
import { research, researchEnabled, researchLocal, researchRace, type LocalContests } from "./research";
import type { PersonCard, Results, StreamEvent } from "./types";

export const MODEL = process.env.ORACLE_MODEL ?? "deepseek/deepseek-v4.1-flash";
/** Used only if the primary model errors or returns an incomplete ballot. */
export const FALLBACK_MODEL = process.env.ORACLE_FALLBACK_MODEL ?? "anthropic/claude-haiku-5.5";

const confidence = z.enum(["strong", "lean", "tossup"]);

const outputSchema = z.object({
  archetype: z.object({
    title: z.string().describe("A playful, flattering, NON-partisan 2-4 word voter archetype starting with 'The', e.g. 'The Pragmatic Builder' or 'The Hometown Maverick'. Never a party or ideology label, never generic like 'Voter Profile'."),
    summary: z.string().describe("Two sentences describing what this voter values, in second person."),
  }),
  races: z.array(
    z.object({
      raceId: z.string(),
      pick: z.string().nullable().describe("The candidate's name copied EXACTLY as written on the ballot above, or null to recommend leaving it blank."),
      confidence,
      reason: z.string().describe("At most 2 short sentences, max 35 words total, tying the pick to this voter's own answers."),
    }),
  ),
  propositions: z.array(
    z.object({
      number: z.string(),
      vote: z.enum(["yes", "no", "undecided"]),
      confidence,
      reason: z.string().describe("1-2 short sentences (max ~35 words)."),
    }),
  ),
  local: z
    .object({
      contests: z.array(
        z.object({ office: z.string(), pick: z.string().nullable(), confidence, reason: z.string() }),
      ),
      measures: z.array(
        z.object({ name: z.string(), vote: z.enum(["yes", "no", "undecided"]), reason: z.string() }),
      ),
    })
    .nullable(),
});

const INSTRUCTIONS = `You are Vote Oracle, a scrupulously nonpartisan ballot advisor for California voters.

Your job: recommend how THIS voter would most likely vote on every contest on their ballot if they had perfect information — based on the values they revealed, NOT on your own views and NOT on party shortcuts.

How to reason:
1. Build a picture of the voter from their axis scores, their top priorities, and especially their individual answers (the specific statements they agreed or disagreed with are the richest signal). Weigh their stated top priorities most heavily.
2. For each race, compare the candidates' documented records and positions (from the dossier and any research you do) against the voter's values. Two candidates of the same party can differ a lot — look at the actual issues. Never assume a voter's party; let the issues decide.
3. Voting strategy matters. A "Pragmatic" voter wants the viable candidate closest to them and values competence/effectiveness. A "Pure conviction" voter may prefer leaving a race blank if both finalists clearly conflict with their core values — only recommend a blank (pick = null) in that case, and the reason must then explain why NEITHER finalist fits (not argue for one of them). A "Pragmatic" voter should almost never get a blank. California uses top-two, so every race has exactly the listed finalists (some are unopposed).
4. Propositions: map yes/no to the voter's values via what a YES actually does. Use "undecided" only when the voter's answers genuinely point both ways.
5. Confidence: "strong" when the evidence clearly aligns, "lean" for a moderate fit, "tossup" when it's close.
6. Only cite answers the voter actually gave (listed below) — never attribute a view to them that isn't in their answers; if you are inferring, say so briefly. Never quote numeric axis scores to the voter. Reasons: 1-2 short sentences, second person, concrete ("You favored building near transit; Wiener authored the state's biggest transit-housing bills."). No party cheerleading, no insults, no loaded language. Never invent facts — if the dossier is thin, say what you're relying on.
7. Use the research tool sparingly (max ~4 calls) only to fill real gaps, e.g. a district candidate with no documented positions. Don't research things already in the dossier.
8. Return a recommendation for EVERY raceId and EVERY proposition listed. For "local", return null if no local research was provided; otherwise cover the contests and measures provided.`;

function describeAnswers(answers: Answers) {
  const lines: string[] = [];
  for (const q of QUESTIONS) {
    const a = answers[q.id];
    if (!a) continue;
    const verb = a === "agree" ? "AGREE" : a === "disagree" ? "DISAGREE" : "UNSURE";
    lines.push(`- [${verb}] ${q.text}`);
  }
  return lines.join("\n");
}

function describeRace(race: Race, extra?: string) {
  const cands = race.candidates
    .map((c) => {
      const parts = [`  • ${c.name} — ${c.party || "Nonpartisan"}${c.incumbent ? " (incumbent)" : ""}${c.ballotDesignation ? `; ballot designation: ${c.ballotDesignation}` : ""}`];
      if (c.summary) parts.push(`    Background: ${c.summary}`);
      if (c.positions && Object.keys(c.positions).length)
        parts.push(...Object.entries(c.positions).map(([k, v]) => `    ${k}: ${v}`));
      return parts.join("\n");
    })
    .join("\n");
  return `### ${race.office} [raceId: ${race.id}]\n${race.description}\n${cands}${extra ? `\n  Research notes: ${extra}` : ""}`;
}

const toCard = (c: Race["candidates"][number]): PersonCard => ({
  name: c.name,
  party: c.party,
  photoUrl: c.photoUrl,
  incumbent: c.incumbent,
});

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

/** Match a model-written name ("Don Wagner") to the ballot's ("Donald P. (Don) Wagner"). */
function matchCandidate<T extends { name: string }>(pick: string, candidates: T[]): T | null {
  const exact = candidates.find((c) => norm(c.name) === norm(pick));
  if (exact) return exact;
  const pw = words(pick);
  const scored = candidates
    .map((c) => {
      const cw = words(c.name);
      const last = cw[cw.length - 1];
      return { c, last: pw.includes(last), overlap: pw.filter((w) => cw.includes(w)).length };
    })
    .filter((x) => x.last)
    .sort((a, b) => b.overlap - a.overlap);
  return scored.length === 1 || (scored[0] && scored[0].overlap > (scored[1]?.overlap ?? 0)) ? scored[0].c : null;
}

/** Keep justifications to ≤2 sentences and ≤ maxWords words, whatever the model wrote. */
function brief(text: string, maxWords = 40) {
  const sentences = text.trim().match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [text];
  const kept: string[] = [];
  let count = 0;
  for (const sent of sentences.slice(0, 2)) {
    const n = sent.trim().split(/\s+/).length;
    if (kept.length && count + n > maxWords) break;
    kept.push(sent);
    count += n;
  }
  const out = kept.join("").trim();
  const ws = out.split(/\s+/);
  return ws.length > maxWords ? ws.slice(0, maxWords).join(" ").replace(/[,;:—–-]+$/, "") + "…" : out;
}

const NOUNS: Record<string, [string, string]> = {
  econ: ["Free-Marketeer", "Safety-Net Builder"],
  social: ["Traditionalist", "Changemaker"],
  safety: ["Enforcer", "Reformer"],
  climate: ["Realist", "Environmentalist"],
  housing: ["Neighborhood Guardian", "Builder"],
  immigration: ["Rule-Keeper", "Welcomer"],
  governance: ["Institutionalist", "Maverick"],
};

/** Deterministic archetype used when the model's title doesn't follow the format. */
function fallbackTitle(axes: { axis: string; score: number }[]) {
  const prag = axes.find((a) => a.axis === "pragmatism")?.score ?? 0;
  const adj = prag >= 20 ? "Pragmatic" : prag <= -20 ? "Principled" : "Independent";
  const top = axes.filter((a) => a.axis in NOUNS).sort((a, b) => Math.abs(b.score) - Math.abs(a.score))[0];
  const noun = top ? NOUNS[top.axis][top.score >= 0 ? 1 : 0] : "Voter";
  return `The ${adj} ${noun}`;
}

function cleanTitle(title: string, axes: { axis: string; score: number }[]) {
  const t = title.trim();
  const ok = /^the\s/i.test(t) && t.split(/\s+/).length <= 5 && !/[:;,]/.test(t) && !/democrat|republican|liberal|conservative|progressive|left|right/i.test(t);
  return ok ? t : fallbackTitle(axes);
}

export async function analyze(
  input: { answers: Answers; priorities: Axis[]; location: Location },
  emit: (e: StreamEvent) => void,
  model: string = MODEL,
): Promise<Results> {
  const { answers, priorities, location } = input;
  const sources: Results["sources"] = [];

  emit({ type: "stage", stage: "mapping", label: "Mapping your address to your districts" });
  const ballot = buildBallot(location);
  const d = ballot.districts;
  emit({
    type: "log",
    label: `Found ${ballot.races.length} races and ${ballot.propositions.length} propositions${d.congress ? ` · House District ${d.congress}` : ""}${d.assembly ? ` · Assembly District ${d.assembly}` : ""}`,
  });

  const axes = scoreAnswers(answers);

  // ---- Research phase -------------------------------------------------------
  emit({ type: "stage", stage: "researching", label: "Researching the candidates on your ballot" });
  const notes = new Map<string, string>();
  let local: LocalContests | null = null;
  if (researchEnabled()) {
    const thin = ballot.races.filter((r) => r.candidates.some((c) => !c.summary));
    const jobs: Promise<void>[] = thin.map(async (race) => {
      emit({ type: "log", label: `Digging into ${race.office}: ${race.candidates.map((c) => c.name).join(" vs. ")}` });
      try {
        const r = await researchRace(race);
        notes.set(race.id, r.answer);
        sources.push(...r.citations);
      } catch {
        emit({ type: "log", label: `Couldn't reach live sources for ${race.office}; using what we know` });
      }
    });
    if (location.county) {
      jobs.push(
        (async () => {
          emit({ type: "log", label: `Scanning ${location.city ?? location.county} for local races & measures` });
          try {
            const r = await researchLocal(location);
            const ans = r.answer;
            if (ans && (ans.contests?.length || ans.measures?.length)) {
              local = ans;
              sources.push(...r.citations);
              emit({
                type: "log",
                label: `Found ${ans.contests?.length ?? 0} local contests and ${ans.measures?.length ?? 0} local measures`,
              });
            }
          } catch {
            emit({ type: "log", label: "Local ballot lookup timed out — we'll point you to your sample ballot" });
          }
        })(),
      );
    }
    await Promise.all(jobs);
  } else {
    emit({ type: "log", label: "Using the Oracle's prepared candidate dossiers" });
  }

  // ---- Matching phase -------------------------------------------------------
  emit({ type: "stage", stage: "matching", label: "Cross-referencing your values with every candidate" });

  const localNow = local as LocalContests | null;
  const prompt = `# The voter
Location: ${location.city ?? "unincorporated area"}, ${location.county ?? "California"} (CA)
Top priorities they chose: ${priorities.length ? priorities.map((p) => AXIS_META[p].label).join(", ") : "none specified"}

Axis scores (each from -100 to +100):
${axes.map((a) => `- ${a.label}: ${a.score} (−100 = ${a.neg}, +100 = ${a.pos})`).join("\n")}

Their answers:
${describeAnswers(answers)}

# Their ballot — November 3, 2026 California General Election
${ballot.races.map((r) => describeRace(r, notes.get(r.id))).join("\n\n")}

## Statewide propositions
${ballot.propositions
  .map(
    (p) =>
      `### Prop ${p.number}: ${p.title}\n${p.summary}\nYES means: ${p.yesMeans}\nNO means: ${p.noMeans}\nSupporters: ${p.supporters.join(", ") || "none listed"}\nOpponents: ${p.opponents.join(", ") || "none listed"}\nFiscal impact: ${p.fiscalImpact}`,
  )
  .join("\n\n")}

## Local contests (researched, best effort)
${localNow ? JSON.stringify(localNow, null, 1) : "None provided — return local: null."}`;

  const tools = researchEnabled()
    ? {
        research: tool({
          description: "Search the live web for cited facts about a candidate or measure on this ballot. Returns a short cited answer.",
          inputSchema: z.object({
            question: z.string().describe("A specific, self-contained question, e.g. 'Assembly District 54 candidate X position on rent control 2026'"),
            why: z.string().describe("A short, friendly progress label shown to the voter, e.g. 'Checking Mark Gonzalez's housing record'"),
          }),
          execute: async ({ question, why }) => {
            emit({ type: "log", label: why });
            try {
              const r = await research(question);
              sources.push(...r.citations);
              return { answer: r.answer, sources: r.citations.map((c) => c.url) };
            } catch (e) {
              return { error: e instanceof Error ? e.message : "research failed" };
            }
          },
        }),
      }
    : undefined;

  const run = (m: string) =>
    generateText({
      model: m,
      instructions: INSTRUCTIONS,
      prompt,
      tools,
      stopWhen: isStepCount(7),
      output: Output.object({ schema: outputSchema }),
      maxOutputTokens: 16000,
    });
  const raceIds = new Set(ballot.races.map((r) => r.id));
  const propNums = new Set(ballot.propositions.map((p) => p.number));
  const complete = (o: z.infer<typeof outputSchema>) =>
    o.races.filter((r) => raceIds.has(r.raceId)).length >= raceIds.size &&
    o.propositions.filter((p) => propNums.has(p.number.replace(/\D/g, ""))).length >= propNums.size;

  let output: z.infer<typeof outputSchema> | null = null;
  try {
    const o = (await run(model)).output;
    if (complete(o)) output = o;
    else console.warn(`[oracle] ${model} returned an incomplete ballot; falling back`);
  } catch (e) {
    console.warn(`[oracle] ${model} failed; falling back`, e);
  }
  if (!output) {
    emit({ type: "log", label: "Double-checking a few picks…" });
    output = (await run(model === FALLBACK_MODEL ? MODEL : FALLBACK_MODEL)).output;
  }

  if (process.env.ORACLE_DEBUG) console.log("[oracle] output", JSON.stringify(output).slice(0, 1500));
  emit({ type: "stage", stage: "finalizing", label: "Polishing your personal ballot" });

  // ---- Assemble -------------------------------------------------------------
  const byRace = new Map(output.races.map((r) => [r.raceId, r]));
  const picks: Results["picks"] = ballot.races.map((race) => {
    const rec = byRace.get(race.id);
    const chosen = rec?.pick ? matchCandidate(rec.pick, race.candidates) : null;
    return {
      raceId: race.id,
      office: race.office,
      level: race.level,
      pick: chosen ? toCard(chosen) : null,
      others: race.candidates.filter((c) => c !== chosen).map(toCard),
      confidence: rec?.confidence ?? "tossup",
      reason: rec?.reason ? brief(rec.reason) : "We couldn't form a confident recommendation for this race.",
    };
  });

  const byProp = new Map(output.propositions.map((p) => [p.number.replace(/\D/g, ""), p]));
  const propositions: Results["propositions"] = ballot.propositions.map((p) => {
    const rec = byProp.get(p.number);
    return {
      number: p.number,
      title: p.title.replace(/\s*(Initiative|Legislative)[^.]*\.\s*$/i, "").replace(/\.$/, ""),
      vote: rec?.vote ?? "undecided",
      confidence: rec?.confidence ?? "tossup",
      reason: rec?.reason ? brief(rec.reason) : "Your answers point both ways on this one.",
    };
  });

  let localOut: Results["local"] = null;
  if (localNow && output.local) {
    localOut = {
      contests: output.local.contests.map((c) => ({
        office: c.office,
        pick: c.pick,
        candidates: localNow.contests.find((x) => x.office === c.office)?.candidates.map((x) => x.name) ?? [],
        confidence: c.confidence,
        reason: brief(c.reason),
      })),
      measures: output.local.measures.map((m) => ({
        name: m.name,
        title: localNow.measures.find((x) => x.name === m.name)?.title ?? "",
        vote: m.vote,
        reason: brief(m.reason),
      })),
    };
  }

  const seen = new Set<string>();
  return {
    archetype: { title: cleanTitle(output.archetype.title, axes), summary: brief(output.archetype.summary, 45) },
    axes,
    picks,
    propositions,
    local: localOut,
    location: { matchedAddress: location.matchedAddress, county: location.county, city: location.city },
    districts: ballot.districts,
    sources: sources.filter((s) => s.url && !seen.has(s.url) && seen.add(s.url)).slice(0, 25),
    electionDate: ELECTION_DATE,
  };
}
