import "server-only";
import type { Results } from "./types";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const conf = { strong: "Strong match", lean: "Leans your way", tossup: "Close call" } as const;
const voteColor = { yes: "#0f7b4f", no: "#b4232c", undecided: "#6b6b6b" } as const;

export function renderEmail(r: Results, siteUrl: string) {
  const picks = r.picks
    .map((p) => {
      const photo = p.pick?.photoUrl
        ? `<img src="${esc(p.pick.photoUrl)}" width="56" height="56" alt="" style="border-radius:50%;object-fit:cover;display:block" />`
        : `<div style="width:56px;height:56px;border-radius:50%;background:#efe9df;color:#3b3127;font:600 18px/56px Georgia,serif;text-align:center">${esc((p.pick?.name ?? "—").split(" ").map((w) => w[0]).slice(0, 2).join(""))}</div>`;
      return `<tr><td style="padding:14px 0;border-top:1px solid #eee;vertical-align:top;width:68px">${photo}</td>
<td style="padding:14px 0 14px 4px;border-top:1px solid #eee">
<div style="font:600 11px/1.4 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a7f72">${esc(p.office)}</div>
<div style="font:600 18px/1.3 Georgia,serif;color:#1d1a16;margin-top:2px">${p.pick ? esc(p.pick.name) : "Leave blank"}${p.pick?.party ? ` <span style="font:400 13px Arial,sans-serif;color:#8a7f72">· ${esc(p.pick.party)}</span>` : ""}</div>
<div style="font:400 14px/1.5 Arial,sans-serif;color:#4a4239;margin-top:4px">${esc(p.reason)}</div>
<div style="font:600 11px/1.4 Arial,sans-serif;color:#8a7f72;margin-top:4px">${conf[p.confidence]}</div></td></tr>`;
    })
    .join("");

  const props = r.propositions
    .map(
      (p) => `<tr><td style="padding:12px 0;border-top:1px solid #eee;vertical-align:top;width:68px">
<div style="font:700 12px/1 Arial,sans-serif;color:#fff;background:${voteColor[p.vote]};border-radius:4px;padding:6px 0;width:56px;text-align:center">${p.vote === "undecided" ? "UNSURE" : p.vote.toUpperCase()}</div></td>
<td style="padding:12px 0 12px 4px;border-top:1px solid #eee"><div style="font:600 15px/1.35 Georgia,serif;color:#1d1a16">Prop ${esc(p.number)}: ${esc(p.title)}</div>
<div style="font:400 14px/1.5 Arial,sans-serif;color:#4a4239;margin-top:3px">${esc(p.reason)}</div></td></tr>`,
    )
    .join("");

  const local = r.local
    ? [
        ...r.local.contests.map(
          (c) => `<li style="margin:0 0 8px"><b>${esc(c.office)}:</b> ${c.pick ? esc(c.pick) : "Leave blank"} — ${esc(c.reason)}</li>`,
        ),
        ...r.local.measures.map(
          (m) => `<li style="margin:0 0 8px"><b>${esc(m.name)}${m.title ? ` (${esc(m.title)})` : ""}:</b> ${m.vote.toUpperCase()} — ${esc(m.reason)}</li>`,
        ),
      ].join("")
    : "";

  const axes = r.axes
    .map((a) => {
      const pct = Math.abs(a.score) / 2;
      const left = a.score < 0 ? 50 - pct : 50;
      return `<tr><td style="font:400 12px Arial,sans-serif;color:#8a7f72;padding:6px 8px 6px 0;text-align:right;width:28%">${esc(a.neg)}</td>
<td style="padding:6px 0"><div style="position:relative;height:10px;background:#efe9df;border-radius:5px">
<div style="position:absolute;left:${left}%;width:${pct}%;height:10px;background:#c2410c;border-radius:5px"></div>
<div style="position:absolute;left:50%;top:-3px;width:1px;height:16px;background:#8a7f72"></div></div>
<div style="font:600 11px Arial,sans-serif;color:#3b3127;text-align:center;margin-top:3px">${esc(a.label)}</div></td>
<td style="font:400 12px Arial,sans-serif;color:#8a7f72;padding:6px 0 6px 8px;width:28%">${esc(a.pos)}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e9;padding:24px 12px">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fffdf9;border-radius:16px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<div style="font:600 12px Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#c2410c">Vote Oracle · Nov 3, 2026</div>
<h1 style="font:600 28px/1.2 Georgia,serif;color:#1d1a16;margin:10px 0 6px">${esc(r.archetype.title)}</h1>
<p style="font:400 15px/1.55 Arial,sans-serif;color:#4a4239;margin:0 0 18px">${esc(r.archetype.summary)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${axes}</table>
<h2 style="font:600 20px Georgia,serif;color:#1d1a16;margin:28px 0 4px">Your candidates</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${picks}</table>
<h2 style="font:600 20px Georgia,serif;color:#1d1a16;margin:28px 0 4px">Statewide propositions</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${props}</table>
${local ? `<h2 style="font:600 20px Georgia,serif;color:#1d1a16;margin:28px 0 8px">Local ballot</h2><ul style="font:400 14px/1.5 Arial,sans-serif;color:#4a4239;padding-left:18px">${local}</ul>` : ""}
<p style="font:400 13px/1.5 Arial,sans-serif;color:#8a7f72;margin-top:28px;border-top:1px solid #eee;padding-top:16px">
These are suggestions matched to your answers — not endorsements. Check your official sample ballot from your county registrar and vote your own conscience. Polls are open 7am–8pm on Tuesday, November 3, 2026. Find your polling place or drop box at <a href="https://www.sos.ca.gov/elections/polling-place" style="color:#c2410c">sos.ca.gov</a>.
<br/><br/>Vote Oracle stores nothing about you. <a href="${esc(siteUrl)}" style="color:#c2410c">Take it again</a>.</p>
</td></tr></table></body></html>`;

  const text = [
    `VOTE ORACLE — ${r.archetype.title}`,
    r.archetype.summary,
    "",
    "CANDIDATES",
    ...r.picks.map((p) => `• ${p.office}: ${p.pick ? `${p.pick.name} (${p.pick.party || "nonpartisan"})` : "Leave blank"} — ${p.reason}`),
    "",
    "PROPOSITIONS",
    ...r.propositions.map((p) => `• Prop ${p.number} (${p.title}): ${p.vote.toUpperCase()} — ${p.reason}`),
    ...(r.local
      ? ["", "LOCAL", ...r.local.contests.map((c) => `• ${c.office}: ${c.pick ?? "Leave blank"} — ${c.reason}`), ...r.local.measures.map((m) => `• ${m.name}: ${m.vote.toUpperCase()} — ${m.reason}`)]
      : []),
    "",
    "Suggestions only — check your official sample ballot. Election Day: Tuesday, Nov 3, 2026, 7am–8pm.",
  ].join("\n");

  return { html, text };
}
