import type { AxisScore } from "./questions";

export type Confidence = "strong" | "lean" | "tossup";

export type PersonCard = {
  name: string;
  party: string;
  photoUrl: string | null;
  incumbent?: boolean;
};

export type RacePick = {
  raceId: string;
  office: string;
  level: string;
  pick: PersonCard | null;
  others: PersonCard[];
  confidence: Confidence;
  reason: string;
};

export type PropPick = {
  number: string;
  title: string;
  vote: "yes" | "no" | "undecided";
  confidence: Confidence;
  reason: string;
};

export type LocalPick = {
  office: string;
  pick: string | null;
  candidates: string[];
  confidence: Confidence;
  reason: string;
};

export type LocalMeasurePick = {
  name: string;
  title: string;
  vote: "yes" | "no" | "undecided";
  reason: string;
};

export type Results = {
  archetype: { title: string; summary: string };
  axes: AxisScore[];
  picks: RacePick[];
  propositions: PropPick[];
  local: { contests: LocalPick[]; measures: LocalMeasurePick[] } | null;
  location: { matchedAddress: string; county: string | null; city: string | null };
  districts: { congress: number | null; senate: number | null; assembly: number | null; boe: number | null };
  sources: { url: string; title?: string }[];
  electionDate: string;
};

export type BallotPreview = {
  location: { matchedAddress: string; county: string | null; city: string | null; lat: number; lng: number; zip: string | null };
  districts: Results["districts"];
  raceCount: number;
  propCount: number;
  races: { id: string; office: string; candidates: PersonCard[] }[];
};

export type StreamEvent =
  | { type: "stage"; stage: "mapping" | "researching" | "matching" | "finalizing"; label: string }
  | { type: "log"; label: string }
  | { type: "result"; data: Results }
  | { type: "error"; message: string };
