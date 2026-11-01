"use client";

import { motion } from "motion/react";
import type { AxisScore } from "@/lib/questions";

/** Diverging bar chart: each axis runs from its "neg" pole (left) to its "pos" pole (right). */
export function LeanChart({ axes }: { axes: AxisScore[] }) {
  return (
    <div className="mt-5 grid gap-5" role="list">
      {axes.map((a, i) => {
        const mag = Math.min(100, Math.abs(a.score));
        const right = a.score >= 0;
        const strength = mag < 15 ? "Balanced" : mag < 45 ? "Leans" : mag < 75 ? "Clearly" : "Strongly";
        const toward = mag < 15 ? "" : ` ${right ? a.pos.toLowerCase() : a.neg.toLowerCase()}`;
        return (
          <div key={a.axis} role="listitem" aria-label={`${a.label}: ${strength}${toward} (${a.score})`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{a.label}</span>
              <span className="text-xs text-muted">
                {strength}
                {toward}
              </span>
            </div>
            <div className="relative h-3 rounded-full bg-white/[0.07]">
              <div className="absolute left-1/2 top-[-4px] h-5 w-px bg-white/30" />
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${mag / 2}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute top-0 h-3 ${right ? "left-1/2 rounded-r-full" : "right-1/2 rounded-l-full"}`}
                style={{
                  background: right
                    ? "linear-gradient(90deg, rgba(240,106,42,.55), #f06a2a)"
                    : "linear-gradient(270deg, rgba(244,194,91,.55), #f4c25b)",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted">
              <span>{a.neg}</span>
              <span>{a.pos}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
