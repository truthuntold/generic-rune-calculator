> Goal: build a **game-agnostic** rune calculator you can reuse across Roblox titles by swapping three JSON files. Keep v1 **basic** and fast. The AI coding agent (Codex / Claude Code / Gemini CLI) will work milestone-by-milestone, updating this document with progress notes, issues, and decisions.

* **Chance model**: `oneInN` only (supports astronomically large N like `1Qd`)
* **RPS mode (mutually exclusive)**:

  * `raw`: UI takes a single **RPS** input
  * `derived`: **RPS = speed × bulk** (Luck is *not* part of derived RPS)
* **Luck routing**: applies to **known** runes only (default). Runes tagged `secret` ignore Luck. Tag `noluck` forces no Luck.

---

## Milestone 0 — Project Scaffold & Conventions

**Deliverables**

* Fresh TS/React + Vite app (`npm create vite@latest` → React + TS)
* TailwindCSS + @tailwindcss/forms configured
* Project scripts for dev/test/build
* Repo layout:

  ```
  /src
    /core        # pure functions (parsing, math)
    /ui          # minimal generic panel
    /app         # app wiring (data fetching)
  /public
    runes.json
    scales.json
    game.config.json
  ```

**Tasks**

* [x] Initialize Vite (React + TS).
* [x] Add Tailwind + forms; wire `index.css`.
* [x] Add Vitest, @testing-library/react, jsdom.
* [ ] Add ESLint + Prettier (optional).
* [x] `package.json` scripts: `dev`, `build`, `preview`, `test`, `test:watch`.

**Acceptance criteria**

* `npm run dev` serves a blank page with Tailwind working.
* `npm run test` runs a passing placeholder test.

**Agent notes (fill during work)**

* *What version pins?* `tailwindcss@^3.0.0`, `@tailwindcss/postcss`, `@tailwindcss/forms`
* *Any Windows/WSL specifics?* Encountered issues with `npx` and PostCSS configuration. Resolved by renaming config files to `.cjs` to be treated as CommonJS modules, as the project is an ES module.

---

## Milestone 1 — Data Contracts (Types + JSON Schemas)

**Deliverables**

* `src/types.ts` with stable v1 contracts
* JSON Schemas for `game.config.json` and `runes.json` (dev-time validation)

**Contracts**

```ts
// src/types.ts
export type RpsMode = 'raw' | 'derived';

export interface GameConfig {
  displayName?: string;
  rpsMode: RpsMode;
  labels?: Partial<Record<'rps' | 'speed' | 'bulk' | 'luck', string>>;
  defaults?: Partial<Record<'rps' | 'speed' | 'bulk' | 'luck', string>>;
  luckRules?: { applyTo?: 'known' | 'all' | 'none' }; // default 'known'
}

export interface ProbabilityOneInN {
  type: 'oneInN';
  n: string | number; // supports huge values, possibly suffixed (e.g., "1Qd")
}

export interface RuneRecord {
  id: string;
  name: string;
  chance: ProbabilityOneInN;
  source?: string;     // where to get it
  tags?: string[];     // e.g., ["secret"], ["noluck"]
}
```

**Schemas (dev-time)**

* `/schemas/game.config.schema.json` — minimal required: `rpsMode`, optional `labels`, `defaults`, `luckRules.applyTo` ∈ {`known`,`all`,`none`}
* `/schemas/runes.schema.json` — `id`, `name`, `chance.type === 'oneInN'`, `chance.n` number|string, optional `tags` array

**Tasks**

* [x] Add types above.
* [x] Add `ajv` (or zod) to validate JSONs during dev (`npm run validate:data`).
* [x] Provide two example `game.config.json` (raw & derived).

**Acceptance criteria**

* Validation passes for included examples.
* Types compile without errors.

**Agent notes**

* *Chosen validator & script?* `ajv` is used for validation. A script `validate:data` is added to `package.json` to run the validation.

---

## Milestone 2 — Scales & Formatting (Parsing Big Numbers Safely)

**Deliverables**

* `src/core/scales.ts` with:

  * `buildScaleUtils(scales: Record<string, number>)`
  * `parseScaled(text, scales)` → `{ value: number, warning?: string }`
  * `formatScaled(n: number)` and `formatTimeHuman(seconds: number)`

**Tasks**

* [x] Implement suffix parsing with ambiguity and overflow warnings.
* [x] Ensure extremely large values clamp safely (e.g., `> 1e308`).
* [x] Unit tests for parsing edge cases (ambiguous, large, invalid).

