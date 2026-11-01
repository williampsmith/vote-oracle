"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import type { PersonCard } from "@/lib/types";

const partyTone = (party: string) => {
  const p = party.toLowerCase();
  if (p.startsWith("dem")) return "#3b6fd8";
  if (p.startsWith("rep")) return "#d84a3b";
  if (p.includes("green")) return "#3f9b5a";
  if (p.includes("libert")) return "#d6a52a";
  return "#8a7f72";
};

export function Avatar({ person, size = 64, ring = false }: { person: PersonCard; size?: number; ring?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials = person.name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const style = { width: size, height: size };
  const ringCls = ring ? "ring-2 ring-ink" : "";
  if (person.photoUrl && !failed) {
    return (
      <img
        src={person.photoUrl}
        alt={person.name}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        style={style}
        className={`shrink-0 rounded-full bg-ink-3 object-cover object-top ${ringCls}`}
      />
    );
  }
  return (
    <div
      aria-label={person.name}
      style={{ ...style, background: `linear-gradient(135deg, ${partyTone(person.party)}55, #2b2420)` }}
      className={`grid shrink-0 place-items-center rounded-full font-display font-semibold text-paper ${ringCls}`}
    >
      <span style={{ fontSize: size * 0.36 }}>{initials}</span>
    </div>
  );
}
