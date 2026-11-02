# Vote Oracle

A web app that helps a California voter make an informed choice on every race and proposition on the **November 3, 2026** general election ballot.

Live: https://vote-oracle.vercel.app (passcode-protected)

## How it works

1. **Residency check:** "Are you a California resident?" A "no" ends the session. Nothing is cached, so a refresh starts over.
2. **Swipe interview:** 53 swipe-style cards, each with a photo. They are written to be nuanced rather than obviously partisan, and they cover eight areas plus voting strategy (conviction versus picking the lesser of two evils). Controls are swipe, the buttons, or the arrow keys.
3. **Priorities:** you can pick up to 3 issues to weigh more heavily.
4. **Where you vote:**
   - A **ZIP code** is enough. If your ZIP spans more than one district, the app shows the alternatives with candidate names, and you can switch.
   - A street address is optional. It gives exact districts, using the free U.S. Census geocoder.
5. **The Oracle:** a loading screen with a live research feed while an LLM:
   - matches your answers against every candidate and proposition,
   - pulls cited live research for thin races and local contests.
6. **Results:**
   - an "archetype" for your views and a chart of your leanings,
   - a pick for each race with candidate photos and a 1–2 line reason,
   - Yes/No on each proposition,
   - local contests and measures,
   - a print view.

   Email delivery is shown but disabled ("Coming soon").

There are no accounts, and all state lives in memory, so a refresh starts over. Neither your address nor your answers are stored.

## Stack

| Piece | What |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, `motion` for swipes |
| AI | AI SDK 7 via **Vercel AI Gateway** (OIDC auth); default model `deepseek/deepseek-v4.1-flash`, falls back to `anthropic/claude-haiku-5.5` if output is incomplete. Strict zod structured output. |
| Research | [treg](https://treg.to) `exa.web.answer` (cited web answers), cached 6h in Vercel Runtime Cache |
| Districts | Offline point-in-polygon on simplified GeoJSON. U.S. House: Prop 50 / AB 604 map. State Senate and Assembly: 2021 Citizens Redistricting Commission (CRC) maps. Board of Equalization: 2021 CRC map. |
| ZIP lookup | `src/data/zips.json`: population share of each CA ZIP across districts, counties and cities, built from 2020 census blocks |
| Protection | Passcode gate (HMAC cookie, 30 days) enforced in `src/proxy.ts`; per-IP rate limits on every API route |

## Project layout

```
src/app/            pages (/, /unlock, /credits) and API routes (ballot, analyze, unlock, email)
src/components/     Oracle stage machine + each screen (Gate, SwipeDeck, AddressStep, Analyzing, ResultsView, …)
src/lib/
  questions.ts      the 53 questions, axes, scoring
  ballot.ts         geocoding, ZIP lookup, district matching, ballot assembly
  analyze.ts        prompt, model calls, fallback, output cleanup
  research.ts       treg research + caching
  passcode.ts, ratelimit.ts, validate.ts, email.ts
src/data/           statewide races & props, district maps, district candidates, ZIP table, image credits
public/questions/   openly licensed question photos (see /credits)
scripts/            data rebuild scripts (below)
```

## Running locally

```bash
pnpm install
vercel link            # once, to the williampsmiths-projects/vote-oracle project
vercel env pull        # writes .env.local, including VERCEL_OIDC_TOKEN for AI Gateway
pnpm dev
```

`VERCEL_OIDC_TOKEN` expires after about 12 hours; re-run `vercel env pull` when AI calls start failing locally. In dev, the analyze rate limit is off, and an `x-oracle-model` header can override the model.

### Environment variables

| Name | Required | Purpose |
|---|---|---|
| `APP_PASSCODE` | optional | Site passcode. If set, visitors must enter it; if unset, the site is open. |
| `TREG_TOKEN` | optional | Enables live research and local contests. Without it, picks use the bundled data only. |
| `ORACLE_MODEL` / `ORACLE_FALLBACK_MODEL` | optional | Override the primary and fallback AI Gateway models |
| `ORACLE_DEBUG` | optional | Log raw model output |
| `RESEND_API_KEY`, `EMAIL_FROM` | not yet used | For the planned email feature |

## Deploying

```bash
vercel deploy --prod
```

## Rebuilding data

- **District maps:** `bash scripts/build-districts.sh` downloads the official shapefiles and simplifies them with mapshaper. `node scripts/check-districts.mjs` spot-checks known addresses.
- **District candidates:** `node scripts/build-candidates.mjs` parses the June 2026 primary finalists from Wikipedia and flags disagreements under `_verify`.
- **ZIP table:** `node scripts/build-zips.mjs <workdir>`. The header of the script lists the Census files and the mapshaper commands that prepare them. Re-run it whenever the district maps change.
- **Statewide races and propositions:** edit `src/data/statewide.json`.

## Costs

- AI Gateway usage is billed per token. DeepSeek V4.1 Flash costs a fraction of a cent per reading.
- treg research costs about $0.005 per call, with a few calls per reading.
- Rate limits: 1 reading per minute and 4 per hour per IP.

## License

Code is released under the [MIT License](LICENSE).

The question photos in `public/questions/` are not covered by the MIT License. Each keeps its own license (mostly CC BY-SA and CC BY), and full attribution is in `src/data/image-credits.json` and on the `/credits` page.
