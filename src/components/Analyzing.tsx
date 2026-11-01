"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Answers, Axis } from "@/lib/questions";
import type { BallotPreview, Results, StreamEvent } from "@/lib/types";

const STAGES = [
  { id: "mapping", label: "Mapping your districts" },
  { id: "researching", label: "Researching every candidate" },
  { id: "matching", label: "Cross-referencing your values" },
  { id: "finalizing", label: "Writing your ballot" },
] as const;

const QUIPS = [
  "Reading 14 propositions so you don't have to…",
  "Translating campaign-speak into English…",
  "Cross-checking voting records against your gut…",
  "Asking each candidate what they'd do about rent…",
  "Weighing your ‘nah’s against their ‘yes’s…",
  "Consulting the crystal ball (it's mostly spreadsheets)…",
  "Skimming fiscal impact reports with a fresh coffee…",
  "Ignoring the yard signs, reading the fine print…",
  "Separating the platforms from the platitudes…",
  "Tallying which ideas you'd actually swipe right on…",
];

export function Analyzing({
  answers,
  priorities,
  ballot,
  onDone,
  onBack,
}: {
  answers: Answers;
  priorities: Axis[];
  ballot: BallotPreview;
  onDone: (r: Results) => void;
  onBack: () => void;
}) {
  const [stage, setStage] = useState<string>("mapping");
  const [logs, setLogs] = useState<string[]>([]);
  const [quip, setQuip] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    const t = setInterval(() => setQuip((q) => (q + 1) % QUIPS.length), 3200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (started.current === attempt) return; // guard against StrictMode double-invoke
    started.current = attempt;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers, priorities, location: ballot.location }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "The Oracle is unavailable right now.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const ev = JSON.parse(line) as StreamEvent;
            if (ev.type === "stage") setStage(ev.stage);
            else if (ev.type === "log") setLogs((l) => [...l.slice(-5), ev.label]);
            else if (ev.type === "error") throw new Error(ev.message);
            else if (ev.type === "result") {
              setStage("done");
              await new Promise((r) => setTimeout(r, 700));
              onDone(ev.data);
              return;
            }
          }
        }
        throw new Error("The connection closed before your picks were ready.");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    })();
    return () => ctrl.abort();
  }, [attempt, answers, priorities, ballot, onDone]);

  const stageIdx = stage === "done" ? STAGES.length : STAGES.findIndex((s) => s.id === stage);

  return (
    <section className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 pb-10 pt-14 text-center">
      <Orb />
      <h1 className="mt-10 font-display text-3xl font-medium leading-tight">The Oracle is consulting…</h1>
      <div className="mt-2 h-6 overflow-hidden text-sm text-muted">
        <AnimatePresence mode="wait">
          <motion.p
            key={quip}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {QUIPS[quip]}
          </motion.p>
        </AnimatePresence>
      </div>

      <ol className="mt-10 grid w-full gap-3 text-left">
        {STAGES.map((s, i) => {
          const state = i < stageIdx ? "done" : i === stageIdx ? "active" : "todo";
          return (
            <li key={s.id} className="flex items-center gap-3">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  state === "done" ? "bg-sage text-ink" : state === "active" ? "bg-ember text-ink" : "bg-white/5 text-muted"
                }`}
              >
                {state === "done" ? "✓" : state === "active" ? <Spinner /> : i + 1}
              </span>
              <span className={state === "todo" ? "text-muted" : "text-paper"}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 min-h-[8.5rem] w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-left font-mono text-[12px] leading-relaxed text-muted" aria-live="polite">
        <AnimatePresence initial={false}>
          {logs.map((l, i) => (
            <motion.p
              key={l + i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: i === logs.length - 1 ? 1 : 0.55, x: 0 }}
              className="truncate"
            >
              <span className="text-ember">›</span> {l}
            </motion.p>
          ))}
        </AnimatePresence>
        {!logs.length && <p className="opacity-60">› warming up…</p>}
      </div>

      {error && (
        <div role="alert" className="mt-6 w-full rounded-2xl bg-rose/10 p-4 text-sm text-rose">
          <p>{error}</p>
          <div className="mt-3 flex justify-center gap-4">
            <button
              className="font-semibold underline underline-offset-4"
              onClick={() => {
                setError(null);
                setLogs([]);
                setStage("mapping");
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </button>
            <button className="underline underline-offset-4 opacity-80" onClick={onBack}>
              Go back
            </button>
          </div>
        </div>
      )}
      <p className="mt-auto pt-8 text-xs text-muted">This usually takes 30–90 seconds. Keep this tab open.</p>
    </section>
  );
}

function Spinner() {
  return <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />;
}

function Orb() {
  return (
    <div className="relative h-44 w-44" aria-hidden>
      <div className="orb-pulse absolute inset-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd9a8,#f06a2a_45%,#5a1d0b_80%)]" />
      <div className="absolute inset-4 overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_28%,#ffe7c7_0%,#f58a4c_30%,#a8361a_62%,#2a0f07_100%)] shadow-[inset_-12px_-16px_40px_rgba(0,0,0,.55),inset_10px_12px_30px_rgba(255,220,180,.35)]">
        <div className="orb-spin absolute -inset-6 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,240,220,.35)_40deg,transparent_90deg,transparent_200deg,rgba(255,200,120,.25)_250deg,transparent_300deg)]" />
        <div className="orb-spin-rev absolute -inset-6 bg-[conic-gradient(from_90deg,transparent,rgba(120,40,10,.45)_60deg,transparent_140deg)] mix-blend-multiply" />
        <div className="absolute left-[22%] top-[16%] h-8 w-12 rotate-[-25deg] rounded-full bg-white/50 blur-md" />
      </div>
      <div className="absolute -bottom-3 left-1/2 h-4 w-28 -translate-x-1/2 rounded-full bg-black/60 blur-md" />
    </div>
  );
}
