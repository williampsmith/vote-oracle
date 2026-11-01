"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Answers, Axis } from "@/lib/questions";
import type { BallotPreview, Results } from "@/lib/types";
import { Gate, Denied } from "./Gate";
import { Intro } from "./Intro";
import { SwipeDeck } from "./SwipeDeck";
import { Priorities } from "./Priorities";
import { AddressStep } from "./AddressStep";
import { Analyzing } from "./Analyzing";
import { ResultsView } from "./ResultsView";

type Stage = "gate" | "denied" | "intro" | "swipe" | "priorities" | "address" | "analyzing" | "results";

/**
 * All state lives in memory only — no cookies, no localStorage. A refresh starts over,
 * including the California residency check.
 */
export function Oracle() {
  const [stage, setStage] = useState<Stage>("gate");
  const [answers, setAnswers] = useState<Answers>({});
  const [priorities, setPriorities] = useState<Axis[]>([]);
  const [ballot, setBallot] = useState<BallotPreview | null>(null);
  const [results, setResults] = useState<Results | null>(null);

  const restart = useCallback(() => {
    setAnswers({});
    setPriorities([]);
    setBallot(null);
    setResults(null);
    setStage("gate");
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="grain relative min-h-dvh overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-dvh"
        >
          {stage === "gate" && <Gate onYes={() => setStage("intro")} onNo={() => setStage("denied")} />}
          {stage === "denied" && <Denied onChange={() => setStage("gate")} />}
          {stage === "intro" && <Intro onStart={() => setStage("swipe")} />}
          {stage === "swipe" && (
            <SwipeDeck
              answers={answers}
              setAnswers={setAnswers}
              onDone={() => setStage("priorities")}
            />
          )}
          {stage === "priorities" && (
            <Priorities
              answers={answers}
              value={priorities}
              onChange={setPriorities}
              onBack={() => setStage("swipe")}
              onNext={() => setStage("address")}
            />
          )}
          {stage === "address" && (
            <AddressStep
              ballot={ballot}
              setBallot={setBallot}
              onBack={() => setStage("priorities")}
              onNext={() => setStage("analyzing")}
            />
          )}
          {stage === "analyzing" && ballot && (
            <Analyzing
              answers={answers}
              priorities={priorities}
              ballot={ballot}
              onDone={(r) => {
                setResults(r);
                setStage("results");
                window.scrollTo(0, 0);
              }}
              onBack={() => setStage("address")}
            />
          )}
          {stage === "results" && results && <ResultsView results={results} onRestart={restart} />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
