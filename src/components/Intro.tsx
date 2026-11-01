"use client";

import { QUESTIONS } from "@/lib/questions";
import { Logo } from "./Logo";

export function Intro({ onStart }: { onStart: () => void }) {
  const minutes = Math.round((QUESTIONS.length * 4.5) / 60);
  return (
    <section className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-10">
      <Logo />
      <div className="mt-12 flex-1">
        <h1 className="font-display text-[2.5rem] font-medium leading-[1.05] text-balance">
          Go with your gut. We&apos;ll do the homework.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          You&apos;ll see {QUESTIONS.length} quick statements. Some are about money, cities, safety or schools; some
          are about how you like to vote. There are no trick questions and no wrong answers. Then the Oracle reads
          up on everyone on your ballot and shows you who fits your values best.
        </p>

        <ul className="mt-8 grid gap-3">
          <Row icon="→" tone="text-sage" title="Swipe right" body="if you mostly agree" />
          <Row icon="←" tone="text-rose" title="Swipe left" body="if you mostly disagree" />
          <Row icon="↑" tone="text-gold" title="Swipe up" body="if you're not sure or don't care" />
        </ul>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-muted">
          <span className="font-semibold text-paper">Private by design.</span> No account, no name, no tracking. We
          don&apos;t save your answers anywhere, so refreshing the page starts everything over. About {minutes}{" "}
          minutes.
        </div>
      </div>
      <button
        onClick={onStart}
        className="mt-8 h-14 rounded-2xl bg-ember text-lg font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(240,106,42,.7)] transition hover:bg-ember-2 active:scale-[0.98]"
      >
        Let&apos;s go
      </button>
    </section>
  );
}

function Row({ icon, tone, title, body }: { icon: string; tone: string; title: string; body: string }) {
  return (
    <li className="flex items-center gap-4">
      <span className={`grid h-10 w-10 place-items-center rounded-full bg-white/5 text-xl font-semibold ${tone}`}>
        {icon}
      </span>
      <span>
        <span className="font-semibold">{title}</span> <span className="text-muted">{body}</span>
      </span>
    </li>
  );
}
