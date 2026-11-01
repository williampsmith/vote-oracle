"use client";

import { AXES, AXIS_META, type Answers, type Axis } from "@/lib/questions";

const ISSUE_COPY: Record<Axis, { title: string; body: string }> = {
  econ: { title: "Cost of living & jobs", body: "Wages, taxes, prices, business" },
  social: { title: "Values & community", body: "Family, schools, culture, rights" },
  safety: { title: "Public safety", body: "Crime, policing, homelessness" },
  climate: { title: "Energy & environment", body: "Gas, power bills, climate, water" },
  housing: { title: "Housing", body: "Rent, home prices, development" },
  immigration: { title: "Immigration", body: "Borders, enforcement, newcomers" },
  governance: { title: "Fixing government", body: "Who leads, and how" },
  pragmatism: { title: "Electability", body: "Backing people who can actually win" },
};

export function Priorities({
  answers,
  value,
  onChange,
  onBack,
  onNext,
}: {
  answers: Answers;
  value: Axis[];
  onChange: (v: Axis[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const answered = Object.values(answers).filter((a) => a !== "skip").length;
  const toggle = (a: Axis) =>
    onChange(value.includes(a) ? value.filter((x) => x !== a) : value.length >= 3 ? [...value.slice(1), a] : [...value, a]);

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col lg:min-h-0 lg:gap-0 lg:py-16 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8">
      <button onClick={onBack} className="self-start text-sm text-muted hover:text-paper">
        ← Back to questions
      </button>
      <p className="mt-8 text-sm font-medium uppercase tracking-[0.18em] text-ember">Nice — {answered} answers in</p>
      <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-[1.08] text-balance">
        What matters most to you this year?
      </h1>
      <p className="mt-3 text-muted">Pick up to three. We&apos;ll give these extra weight. You can also skip this.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {AXES.map((a) => {
          const on = value.includes(a);
          const rank = value.indexOf(a) + 1;
          return (
            <button
              key={a}
              onClick={() => toggle(a)}
              aria-pressed={on}
              title={AXIS_META[a].blurb}
              className={`relative rounded-2xl border p-4 text-left transition active:scale-[0.98] ${
                on ? "border-ember bg-ember/15" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              {on && (
                <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-ember text-xs font-bold text-ink">
                  {rank}
                </span>
              )}
              <span className="block pr-6 font-semibold leading-snug">{ISSUE_COPY[a].title}</span>
              <span className="mt-1 block text-sm leading-snug text-muted">{ISSUE_COPY[a].body}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1" />
      <button
        onClick={onNext}
        className="mt-8 h-14 rounded-2xl bg-paper text-lg font-semibold text-ink transition hover:bg-white active:scale-[0.98]"
      >
        {value.length ? "Continue" : "Skip — weigh everything equally"}
      </button>
    </section>
  );
}
