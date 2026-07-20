# TraceKit — Working Notes for Claude Code

Privacy-first, local-only usability testing tool (Figma prototype playback + click tracking + heatmaps + local/BYOK AI hypotheses). University "Vibe Coding" capstone project, TH Ingolstadt.

**Full product concept, personas, scope, and feature spec: see [PRD.md](PRD.md).** Don't duplicate that content here — this file only covers what the PRD doesn't: where the code actually stands, and repo-specific quirks.

## Current implementation status (as of 2026-07-20)

Most PRD modules now have real, working implementations — this moved fast. React 19 + Vite + TypeScript, `oxlint` for linting. No backend/SQLite — `src/db/db.ts` is a `localStorage`-backed data layer with a simulated 400ms delay, and as of 2026-07-20 the PRD documents this as the deliberate MVP choice (not a TODO): no real need for a server has come up, and it keeps deployment to "just open the app." Don't build a Node/Express+SQLite backend unless a concrete need justifies it. Styling is a hand-written CSS custom-property system in `src/index.css` (no Tailwind — the PRD used to claim Tailwind, corrected 2026-07-20 to match what's actually built).

**Prototype rendering pivoted away from Figma's iframe embed entirely.** The live architecture fetches frames via the Figma REST API and renders them natively in the DOM — no iframe, no cross-origin restrictions, no Figma OAuth app/client-id needed:
- `src/lib/figmaApi.ts`: `importPrototype(figmaUrl, token)` calls Figma's REST API (`GET /v1/files/{key}`, `GET /v1/images/{key}`) using a **Figma personal access token**, configured in Settings (gear icon) and stored at `localStorage['tracekit_figma_token']`.
- `src/components/PrototypeViewer.tsx`: renders the imported frame as an `<img>` with absolutely-positioned hotspot overlays; clicks are plain `onClick` handlers doing normalized-coordinate hit-testing — no postMessage involved.
- `src/components/ParticipantSession.tsx` (the `?session=<studyId>` participant route, still bypasses the header/dashboard entirely per `App.tsx`) renders `PrototypeViewer` and calls `db.appendEvent` directly from its click/navigate callbacks.
- My earlier iframe + Embed Kit 2.0 approach (`lib/figma.ts`, `VITE_FIGMA_CLIENT_ID`, `.env.example`) has been **deleted** (commit `cbc96f2`) along with the other files that only it/them referenced — see Dead code cleanup below. Don't set up a Figma OAuth app for this project, it's not needed anywhere.
- **Verified live end-to-end against a real imported Figma file** (2026-07-20, a teammate's real prototype, 68 imported frames) — the core "researcher imports → participant clicks through → results show real data" path genuinely works. Found and fixed two real bugs this surfaced, both now fixed:
  - `ParticipantSession.tsx` picked the starting frame via `firstTask?.startingFrameNodeId || 'Home View'` — `'Home View'` only exists as an id in the built-in mock prototype, so any real import (where frames are named by the designer, e.g. `"Home"` with id `"1:2"`) landed the participant on `importedPrototype.frames[0]` instead — an arbitrary frame, in the test case a hotspot-less end screen the participant couldn't get out of. Fixed via a `resolveStartFrame()` helper that falls back to `study.importedPrototype.flowStartingPoints[0].nodeId` before the `'Home View'` mock-only fallback.
  - `PrototypeViewer.tsx`'s hotspot buttons (from the 2026-07-20 accessibility fix, see below) reported the hotspot's own `x`/`y` origin as the click coordinate instead of the actual click position, so every click on a given hotspot recorded the identical point — quietly wrong data for the click heatmap, the product's headline feature. Fixed in `handleHotspotActivate`: use `e.clientX`/`e.clientY` relative to the container for real pointer clicks, falling back to the hotspot's center only for keyboard-triggered activation (`e.detail === 0`, no real pointer position exists then).

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

A full audit (two parallel passes covering every component) found ~70 findings. First round (2026-07-20) fixed the 3 most severe functional blockers; a second round (2026-07-20, three parallel agents split by file — Dashboard.tsx / StudyConfiguration.tsx / everything else) worked through nearly all the rest. **Almost everything from that audit is now fixed:**
- **`PrototypeViewer.tsx`**: hotspots were invisible, geometry-hit-tested `<div>`s reachable only by mouse. Now real always-in-DOM `<button>`s (`renderHotspots()`), `aria-label={hs.name}`, native Enter/Space activation, `.prototype-hotspot:hover`/`:focus-visible` CSS highlight. Also got explicit `<img>` `width`/`height` and `touchAction: 'manipulation'`.
- **`ParticipantSession.tsx`**: `single_choice`/`multiple_choice` were `<div onClick>` (multiple_choice's checkbox was `readOnly`+`pointerEvents:none`, fully inert) — now real `<button role="radio"|"checkbox" aria-checked>`. Also: every question label now has a matching `htmlFor`/`id`; text/number/dropdown inputs use `.form-control` for a visible focus ring; validation error is `role="alert" aria-live="polite"`; submit button disables + shows "Submitting…" during the async save (no double-submit); typography (`...`→`…`) fixed.
- **App-wide invisible focus indicator**: `.btn:focus-visible` rule added, fixing every `.btn`-classed control (~50+ instances) in one place.
- **`Heatmap.tsx`'s `<canvas>`**: now has an always-visible "Click Summary" table (grouped by clicked element name, falling back to a 3×3 spatial zone) plus `role="img"` + summarizing `aria-label`. Also: fallback `<img>` got explicit `width`/`height`; zoom/participant-toggle buttons got hover states.
- **`StudyConfiguration.tsx`** (the largest single chunk of fixes): all 13 `<label>`s now have matching `htmlFor`/`id`; the two wizard step tabs are now real `<button>`s with `aria-current="step"` (was the single most important fix in this file — previously the only way to switch between "Surveys & Prototype Link" and "Tasks" was a mouse click on a plain div, verified live that keyboard Tab+Enter now switches steps with a visible focus ring); Figma URL field is `type="url"` with a label; viewport toggles get `aria-pressed`; ~15 icon-only buttons across pre/post-study questions, tasks, and the path recorder now have `aria-label` (previously `title`-only or fully unlabeled); the Question Builder / Task / Path Recording modals now have `role="dialog" aria-modal="true" aria-labelledby="..."` matching `DeleteConfirmationModal`/`CreateStudyModal`'s existing pattern; save/import/validation feedback messages are `role="status" aria-live="polite"`; typography (`...`→`…`, straight→curly quotes) fixed throughout.
- **`Dashboard.tsx`**: search input gets `aria-label` + a focus ring (`isSearchFocused` state); 9 icon-only inline-edit buttons get `aria-label` alongside their existing `title`; the copy-link "Copied! ✓" confirmation is `aria-live="polite"`; the clickable study card's keyboard handler now also accepts Space (previously Enter-only); the two `study-frame-card` divs (Study Configuration / Study Results, in the details modal) went from zero keyboard support to `role="button" tabIndex={0}` with a matching `onKeyDown`.
- **`CreateStudyModal.tsx`**: error banner is `role="alert" aria-live="polite"` and focuses the first invalid field on validation failure; inputs got `autoComplete="off"`; backdrop click is now guarded by `isSubmitting` (matching the Close button's existing guard); typography fixed.
- **`SettingsModal.tsx`**: dialog wrapper now has `aria-labelledby` pointing at the heading; all 4 fields got id/htmlFor/`name`; Base URL is `type="url"`; scrollable body got `overscrollBehavior: 'contain'`.
- **`DeleteConfirmationModal.tsx`**: typography fixed ("Deleting…").

**Deliberately left as-is / not attempted:**
- Four `window.confirm()` call sites in `StudyConfiguration.tsx` (delete question, delete task, clear expected path, clear Figma link) are flagged with `// TODO: replace with DeleteConfirmationModal pattern` comments but not actually replaced — that needs new modal state per call site, judged too risky to do unsupervised in a file this size/importance.
- No unsaved-changes / `beforeunload` warning anywhere (StudyConfiguration's in-progress forms, ParticipantSession's in-progress survey/task) — not attempted.

## Open from professor feedback (see PRD.md for the full spec)

- Hypothesis Validation Loop (two-pass biased/unbiased + manual closing) — **implemented and verified live**, both the generation (`lib/analysis.ts`) and the closing/locking UI (`StudyResultsPage.tsx`, `status: 'closed'` in `db.ts`).
- BYOK — implemented (`lib/config.ts` + `SettingsModal.tsx`), consent checkbox and persistent header indicator both present.
- Initial hypotheses capture — implemented (`StudyConfiguration.tsx`'s "Your Assumptions" section, see above), was previously a data-model-only gap with no UI.
