"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";

export default function Unlock() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode: code }),
    });
    if (res.ok) window.location.replace("/");
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "That didn't work.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Logo />
      <h1 className="mt-12 font-display text-4xl font-medium leading-tight">This Oracle is private.</h1>
      <p className="mt-3 text-muted">Enter the household passcode to continue. You&apos;ll only need to do this once on this device.</p>
      <form onSubmit={submit} className="mt-8 grid gap-3">
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Passcode"
          placeholder="Passcode"
          className="h-14 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-lg outline-none focus:border-ember"
        />
        {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        <button disabled={busy || !code} className="h-14 rounded-2xl bg-paper text-lg font-semibold text-ink transition hover:bg-white disabled:opacity-50">
          {busy ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
