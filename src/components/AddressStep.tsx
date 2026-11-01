"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { BallotPreview } from "@/lib/types";
import { Avatar } from "./Avatar";

const CHAMBER_LABEL = {
  congress: "U.S. House",
  senate: "State Senate",
  assembly: "State Assembly",
  boe: "Board of Equalization",
} as const;

type Chamber = keyof typeof CHAMBER_LABEL;

const inputClass =
  "h-14 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-lg outline-none transition placeholder:text-white/25 focus:border-ember";

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
  const [zip, setZip] = useState(ballot?.location.zip ?? "");
  const [street, setStreet] = useState("");
  const [useStreet, setUseStreet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchBallot(body: object) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ballot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
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

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    const z = zip.trim();
    if (useStreet && street.trim()) fetchBallot({ address: `${street.trim()}, ${z}, CA` });
    else fetchBallot({ zip: z });
  }

  function choose(chamber: Chamber, district: number) {
    if (!ballot?.location.zip) return;
    fetchBallot({ zip: ballot.location.zip, choose: { ...stripNulls(ballot.districts), [chamber]: district } });
  }

  if (ballot) {
    const d = ballot.districts;
    const faces = ballot.races.flatMap((r) => r.candidates).slice(0, 9);
    const splits = ballot.splits ?? [];
    return (
      <section className="mx-auto flex min-h-dvh max-w-md flex-col lg:min-h-0 lg:gap-0 lg:py-16 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
        <button onClick={() => setBallot(null)} className="self-start text-sm text-muted hover:text-paper">
          ← Change location
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

        {splits.length > 0 && (
          <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/[0.06] p-4">
            <p className="font-semibold">Your ZIP crosses district lines</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              We picked where most of your neighbors vote. If the names on your sample ballot match the other option,
              switch it — or{" "}
              <button
                onClick={() => {
                  setUseStreet(true);
                  setBallot(null);
                }}
                className="text-paper underline decoration-gold underline-offset-2"
              >
                use your street address
              </button>{" "}
              for an exact match.
            </p>
            <div className="mt-4 grid gap-4">
              {splits.map((s) => (
                <div key={s.chamber}>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{CHAMBER_LABEL[s.chamber]}</p>
                  <div className="mt-2 grid gap-2" role="radiogroup" aria-label={CHAMBER_LABEL[s.chamber]}>
                    {s.options.map((o) => {
                      const on = d[s.chamber] === o.district;
                      return (
                        <button
                          key={o.district}
                          role="radio"
                          aria-checked={on}
                          disabled={loading}
                          onClick={() => !on && choose(s.chamber, o.district)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm transition disabled:opacity-60 ${
                            on ? "border-gold bg-gold/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-semibold">District {o.district}</span>
                            <span className="text-xs text-muted">{Math.round(o.share * 100)}% of ZIP</span>
                          </span>
                          <span className="mt-0.5 block text-muted">
                            {o.candidates.length ? o.candidates.join(" vs. ") : "No race on the ballot this year"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
          {ballot.location.county && <Fact k="County" v={ballot.location.county.replace(/ County$/, "")} />}
          {d.congress && <Fact k="U.S. House" v={`District ${d.congress}`} />}
          {d.senate && <Fact k="State Senate" v={`District ${d.senate}`} />}
          {d.assembly && <Fact k="State Assembly" v={`District ${d.assembly}`} />}
          {d.boe && <Fact k="Board of Equalization" v={`District ${d.boe}`} />}
        </dl>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Includes statewide offices, your districts, and all statewide propositions. The Oracle will also try to look up
          local county and city contests.
        </p>

        <div className="flex-1" />
        <button
          onClick={onNext}
          disabled={loading}
          className="mt-8 h-14 rounded-2xl bg-ember text-lg font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(240,106,42,.7)] transition hover:bg-ember-2 active:scale-[0.98] disabled:opacity-60"
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
        What&apos;s your ZIP code?
      </h1>
      <p className="mt-3 text-muted">
        That&apos;s all we need to find your ballot. If your ZIP straddles district lines, we&apos;ll show you the
        options.
      </p>

      <form onSubmit={lookup} className="mt-8 grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-sm text-muted">ZIP code</span>
          <input
            required
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            autoComplete="postal-code"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="95814"
            className={`${inputClass} tracking-[0.2em]`}
          />
        </label>
        {useStreet ? (
          <label className="grid gap-1.5">
            <span className="text-sm text-muted">Street address (optional, for exact districts)</span>
            <input
              autoComplete="address-line1"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="1315 10th St"
              className={inputClass}
            />
            <span className="text-xs leading-relaxed text-muted">
              Sent once to the U.S. Census geocoder to find your districts. Never stored or logged.
            </span>
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setUseStreet(true)}
            className="justify-self-start text-sm text-muted underline decoration-white/20 underline-offset-4 hover:text-paper"
          >
            Prefer exact districts? Add your street address
          </button>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-rose/10 px-4 py-3 text-sm text-rose">
            {error}
          </p>
        )}
        <button
          disabled={loading || zip.length !== 5}
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

function stripNulls(d: BallotPreview["districts"]) {
  return Object.fromEntries(Object.entries(d).filter(([, v]) => v != null));
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  );
}
