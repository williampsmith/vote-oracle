"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { QUESTIONS, type Answer, type Answers } from "@/lib/questions";

const SWIPE_X = 110;
const SWIPE_Y = 110;
const FLY = 1.6;

const fallbackBg = "linear-gradient(160deg, #3a2a20 0%, #1f1a17 55%, #14110f 100%)";

function preload(i: number) {
  const q = QUESTIONS[i];
  if (!q) return;
  const img = new Image();
  img.src = q.image;
}

export function SwipeDeck({
  answers,
  setAnswers,
  onDone,
}: {
  answers: Answers;
  setAnswers: Dispatch<SetStateAction<Answers>>;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(() => {
    const firstUnanswered = QUESTIONS.findIndex((q) => !answers[q.id]);
    return firstUnanswered === -1 ? QUESTIONS.length - 1 : firstUnanswered;
  });
  const busy = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-14, 0, 14]);
  const yeah = useTransform(x, [20, SWIPE_X], [0, 1]);
  const nah = useTransform(x, [-SWIPE_X, -20], [1, 0]);
  const pass = useTransform(y, [-SWIPE_Y, -20], [1, 0]);
  const nextScale = useTransform(x, [-200, 0, 200], [1, 0.94, 1]);

  const q = QUESTIONS[index];
  const next = QUESTIONS[index + 1];

  useEffect(() => {
    preload(index + 1);
    preload(index + 2);
    preload(index + 3);
  }, [index]);

  const commit = useCallback(
    async (answer: Answer) => {
      if (busy.current || !q) return;
      busy.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
      const w = typeof window !== "undefined" ? window.innerWidth : 400;
      const h = typeof window !== "undefined" ? window.innerHeight : 800;
      const tx = answer === "agree" ? w * FLY : answer === "disagree" ? -w * FLY : 0;
      const ty = answer === "skip" ? -h * 1.1 : 40;
      await Promise.all([
        animate(x, tx, { duration: 0.32, ease: [0.4, 0, 0.2, 1] }),
        animate(y, ty, { duration: 0.32, ease: [0.4, 0, 0.2, 1] }),
      ]);
      setAnswers((a) => ({ ...a, [q.id]: answer }));
      x.set(0);
      y.set(0);
      busy.current = false;
      if (index + 1 >= QUESTIONS.length) onDone();
      else setIndex(index + 1);
    },
    [q, index, setAnswers, onDone, x, y],
  );

  const undo = useCallback(() => {
    if (busy.current || index === 0) return;
    const prev = QUESTIONS[index - 1];
    setAnswers((a) => {
      const copy = { ...a };
      delete copy[prev.id];
      return copy;
    });
    setIndex(index - 1);
  }, [index, setAnswers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") commit("agree");
      else if (e.key === "ArrowLeft") commit("disagree");
      else if (e.key === "ArrowUp" || e.key === " ") {
        e.preventDefault();
        commit("skip");
      } else if (e.key === "Backspace" || (e.key === "z" && (e.metaKey || e.ctrlKey))) undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, undo]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_X || velocity.x > 700) commit("agree");
    else if (offset.x < -SWIPE_X || velocity.x < -700) commit("disagree");
    else if (offset.y < -SWIPE_Y || velocity.y < -700) commit("skip");
    else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
      animate(y, 0, { type: "spring", stiffness: 500, damping: 32 });
    }
  };

  if (!q) return null;
  const progress = index / QUESTIONS.length;
  const remaining = QUESTIONS.length - index;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 hidden scale-110 bg-cover bg-center opacity-35 blur-3xl transition-[background-image] duration-500 lg:block"
        style={{ backgroundImage: `url(${q.image})` }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden bg-ink/40 lg:block" />
    <section className="relative mx-auto flex h-dvh max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 lg:max-w-[32rem] lg:py-8">
      <header className="flex items-center gap-3 px-1">
        <button
          onClick={undo}
          disabled={index === 0}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-muted transition hover:text-paper disabled:opacity-30"
          aria-label="Undo last answer"
          title="Undo (Backspace)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={index} aria-valuemax={QUESTIONS.length}>
          <motion.div className="h-full rounded-full bg-ember" animate={{ width: `${progress * 100}%` }} transition={{ type: "spring", stiffness: 200, damping: 30 }} />
        </div>
        <span className="w-14 text-right text-xs tabular-nums text-muted">
          {index + 1}/{QUESTIONS.length}
        </span>
      </header>

      <div className="relative mt-4 flex-1">
        {next && (
          <motion.div
            key={next.id + "-under"}
            style={{ scale: nextScale }}
            className="absolute inset-0 overflow-hidden rounded-[28px] bg-ink-2"
            aria-hidden
          >
            <CardFace text={next.text} image={next.image} dim />
          </motion.div>
        )}

        <motion.div
          key={q.id}
          drag
          dragElastic={0.9}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          onDragEnd={onDragEnd}
          style={{ x, y, rotate }}
          initial={{ scale: 0.94, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 cursor-grab touch-none select-none overflow-hidden rounded-[28px] bg-ink-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)] active:cursor-grabbing"
        >
          <CardFace text={q.text} image={q.image} />
          <Stamp style={{ opacity: yeah }} className="left-6 top-8 -rotate-12 border-sage text-sage">Yeah</Stamp>
          <Stamp style={{ opacity: nah }} className="right-6 top-8 rotate-12 border-rose text-rose">Nah</Stamp>
          <Stamp style={{ opacity: pass }} className="left-1/2 top-1/3 -translate-x-1/2 border-gold text-gold">Not sure</Stamp>
        </motion.div>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-2">
        <ActionButton label="Nah" sub="←" tone="rose" onClick={() => commit("disagree")}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </ActionButton>
        <button
          onClick={() => commit("skip")}
          className="grid h-12 w-12 place-items-center rounded-full border border-gold/40 text-gold transition hover:bg-gold/10 active:scale-95"
          aria-label="Not sure (swipe up)"
          title="Not sure (↑)"
        >
          <span className="text-lg font-semibold">?</span>
        </button>
        <ActionButton label="Yeah" sub="→" tone="sage" onClick={() => commit("agree")}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </ActionButton>
      </div>
      <p className="mt-3 text-center text-xs text-muted lg:hidden">
        {remaining > 1 ? `${remaining - 1} to go` : "Last one!"} · swipe, tap, or use arrow keys
      </p>
      <p className="mt-4 hidden items-center justify-center gap-4 text-xs text-muted lg:flex">
        <span><Kbd>←</Kbd> Nah</span>
        <span><Kbd>↑</Kbd> Not sure</span>
        <span><Kbd>→</Kbd> Yeah</span>
        <span><Kbd>⌫</Kbd> Undo</span>
        <span className="text-paper/60">· {remaining > 1 ? `${remaining - 1} to go` : "Last one!"}</span>
      </p>
    </section>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mr-1 inline-grid h-6 min-w-6 place-items-center rounded-md border border-white/20 bg-white/5 px-1.5 font-sans text-[11px] text-paper">
      {children}
    </kbd>
  );
}

