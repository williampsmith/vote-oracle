import { z } from "zod";
import { buildBallot, geocode, GeocodeError, lookupZip, type ZipSplit } from "@/lib/ballot";
import type { BallotPreview } from "@/lib/types";
import { rateLimit, tooMany } from "@/lib/ratelimit";

const district = z.number().int().positive().max(80).optional();
const body = z.union([
  z.object({
    zip: z.string().trim().regex(/^\d{5}$/),
    choose: z.object({ congress: district, senate: district, assembly: district, boe: district }).optional(),
  }),
  z.object({ address: z.string().trim().min(5).max(200) }),
]);

export async function POST(req: Request) {
  const rl = rateLimit(req, "ballot", 20, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, "Too many lookups — try again in a few minutes.");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please enter a 5-digit ZIP code or a full street address." }, { status: 400 });
  }
  try {
    let location;
    let splits: ZipSplit[] | undefined;
    if ("zip" in parsed.data) {
      ({ location, splits } = lookupZip(parsed.data.zip, parsed.data.choose));
    } else {
      location = await geocode(parsed.data.address);
    }
    const ballot = buildBallot(location);
    const preview: BallotPreview = {
      location,
      districts: ballot.districts,
      raceCount: ballot.races.length,
      propCount: ballot.propositions.length,
      splits,
      races: ballot.races.map((r) => ({
        id: r.id,
        office: r.office,
        candidates: r.candidates.map((c) => ({ name: c.name, party: c.party, photoUrl: c.photoUrl, incumbent: c.incumbent })),
      })),
    };
    return Response.json(preview);
  } catch (e) {
    const message = e instanceof GeocodeError ? e.message : "Something went wrong looking up your ballot. Please try again.";
    if (!(e instanceof GeocodeError)) console.error("ballot lookup failed", e);
    return Response.json({ error: message }, { status: e instanceof GeocodeError ? 422 : 502 });
  }
}
