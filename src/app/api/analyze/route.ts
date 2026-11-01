import { z } from "zod";
import { analyze } from "@/lib/analyze";
import { answersSchema, locationSchema, prioritiesSchema } from "@/lib/validate";
import type { StreamEvent } from "@/lib/types";
import { rateLimit, tooMany } from "@/lib/ratelimit";

export const maxDuration = 300;

const body = z.object({ answers: answersSchema, priorities: prioritiesSchema, location: locationSchema });

export async function POST(req: Request) {
  // 4 analyses per IP per hour, max 1 per minute burst-wise.
  const dev = process.env.NODE_ENV !== "production";
  const burst = dev ? ({ ok: true } as const) : rateLimit(req, "analyze-min", 1, 60_000);
  if (!burst.ok) return tooMany(burst.retryAfter, "One reading at a time — give the Oracle a minute.");
  const hourly = dev ? ({ ok: true } as const) : rateLimit(req, "analyze-hr", 4, 60 * 60_000);
  if (!hourly.ok) return tooMany(hourly.retryAfter, "You've hit the hourly limit for readings. Please try again later.");
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {}
      };
      try {
        // Local-only model override for side-by-side comparisons.
        const override = dev ? req.headers.get("x-oracle-model") ?? undefined : undefined;
        const data = await analyze(parsed.data, emit, override);
        emit({ type: "result", data });
      } catch (e) {
        console.error("analysis failed", e);
        emit({ type: "error", message: "The Oracle hit a snag generating your picks. Please try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
