import { z } from "zod";
import { AXES, QUESTIONS } from "./questions";

const ids = new Set(QUESTIONS.map((q) => q.id));

export const answersSchema = z
  .record(z.string(), z.enum(["agree", "disagree", "skip"]))
  .refine((a) => Object.keys(a).every((k) => ids.has(k)), "Unknown question id");

export const prioritiesSchema = z.array(z.enum(AXES)).max(3);

export const locationSchema = z.object({
  matchedAddress: z.string().max(300),
  lat: z.number().min(32).max(42.1),
  lng: z.number().min(-124.6).max(-114),
  county: z.string().max(80).nullable(),
  city: z.string().max(80).nullable(),
  zip: z.string().max(10).nullable(),
});
