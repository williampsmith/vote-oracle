"use client";

import { Logo } from "./Logo";

export function Gate({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <section className="relative mx-auto flex min-h-dvh max-w-md flex-col lg:min-h-0 lg:gap-14 lg:py-16 justify-between px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
      <Glow />
      <Logo />
      <div className="relative">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.18em] text-ember">Before we begin</p>
        <h1 className="font-display text-[2.6rem] font-medium leading-[1.05] text-balance">
          Are you a California resident?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Vote Oracle is tuned to the <span className="text-paper">November 3, 2026</span> California ballot — every race,
          every proposition.
        </p>
      </div>
      <div className="relative grid gap-3">
        <button
          onClick={onYes}
          className="h-14 rounded-2xl bg-paper text-lg font-semibold text-ink transition active:scale-[0.98] hover:bg-white"
        >
          Yes, I live in California
        </button>
        <button
          onClick={onNo}
          className="h-14 rounded-2xl border border-white/15 text-lg font-medium text-paper/80 transition active:scale-[0.98] hover:bg-white/5"
        >
          No
        </button>
      </div>
    </section>
  );
}

export function Denied({ onChange }: { onChange: () => void }) {
  return (
    <section className="relative mx-auto flex min-h-dvh max-w-md flex-col lg:min-h-0 lg:gap-0 lg:py-16 justify-center px-6 py-10">
      <Logo />
      <div className="mt-16">
        <h1 className="font-display text-4xl font-medium leading-tight">Sorry — California only, for now.</h1>
        <p className="mt-4 leading-relaxed text-muted">
          Vote Oracle is built around California&apos;s ballot, districts and propositions, so it can&apos;t give you
          accurate picks for another state. You can find your own state&apos;s election info at{" "}
          <a className="text-paper underline decoration-ember underline-offset-4" href="https://vote.gov" target="_blank" rel="noreferrer">
            vote.gov
          </a>
          .
        </p>
        <button onClick={onChange} className="mt-10 text-sm font-medium text-ember underline underline-offset-4">
          Actually, I do live in California
        </button>
      </div>
    </section>
  );
}

function Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden lg:hidden">
      <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-ember/30 blur-3xl" />
      <div className="absolute -left-20 bottom-40 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
    </div>
  );
}