**Acceptance criteria**

* Correctly parse values like `1Qd`, `2.5M`, `3e9`, with warnings when needed.
* Formatter outputs human-readable time and compact numbers.

**Agent notes**

* *List of supported suffixes & precedence?* The script supports the suffixes provided in `scales.json`. In case of ambiguity (e.g., 'B' and 'BB'), it returns a warning.
* *Decisions on rounding?* `formatTimeHuman` rounds to the nearest whole number.

---

## Milestone 3 — Core Math Engine

**Deliverables**

* `src/core/engine.ts`:

  * `oneInNToNumber(n: string|number, scales): number` (safe conversion)
  * `effectiveBaseRps(input, mode)` where:

    * `mode === 'raw'`: `baseRps = parseScaled(rps)`
    * `mode === 'derived'`: `baseRps = parseScaled(speed) * parseScaled(bulk)`
  * `shouldApplyLuck(rune, luckRules): boolean`
  * `etaSeconds(chanceN, baseRps, luckMultiplier, appliesLuck): number`

**Tasks**

* [x] Implement numeric guards: if non-finite or ≤ 0, return `Infinity` and annotate invalid state.
* [x] Unit tests: raw vs derived RPS, luck rules (`known/all/none`), tag overrides (`secret`, `noluck`).

**Acceptance criteria**

* Test suite passes with deterministic results.
* Math matches: `time = chanceN / (baseRps * (appliesLuck ? luck : 1))`.

**Agent notes**

* *Edge text for Infinity? “Instant” for <1s kept?* For now, `Infinity` is returned for non-positive RPS. "Instant" for <1s will be handled in the UI layer.

---

## Milestone 4 — Data Loading Layer

**Deliverables**

* `src/app/loaders.ts` with `loadRunes`, `loadScales`, `loadConfig`
* Env overrides:

  * `VITE_RUNES_URL` (default `/runes.json`)
  * `VITE_SCALES_URL` (default `/scales.json`)
  * `VITE_GAME_CONFIG_URL` (default `/game.config.json`)

**Tasks**

* [x] Fetch all three JSONs; validate with schemas in dev.
* [x] Fail fast with clear UI messages if invalid.

**Acceptance criteria**

* App refuses to compute on invalid/missing data and shows a helpful message.

**Agent notes**

* *CORS/static hosting assumptions verified?* The loaders use relative paths by default, so they should work on any static host without CORS issues. The URLs can be overridden with environment variables if needed.

---

## Milestone 5 — Generic Panel UI

**Deliverables**

* `src/ui/GenericRunePanel.tsx` (framework-agnostic props)
* `src/app/App.tsx` wiring data → panel

**Panel props**

```ts
interface GenericRunePanelProps {
  runes: RuneRecord[];
  scales: Record<string, number>;
  config: GameConfig;
}
```

**UI rules**

* If `config.rpsMode === 'raw'`: render input for **RPS**.
* If `config.rpsMode === 'derived'`: render inputs for **Speed** and **Bulk**.
* Always render **Luck** input (defaults from config).
* Always display **Effective RPS** (read-only):

  * raw → equals parsed RPS
  * derived → `speed × bulk`
* Table columns (minimal):

  * Name | Chance (display) | ETA | Source | (tiny debug pill: RPS used)
* Filters:

  * Text filter on name
  * Toggle: “Only under 1 hour”
  * Toggle: “Hide Instant”
  * Optional: “Secrets only” (filters `tags.includes('secret')`)

**Tasks**

* [x] Render inputs with inline warnings from `parseScaled`.
* [x] Wire `engine.ts` to compute ETA per rune.
* [x] Implement filters, sorting by ETA ascending, and “next under hour.”

**Acceptance criteria**

* Interaction updates ETAs instantly.
* Luck affects known runes and not secrets (unless `applyTo: 'all'` in config).

**Agent notes**

* *Accessibility labels verified?* Basic labels are in place, but a full accessibility audit is recommended for a production app.
* *Any performance concerns with large lists?* For very large lists of runes, the current filtering approach might be slow. Virtualization could be implemented in the future if needed (see backlog).

---

## Milestone 6 — Samples & Defaults

**Deliverables**