function CardFace({ text, image, dim = false }: { text: string; image: string; dim?: boolean }) {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image}), ${fallbackBg}` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/95" />
      <div className="absolute inset-x-0 bottom-0 p-6 pb-8">
        <p className={`font-display text-[1.65rem] font-medium leading-[1.18] lg:text-[1.9rem] text-white text-balance drop-shadow-[0_2px_12px_rgba(0,0,0,.6)] ${dim ? "opacity-0" : ""}`}>
          {text}
        </p>
      </div>
      {dim && <div className="absolute inset-0 bg-black/40" />}
    </>
  );
}

function Stamp({ children, className, style }: { children: React.ReactNode; className: string; style: React.ComponentProps<typeof motion.div>["style"] }) {
  return (
    <motion.div
      style={style}
      className={`pointer-events-none absolute rounded-xl border-4 px-4 py-1.5 text-3xl font-extrabold uppercase tracking-wider bg-black/20 backdrop-blur-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

function ActionButton({
  children,
  label,
  sub,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  sub: string;
  tone: "rose" | "sage";
  onClick: () => void;
}) {
  const cls =
    tone === "rose"
      ? "border-rose/40 text-rose hover:bg-rose/10"
      : "border-sage/40 text-sage hover:bg-sage/10";
  return (
    <button
      onClick={onClick}
      className={`flex h-16 items-center justify-center gap-2 rounded-full border-2 transition active:scale-95 ${cls}`}
      aria-label={`${label} (${sub})`}
    >
      {children}
      <span className="text-base font-semibold">{label}</span>
    </button>
  );
}
