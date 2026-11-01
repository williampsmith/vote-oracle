"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { BallotPreview } from "@/lib/types";
import { Avatar } from "./Avatar";

export function AddressStep({
  ballot,
  setBallot,
  onBack,
  onNext,
}: {
  ballot: BallotPreview | null;
  setBallot: (b: BallotPreview | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [street, setStreet] = useState("");
  const [cityZip, setCityZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ballot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: `${street}, ${cityZip}, CA` }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Lookup failed");
      setBallot(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  if (ballot) {
    const d = ballot.districts;
    const faces = ballot.races.flatMap((r) => r.candidates).slice(0, 9);
    return (
      <section className="mx-auto flex min-h-dvh max-w-md flex-col lg:min-h-0 lg:gap-0 lg:py-16 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        <button onClick={() => setBallot(null)} className="self-start text-sm text-muted hover:text-paper">
          ← Change address
        </button>
        <p className="mt-8 text-sm font-medium uppercase tracking-[0.18em] text-ember">Ballot found</p>
        <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-[1.08] text-balance">
          {ballot.raceCount} races and {ballot.propCount} propositions are waiting for you.
        </h1>
        <p className="mt-3 text-sm text-muted">{ballot.location.matchedAddress}</p>

        <div className="mt-6 flex -space-x-3">
          {faces.map((c, i) => (
            <motion.div key={c.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Avatar person={c} size={48} ring />
            </motion.div>
          ))}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {ballot.location.county && <Fact k="County" v={ballot.location.county.replace(/ County$/, "")} />}
          {d.congress && <Fact k="U.S. House" v={`District ${d.congress}`} />}
          {d.senate && <Fact k="State Senate" v={`District ${d.senate}`} />}
          {d.assembly && <Fact k="State Assembly" v={`District ${d.assembly}`} />}
          {d.boe && <Fact k="Board of Equalization" v={`District ${d.boe}`} />}
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Includes statewide offices, your districts, and all statewide propositions. The Oracle will also try to look up
          local county and city contests.
        </p>

        <div className="flex-1" />
        <button
          onClick={onNext}
          className="mt-8 h-14 rounded-2xl bg-ember text-lg font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(240,106,42,.7)] transition hover:bg-ember-2 active:scale-[0.98]"
        >
          Reveal my picks ✦
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col lg:min-h-0 lg:gap-0 lg:py-16 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
      <button onClick={onBack} className="self-start text-sm text-muted hover:text-paper">
        ← Back
      </button>
      <p className="mt-8 text-sm font-medium uppercase tracking-[0.18em] text-ember">Last step</p>
      <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-[1.08] text-balance">
        Where are you registered to vote?
      </h1>
      <p className="mt-3 text-muted">
        Your address decides which districts and candidates are on your ballot. We use it only for this lookup and
        never store it.
      </p>

      <form onSubmit={lookup} className="mt-8 grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm text-muted">Street address</span>
          <input
            required
            autoComplete="street-address"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="1315 10th St"
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-lg outline-none transition placeholder:text-white/25 focus:border-ember"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm text-muted">City or ZIP code</span>
          <input
            required
            autoComplete="postal-code"
            value={cityZip}
            onChange={(e) => setCityZip(e.target.value)}
            placeholder="Sacramento 95814"
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-lg outline-none transition placeholder:text-white/25 focus:border-ember"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="mt-4 h-14 rounded-2xl bg-paper text-lg font-semibold text-ink transition hover:bg-white active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Finding your ballot…" : "Find my ballot"}
        </button>
      </form>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Not registered yet? California offers same-day registration through Election Day.{" "}
        <a href="https://registertovote.ca.gov" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          registertovote.ca.gov
        </a>
      </p>
    </section>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