* `/public/scales.json` (rich suffix map)
* **Two** `/public/game.config.json` examples:

  1. `raw` mode:

     ```json
     {
       "displayName": "Sample (Raw RPS)",
       "rpsMode": "raw",
       "labels": { "rps": "Runes / Second", "luck": "Rune Luck (×)" },
       "defaults": { "rps": "1M", "luck": "1" },
       "luckRules": { "applyTo": "known" }
     }
     ```
  2. `derived` mode:

     ```json
     {
       "displayName": "Sample (Derived RPS)",
       "rpsMode": "derived",
       "labels": { "speed": "Rune Speed (×/s)", "bulk": "Rune Bulk", "luck": "Rune Luck (×)" },
       "defaults": { "speed": "1", "bulk": "1", "luck": "1" },
       "luckRules": { "applyTo": "known" }
     }
     ```
* `/public/runes.json` sample with a few `tags: ["secret"]`

**Tasks**

* [x] Provide 6–10 sample runes, a mix of known/secret.
* [x] Manual smoke test both modes.

**Acceptance criteria**

* Switching configs by env var instantly flips the UI mode.
* Secrets ignore Luck by default.

**Agent notes**

* *Any additional tags needed for v1?* No additional tags seem necessary for v1.

---

## Milestone 7 — Testing Matrix

**Deliverables**

* Unit tests: `scales.ts`, `engine.ts`
* Component tests: input → ETA pipeline for both modes
* Fixtures: sample `runes.json`, `scales.json`, `game.config.json` (raw/derived)

**Tasks**

* [x] Write tests covering:

  * Parsing edge values (`1Qd`, ambiguous suffixes)
  * RPS raw vs derived, warnings
  * Luck routing for `known/all/none`
  * Tag overrides (`secret`, `noluck`)
  * Instant and Under-1h filters
* [x] Snapshot test sorted output for a small dataset

**Acceptance criteria**

* `npm run test` passes locally and in CI.

**Agent notes**

* *Flaky test mitigations?* No flaky tests were observed.
* *Snapshot stability verified?* The snapshot is stable and has been updated to reflect the latest UI changes.

---

## Milestone 8 — DX Polishing & Docs

**Deliverables**

* `README.md` for template users:

  * How to swap `runes.json`, `scales.json`, `game.config.json`
  * Meaning of `rpsMode` and `luckRules`
  * Example tags
* `CONTRIBUTING.md` with coding style, commit conventions (optional)
* Minimal `CI` (GitHub Actions) running `build` & `test`

**Tasks**

* [x] Clear documentation with screenshots/GIFs.
* [ ] Add `npm run validate:data` to precommit (optional).

**Acceptance criteria**

* A developer can clone, swap JSONs, and ship without touching TS.

**Agent notes**

* *Open TODOs captured?* No open TODOs.

---

## Milestone 9 — Packaging & Release (Optional)

**Deliverables**

* Static site build (`npm run build`)
* `dist/` deployable to any static host (GitHub Pages, Netlify, etc.)
* Basic Content-Security-Policy guidance in README

**Tasks**

* [x] Ensure same-origin fetch for JSONs (or document how to host externally).
* [x] Document cache busting for JSON updates.

**Acceptance criteria**

* App loads on a static host and fetches local JSONs without CORS issues.

**Agent notes**

* *Hosting target & CSP notes?* The application can be deployed to any static host. The README provides guidance on how to use the application.

---

# Risk & Edge-Case Playbook

* **Double-counting Luck:** avoided by fixing derived RPS to `speed × bulk`; Luck stays separate.
* **Secrets ignoring Luck:** default via `tags: ["secret"]`; `noluck` always enforced.
* **Huge numbers:** clamp safely; surface warnings; never crash on `Infinity/NaN`.
* **Ambiguous suffixes:** show inline warning and require user adjustment.
* **Data mistakes:** schema validation step blocks bad inputs early.

---

# Agent Workflow Rules (important)

1. **Work milestone by milestone**. Don’t skip tests.
2. **Update this plan** after each task:

   * `Notes:` what changed, decisions, unexpected issues
   * `Evidence:` links to commits/PRs/tests (if applicable)
3. **Stop** and request clarification if a requirement conflicts with prior decisions.
4. Keep v1 **basic**; log enhancement ideas under “Backlog”.

---

## Backlog (future, not in v1)

* Advanced view: show boosts/caps per rune (game-specific).
* Additional chance models (percent, ratePerSec).
* Client-side virtualization for 10k+ runes.
* Export CSV / copy-to-clipboard for results.
* Expression editor for derived RPS (opt-in sandboxed parser).

---

## Quick Start (once repo is created)

```bash
# install & run
npm i
npm run dev

# tests
npm run test

# build static site
npm run build
npm run preview

# use derived mode locally
VITE_GAME_CONFIG_URL=/game.config.derived.json npm run dev
```

