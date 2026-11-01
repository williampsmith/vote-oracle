import { z } from "zod";
import { Resend } from "resend";
import { renderEmail } from "@/lib/email";
import type { Results } from "@/lib/types";
import { rateLimit, tooMany } from "@/lib/ratelimit";

const s = (max: number) => z.string().max(max);
const confidence = z.enum(["strong", "lean", "tossup"]);
const vote = z.enum(["yes", "no", "undecided"]);
const person = z.object({ name: s(120), party: s(60), photoUrl: s(600).nullable(), incumbent: z.boolean().optional() });

// Re-validate everything we render so the endpoint can't be used to mail arbitrary content.
const resultsSchema = z.object({
  archetype: z.object({ title: s(80), summary: s(600) }),
  axes: z.array(z.object({ axis: s(30), label: s(40), neg: s(40), pos: s(40), blurb: s(200), score: z.number().min(-100).max(100) })).max(12),
  picks: z.array(z.object({ raceId: s(40), office: s(120), level: s(20), pick: person.nullable(), others: z.array(person).max(6), confidence, reason: s(400) })).max(30),
  propositions: z.array(z.object({ number: s(6), title: s(200), vote, confidence, reason: s(400) })).max(30),
  local: z
    .object({
      contests: z.array(z.object({ office: s(120), pick: s(120).nullable(), candidates: z.array(s(120)).max(12), confidence, reason: s(400) })).max(12),
      measures: z.array(z.object({ name: s(60), title: s(200), vote, reason: s(400) })).max(12),
    })
    .nullable(),
  location: z.object({ matchedAddress: s(300), county: s(80).nullable(), city: s(80).nullable() }),
  districts: z.record(z.string(), z.number().nullable()),
  sources: z.array(z.object({ url: s(800), title: s(300).optional() })).max(40),
  electionDate: s(20),
});

const body = z.object({ email: z.email().max(254), results: resultsSchema });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  const rl = rateLimit(req, "email", 3, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, "Too many emails — try again in a few minutes.");

  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ error: "Email isn't set up yet on this deployment." }, { status: 503 });

  const site = new URL(req.url).origin;
  const { html, text } = renderEmail(parsed.data.results as Results, site);
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Vote Oracle <onboarding@resend.dev>",
    to: parsed.data.email,
    subject: `Your Vote Oracle ballot picks — ${parsed.data.results.archetype.title}`,
    html,
    text,
  });
  if (error) {
    console.error("email send failed", error);
    return Response.json({ error: "We couldn't send that email. Please try again." }, { status: 502 });
  }
  // Nothing is stored: the address is used once for this send and discarded.
  return Response.json({ ok: true });
}
