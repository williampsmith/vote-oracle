"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Confidence, RacePick, Results } from "@/lib/types";
import { Avatar } from "./Avatar";
import { LeanChart } from "./LeanChart";
import { Logo } from "./Logo";

const CONF: Record<Confidence, { label: string; cls: string }> = {
  strong: { label: "Strong match", cls: "bg-sage/15 text-sage" },
  lean: { label: "Leans your way", cls: "bg-gold/15 text-gold" },
  tossup: { label: "Close call", cls: "bg-white/10 text-muted" },
};

const GROUPS: { title: string; levels: string[] }[] = [
  { title: "Statewide offices", levels: ["statewide", "boe"] },
  { title: "Congress", levels: ["congress"] },
  { title: "State Legislature", levels: ["senate", "assembly"] },
];

export function ResultsView({ results, onRestart }: { results: Results; onRestart: () => void }) {
  const r = results;
  const grouped = useMemo(
    () => GROUPS.map((g) => ({ ...g, picks: r.picks.filter((p) => g.levels.includes(p.level)) })).filter((g) => g.picks.length),
    [r.picks],
  );

  return (
    <div className="mx-auto max-w-2xl px-5 pb-24 pt-8">
      <header className="no-print flex items-center justify-between">
        <Logo />
        <button onClick={onRestart} className="text-sm text-muted underline-offset-4 hover:text-paper hover:underline">
          Start over
        </button>
      </header>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-ember">Your voter archetype</p>
        <h1 className="mt-2 font-display text-[2.6rem] font-medium leading-[1.04] text-balance sm:text-5xl">
          {r.archetype.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-paper/80">{r.archetype.summary}</p>
      </motion.section>

      <section className="print-card mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="font-display text-xl font-medium">How you lean</h2>
        <p className="mt-1 text-sm text-muted">Based on your answers. The further a bar reaches, the stronger the pull.</p>
        <LeanChart axes={r.axes} />
      </section>

      {grouped.map((g) => (
        <section key={g.title} className="mt-12">
          <SectionTitle>{g.title}</SectionTitle>
          <div className="mt-4 grid gap-3">
            {g.picks.map((p, i) => (
              <PickCard key={p.raceId} p={p} i={i} />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-12">
        <SectionTitle>Statewide propositions</SectionTitle>
        <div className="mt-4 grid gap-3">
          {r.propositions.map((p, i) => (
            <motion.article
              key={p.number}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: Math.min(i * 0.03, 0.2) }}
              className="print-card flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <VoteBadge vote={p.vote} />
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug">
                  <span className="text-muted">Prop {p.number}</span> · {p.title}
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-paper/75">{p.reason}</p>
                <ConfChip c={p.confidence} />
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionTitle>Local ballot</SectionTitle>
        {r.local && (r.local.contests.length || r.local.measures.length) ? (
          <>
            <p className="mt-2 text-sm text-muted">
              Researched from local sources for {r.location.city ?? r.location.county}. Local ballots vary by precinct, so
              compare against your official sample ballot.
            </p>
            <div className="mt-4 grid gap-3">
              {r.local.contests.map((c) => (
                <article key={c.office} className="print-card rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">{c.office}</p>
                  <p className="mt-1 font-display text-xl">{c.pick ?? "Consider leaving blank"}</p>
                  {c.candidates.length > 1 && (
                    <p className="text-xs text-muted">Also running: {c.candidates.filter((n) => n !== c.pick).join(", ")}</p>
                  )}
                  <p className="mt-1.5 text-[15px] leading-relaxed text-paper/75">{c.reason}</p>
                  <ConfChip c={c.confidence} />
                </article>
              ))}
              {r.local.measures.map((m) => (
                <article key={m.name} className="print-card flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <VoteBadge vote={m.vote} />
                  <div>
                    <h3 className="font-semibold leading-snug">
                      {m.name}
                      {m.title && <span className="text-muted"> · {m.title}</span>}
                    </h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-paper/75">{m.reason}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[15px] leading-relaxed text-paper/75">
            We couldn&apos;t reliably pull local contests for your area. Your county registrar mails a sample ballot, and you can also look it up at{" "}
            <a className="underline decoration-ember underline-offset-4" href="https://www.sos.ca.gov/elections/voting-resources/county-elections-offices" target="_blank" rel="noreferrer">
              your county elections office
            </a>
            .
          </p>
        )}
      </section>

      <EmailForm results={r} />

      <section className="no-print mt-8 grid grid-cols-2 gap-3">
        <button onClick={() => window.print()} className="h-12 rounded-2xl border border-white/15 font-medium transition hover:bg-white/5">
          Print / save PDF
        </button>
        <button onClick={onRestart} className="h-12 rounded-2xl border border-white/15 font-medium transition hover:bg-white/5">
          Start over
        </button>
      </section>

      <footer className="mt-12 space-y-4 text-xs leading-relaxed text-muted">
        <p>
          Vote Oracle matches the values you expressed to candidates&apos; documented positions. It&apos;s a starting point, not
          an endorsement: read your official voter guide and vote your conscience. Election Day is{" "}
          <span className="text-paper">Tuesday, November 3, 2026</span>, and polls are open 7am–8pm.{" "}
          <a className="underline" href="https://www.sos.ca.gov/elections/polling-place" target="_blank" rel="noreferrer">
            Find your polling place or drop box
          </a>
          .
        </p>
        <p>
          Districts: {r.location.matchedAddress}
          {r.districts.congress ? ` · CD ${r.districts.congress}` : ""}
          {r.districts.senate ? ` · SD ${r.districts.senate}` : ""}
          {r.districts.assembly ? ` · AD ${r.districts.assembly}` : ""}
          {r.districts.boe ? ` · BOE ${r.districts.boe}` : ""}
        </p>
        {r.sources.length > 0 && (
          <details>
            <summary className="cursor-pointer text-paper/70">Sources consulted ({r.sources.length})</summary>
            <ul className="mt-2 space-y-1">
              {r.sources.map((s) => (
                <li key={s.url} className="truncate">
                  <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-2xl font-medium">
      {children}
      <span className="h-px flex-1 bg-white/10" />
    </h2>
  );
}

function ConfChip({ c }: { c: Confidence }) {
  return <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CONF[c].cls}`}>{CONF[c].label}</span>;
}

function VoteBadge({ vote }: { vote: "yes" | "no" | "undecided" }) {
  const cls = vote === "yes" ? "bg-sage text-ink" : vote === "no" ? "bg-rose text-ink" : "bg-white/10 text-muted";
  return (
    <span className={`grid h-12 w-14 shrink-0 place-items-center rounded-xl text-sm font-extrabold tracking-wide ${cls}`}>
      {vote === "undecided" ? "?" : vote.toUpperCase()}
    </span>
  );
}

function PickCard({ p, i }: { p: RacePick; i: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(i * 0.04, 0.24) }}
      className="print-card rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.office}</p>
      <div className="mt-3 flex gap-4">
        {p.pick ? (
          <Avatar person={p.pick} size={72} />
        ) : (
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-2 border-dashed border-white/20 text-2xl text-muted">
            —
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[1.35rem] font-medium leading-tight">
            {p.pick ? p.pick.name : "Leave it blank"}
          </h3>
          <p className="text-sm text-muted">
            {p.pick ? `${p.pick.party || "Nonpartisan"}${p.pick.incumbent ? " · Incumbent" : ""}` : "Neither finalist fits your values"}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-paper/80">{p.reason}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ConfChip c={p.confidence} />
            {p.others.length > 0 && (
              <span className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                over
                {p.others.map((o) => (
                  <span key={o.name} className="inline-flex items-center gap-1.5">
                    <Avatar person={o} size={20} />
                    {o.name}
                    {o.party ? ` (${o.party[0]})` : ""}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function EmailForm({ results }: { results: Results }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, results }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Couldn't send.");
      setState("sent");
      setMsg(`Sent to ${email}. Check your inbox (and spam folder).`);
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Couldn't send.");
    }
  }

  return (
    <section className="no-print mt-14 rounded-3xl bg-gradient-to-br from-ember/25 via-ember/10 to-transparent p-6">
      <h2 className="font-display text-2xl font-medium">Take your picks to the polls</h2>
      <p className="mt-1 text-sm text-paper/70">We&apos;ll email you this ballot. We don&apos;t store your address or add you to any list.</p>
      {state === "sent" ? (
        <p className="mt-4 rounded-xl bg-sage/15 px-4 py-3 text-sm text-sage">{msg}</p>
      ) : (
        <form onSubmit={send} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-ink/60 px-4 outline-none focus:border-ember"
          />
          <button
            disabled={state === "sending"}
            className="h-12 rounded-xl bg-paper px-6 font-semibold text-ink transition hover:bg-white disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : "Email me"}
          </button>
        </form>
      )}
      {state === "error" && <p className="mt-3 text-sm text-rose">{msg}</p>}
    </section>
  );
}
