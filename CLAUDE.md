# TraceKit — Working Notes for Claude Code

Privacy-first, local-only usability testing tool (Figma prototype playback + click tracking + heatmaps + local/BYOK AI hypotheses). University "Vibe Coding" capstone project, TH Ingolstadt.

**Full product concept, personas, scope, and feature spec: see [PRD.md](PRD.md).** Don't duplicate that content here — this file only covers what the PRD doesn't: where the code actually stands, and repo-specific quirks.

## Current implementation status (as of 2026-07-20)

Most PRD modules now have real, working implementations — this moved fast. React 19 + Vite + TypeScript, `oxlint` for linting, no backend/SQLite yet (`src/db/db.ts` is still a `localStorage`-backed mock with a simulated 400ms delay). Styling is a hand-written CSS custom-property system in `src/index.css` (no Tailwind — the PRD used to claim Tailwind, corrected 2026-07-20 to match what's actually built).

**Prototype rendering pivoted away from Figma's iframe embed entirely.** The live architecture fetches frames via the Figma REST API and renders them natively in the DOM — no iframe, no cross-origin restrictions, no Figma OAuth app/client-id needed:
- `src/lib/figmaApi.ts`: `importPrototype(figmaUrl, token)` calls Figma's REST API (`GET /v1/files/{key}`, `GET /v1/images/{key}`) using a **Figma personal access token**, configured in Settings (gear icon) and stored at `localStorage['tracekit_figma_token']`.
- `src/components/PrototypeViewer.tsx`: renders the imported frame as an `<img>` with absolutely-positioned hotspot overlays; clicks are plain `onClick` handlers doing normalized-coordinate hit-testing — no postMessage involved.
- `src/components/ParticipantSession.tsx` (the `?session=<studyId>` participant route, still bypasses the header/dashboard entirely per `App.tsx`) renders `PrototypeViewer` and calls `db.appendEvent` directly from its click/navigate callbacks.
- My earlier iframe + Embed Kit 2.0 approach (`lib/figma.ts`, `VITE_FIGMA_CLIENT_ID`, `.env.example`) has been **deleted** (commit `cbc96f2`) along with the other files that only it/them referenced — see Dead code cleanup below. Don't set up a Figma OAuth app for this project, it's not needed anywhere.

**AI / hypothesis loop is implemented and verified working end-to-end against a real local Ollama, not just spec'd:**
- `src/lib/config.ts`: `AiProviderConfig` (Ollama vs. OpenAI-compatible BYOK) persisted to localStorage, configured via `SettingsModal.tsx`, incl. the external-provider consent checkbox and the header's "External AI Active" indicator (`App.tsx`, driven by a `window` `ai-config-changed` event). **Default model is `llama3.2:1b`, not `llama3`** — deliberately small (1.3GB) so it's usable on modest hardware (an 8GB RAM dev machine couldn't get a response from the 8B `llama3` within 2 minutes, presumably heavy swapping; `llama3.2:1b` responds in ~5-10s on the same machine). Bigger models are still one Settings change away for anyone with the RAM.
- `src/lib/ai.ts`: `generateFromAi()` branches Ollama `/api/generate` vs. OpenAI-compatible `/v1/chat/completions`.
- `src/lib/analysis.ts`: `runAnalysisLoop()` — a real two-pass implementation matching PRD § 5/6 (Pass 1 biased: evaluates open hypotheses against data; Pass 2 unbiased: discovers new ones, deduped against existing). Results persist via `db.saveHypotheses`/`getHypothesesByStudy`. Triggered from a "Run AI Analysis Loop" button in `StudyResultsPage.tsx`. **Verified live** (2026-07-20): ran the real button against real Ollama with synthetic session data — Pass 1 correctly confirmed a seeded hypothesis at 80% confidence, Pass 2 discovered 4 new ones, closing/locking (`status: 'closed'`, "Lock & Close" button once confidence > 80%) all present in `StudyResultsPage.tsx`.
- `StudyConfiguration.tsx` now has a "Your Assumptions (Optional)" textarea section (added 2026-07-20, above the Pre-Study Questions section) writing to `study.initialHypotheses` — previously this field existed in the data model and `analysis.ts` read it, but nothing in the UI could ever set it. Newline-separated, matches `analysis.ts`'s parsing exactly.

**Survey/task data model landed in `db.ts`:** `Study` gained `initialHypotheses`, `preSurveyQuestions`, `postSurveyQuestionsMode`/`postSurveyStandardizedKeys` (SUS/UEQ/UMUX-Lite/NASA-TLX built in) /`postSurveyQuestions`, `tasks: StudyTask[]`, `importedPrototype`. New types: `SurveyQuestion`, `SurveyResponse`, `StudyTask`, `ClickedElement`, `RecordedPath`, `Hypothesis`. My `Session`/`TrackedEvent`/`createSession`/`appendEvent`/`endSession`/`getSessionsByStudy` are all still present and still how click/navigation events get stored.

**Navigation (`App.tsx`, still no router, `view` useState):** `dashboard` → `CreateStudyModal` (a modal, not a page) for creation → `configure-study` (`StudyConfiguration.tsx`, now a ~3300-line multi-step wizard covering pre/post survey, prototype import, and task configuration) → `study-results` (`StudyResultsPage.tsx`). `?session=<id>` in the URL still bypasses all of this for participants.

## Dead code cleanup done on 2026-07-20 (commit `cbc96f2`)

These are gone now, not just "dead but present" — don't go looking for them: `StudyDesignPage.tsx`, `CreateStudyPage.tsx`, `lib/useClickTracking.ts`, `ClickTrackingOverlay.tsx`, `lib/figma.ts`, `vite-env.d.ts`, `.env.example`, `CLICK_TRACKING_README.md`, `FIGMA_EMBED_CONTRACT.md`, two stray `.DS_Store` files. All were unreachable from `App.tsx`'s actual navigation (superseded by `StudyConfiguration`/`CreateStudyModal`/`PrototypeViewer`) or documented an abandoned approach. `App.tsx`'s `View` type shrank to `'dashboard' | 'configure-study' | 'study-results'` accordingly.

Still present from before that: **`src/components/EditStudyModal.tsx` and `src/components/CreateStudyPlaceholder.tsx`** remain unimported dead code, not yet cleaned up.

## Duplication cleanup (fixed 2026-07-20)

`getEmbedUrl`/`isValidFigmaUrl` and the participant-link URL builder were each duplicated between `Dashboard.tsx` and `StudyConfiguration.tsx`. Consolidated into `src/lib/links.ts` (`getEmbedUrl`, `isValidFigmaUrl`, `getParticipantLink`), imported by both. The "Copy Participant Link" UI itself is still two separate implementations (Dashboard's is a readonly input + copy button, StudyConfiguration's is just a button) — only the URL-building logic was shared, not the JSX, since the presentations are intentionally different.

## Conventions observed so far

- Data access goes through the `db` object in `src/db/db.ts` — components don't touch `localStorage` directly.
- Components use inline `style={{}}` alongside a handful of global classes (`btn`, `btn-primary`, `study-card`, etc.) defined in `src/index.css`, not CSS modules or Tailwind utilities.
- `lucide-react` is the icon set in use.
- No router library — `?session=` is read directly via `window.location.search` in `App.tsx`. Don't reach for `react-router` for a single param.

## Testing (added 2026-07-20)

There was no automated test suite at all before this — two real regressions in this project's history (a broken study-creation flow, several orphaned files after a large parallel merge) went unnoticed until manually caught. `npm run test` (Vitest, `jsdom` environment, config in `vite.config.ts`'s `test` block) now covers the two most fragile/most-reused modules:
- `src/db/db.ts` → `db.test.ts`: study CRUD, session/event lifecycle, hypothesis save-and-merge semantics.
- `src/lib/analysis.ts` → `analysis.test.ts`: the two-pass loop, with `lib/ai.ts`'s `generateFromAi` mocked (`vi.mock('./ai', ...)`) so tests don't hit a real Ollama/network — covers seeding from `initialHypotheses`, not re-seeding on rerun, Pass 1 merge, Pass 2 discovery, closed-hypotheses exclusion, and persistence.

**Not covered yet, worth adding next if you're extending this:** any React component (Dashboard, StudyConfiguration, StudyResultsPage, ParticipantSession, PrototypeViewer), `lib/figmaApi.ts`'s response parsing, `lib/ai.ts`'s two fetch branches. This is a starting foundation, not full coverage — when you touch one of the untested files, consider adding a test alongside the change rather than treating the gap as permanent.

## Accessibility (audited 2026-07-20 against the Vercel Web Interface Guidelines)

A full audit (two parallel passes covering every component) found ~70 findings — full triage happened in chat, not persisted verbatim, but the three most severe ones (functional blockers, not polish) are **fixed**:
- **`PrototypeViewer.tsx`**: hotspots were invisible, geometry-hit-tested `<div>`s reachable only by mouse. Now real always-in-DOM `<button>`s (`renderHotspots()`), `aria-label={hs.name}`, native Enter/Space activation, `.prototype-hotspot:hover`/`:focus-visible` CSS highlight (was previously only a 500ms mouse-miss flash). Verified live: Tab-focus shows the highlight, Enter navigates exactly like a click.
- **`ParticipantSession.tsx`**: `single_choice`/`multiple_choice` survey questions were `<div onClick>` (the multiple_choice checkbox was `readOnly`+`pointerEvents:none`, fully inert) — keyboard users could not answer them. Now real `<button role="radio"|"checkbox" aria-checked>` with a `.survey-option-btn` class for focus styling. `yes_no` and `rating` question types already used real `<button>`s and needed no change.
- **App-wide invisible focus indicator**: `.btn` in `index.css` set `outline: none` with zero replacement — added `.btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }`, fixing every `.btn`-classed control (~50+ instances) in one place. (`.form-control` already had a `:focus` box-shadow ring — not zero indicator, just not `:focus-visible`-scoped; left alone.)
- **`Heatmap.tsx`'s `<canvas>` had no non-visual equivalent** (fixed 2026-07-20): added a `clickZoneSummary` computation + always-visible `<table>` under the canvas ("Click Summary (Top N Zones)") grouping clicks by the clicked element's name (`TrackedEvent.nodeId`, threaded through as `HeatmapEvent.label` in `StudyResultsPage.tsx`'s `heatmapData` construction) with count + % of total, falling back to a coarse 3×3 spatial zone (`Top-left`, `Center`, etc.) when no label is available (e.g. `HeatmapDemo.tsx`'s mock data). Canvas itself also got `role="img"` + a summarizing `aria-label`. Verified live with injected session data — table renders correct counts/percentages.

**Not fixed, deliberately scoped out** (ask before assuming any of this is done):
- Zero `aria-live` regions anywhere in the app — every save/import/validation confirmation or error is silent to screen readers (Dashboard, CreateStudyModal, StudyConfiguration, ParticipantSession all affected).
- `StudyConfiguration.tsx`: 0 `htmlFor`/`id` pairs across 13 `<label>`s (labels don't focus their control on click); wizard step tabs (`"Surveys & Prototype Link"` / `"Tasks"`, ~line 836/876) are keyboard-dead `<div onClick>`s; ~15 icon-only buttons with no `aria-label` (rely on `title` or nothing); custom modals (question builder, task modal, path recording) lack `role="dialog"`/`aria-modal`/`aria-labelledby` unlike `CreateStudyModal`/`DeleteConfirmationModal` which do this correctly; several `window.confirm()` calls instead of the app's own confirmation-modal pattern.
- No unsaved-changes / `beforeunload` warning anywhere (StudyConfiguration's in-progress forms, ParticipantSession's in-progress survey/task).
- Typography nits (`...` → `…`, straight quotes → curly) scattered across StudyConfiguration.tsx and elsewhere.
- Dashboard.tsx: search input has no label, several icon buttons rely on `title` only, clickable study-frame-cards have no keyboard handler at all (separate from the wizard-tab issue above).

## Open from professor feedback (see PRD.md for the full spec)

- Hypothesis Validation Loop (two-pass biased/unbiased + manual closing) — **implemented and verified live**, both the generation (`lib/analysis.ts`) and the closing/locking UI (`StudyResultsPage.tsx`, `status: 'closed'` in `db.ts`).
- BYOK — implemented (`lib/config.ts` + `SettingsModal.tsx`), consent checkbox and persistent header indicator both present.
- Initial hypotheses capture — implemented (`StudyConfiguration.tsx`'s "Your Assumptions" section, see above), was previously a data-model-only gap with no UI.
