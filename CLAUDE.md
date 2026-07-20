# TraceKit — Working Notes for Claude Code

Privacy-first, local-only usability testing tool (Figma prototype playback + click tracking + heatmaps + local/BYOK AI hypotheses). University "Vibe Coding" capstone project, TH Ingolstadt.

**Full product concept, personas, scope, and feature spec: see [PRD.md](PRD.md).** Don't duplicate that content here — this file only covers what the PRD doesn't: where the code actually stands, and repo-specific quirks.

## Current implementation status (as of 2026-07-20)

Most PRD modules now have real, working implementations — this moved fast. React 19 + Vite + TypeScript, `oxlint` for linting, no backend/SQLite yet (`src/db/db.ts` is still a `localStorage`-backed mock with a simulated 400ms delay). No Tailwind installed despite the PRD listing it — styling stays a hand-written CSS custom-property system in `src/index.css`.

**Prototype rendering pivoted away from Figma's iframe embed entirely.** The live architecture fetches frames via the Figma REST API and renders them natively in the DOM — no iframe, no cross-origin restrictions, no Figma OAuth app/client-id needed:
- `src/lib/figmaApi.ts`: `importPrototype(figmaUrl, token)` calls Figma's REST API (`GET /v1/files/{key}`, `GET /v1/images/{key}`) using a **Figma personal access token**, configured in Settings (gear icon) and stored at `localStorage['tracekit_figma_token']`.
- `src/components/PrototypeViewer.tsx`: renders the imported frame as an `<img>` with absolutely-positioned hotspot overlays; clicks are plain `onClick` handlers doing normalized-coordinate hit-testing — no postMessage involved.
- `src/components/ParticipantSession.tsx` (the `?session=<studyId>` participant route, still bypasses the header/dashboard entirely per `App.tsx`) renders `PrototypeViewer` and calls `db.appendEvent` directly from its click/navigate callbacks.
- **My earlier iframe + Embed Kit 2.0 approach (`src/lib/figma.ts`'s `getEmbedUrl`/`isValidFigmaUrl`, the `VITE_FIGMA_CLIENT_ID` env var, `.env.example`) is now only used by a page that's no longer reachable (see Dead code below).** If you were mid-setup on a Figma OAuth app for that, it's no longer needed — don't spend more time on it.

**AI / hypothesis loop is implemented, not just spec'd:**
- `src/lib/config.ts`: `AiProviderConfig` (Ollama vs. OpenAI-compatible BYOK) persisted to localStorage, configured via `SettingsModal.tsx`, incl. the external-provider consent checkbox and the header's "External AI Active" indicator (`App.tsx`, driven by a `window` `ai-config-changed` event).
- `src/lib/ai.ts`: `generateFromAi()` branches Ollama `/api/generate` vs. OpenAI-compatible `/v1/chat/completions`.
- `src/lib/analysis.ts`: `runAnalysisLoop()` — a real two-pass implementation matching PRD § 5/6 (Pass 1 biased: evaluates open hypotheses against data; Pass 2 unbiased: discovers new ones, deduped against existing). Results persist via `db.saveHypotheses`/`getHypothesesByStudy`.

**Survey/task data model landed in `db.ts`:** `Study` gained `initialHypotheses`, `preSurveyQuestions`, `postSurveyQuestionsMode`/`postSurveyStandardizedKeys` (SUS/UEQ/UMUX-Lite/NASA-TLX built in) /`postSurveyQuestions`, `tasks: StudyTask[]`, `importedPrototype`. New types: `SurveyQuestion`, `SurveyResponse`, `StudyTask`, `ClickedElement`, `RecordedPath`, `Hypothesis`. My `Session`/`TrackedEvent`/`createSession`/`appendEvent`/`endSession`/`getSessionsByStudy` are all still present and still how click/navigation events get stored.

**Navigation (`App.tsx`, still no router, `view` useState):** `dashboard` → `CreateStudyModal` (a modal, not a page) for creation → `configure-study` (`StudyConfiguration.tsx`, now a ~3300-line multi-step wizard covering pre/post survey, prototype import, and task configuration) → `study-results` (`StudyResultsPage.tsx`). `?session=<id>` in the URL still bypasses all of this for participants.

## Dead code / orphaned files (confirmed unreachable, not just "maybe unused")

Grew a lot this round — check before building on any of these:
- **`src/components/StudyDesignPage.tsx`** — unreachable. `App.tsx`'s `onNavigateToStudyDesign` and `onNavigateToStudyConfiguration` both route to the same `'configure-study'` view now; nothing sets `view` to `'study-design'` anymore. Includes a "Copy Participant Link" box that's therefore also dead.
- **`src/components/CreateStudyPage.tsx`** — unreachable, same issue: nothing sets `view` to `'create-study'`; the Dashboard's "New Study" button opens `CreateStudyModal.tsx` instead.
- **`src/lib/useClickTracking.ts` + `src/components/ClickTrackingOverlay.tsx`** — a parallel click-tracking implementation that was never wired into `ParticipantSession.tsx` (which uses `PrototypeViewer`'s native `onClick` instead). Not imported anywhere outside each other.
- **`CLICK_TRACKING_README.md` and `FIGMA_EMBED_CONTRACT.md`** — document the above orphaned files/approach. Also factually stale even for that abandoned approach: they describe a `NEW_STATE` postMessage event for navigation, but Figma's real Embed API docs (verified 2026-07-18) use `PRESENTED_NODE_CHANGED` for navigation — `NEW_STATE` is a component-variant-change event. Don't trust either doc's event-shape claims.
- **`src/components/EditStudyModal.tsx` and `src/components/CreateStudyPlaceholder.tsx`** — still dead from before, unchanged.
- Two `.DS_Store` files got committed (`.DS_Store`, `src/.DS_Store`) despite `.gitignore` covering `.DS_Store` — they were added in a commit before `.gitignore` existed, so git kept tracking them. Harmless, but `git rm --cached` would clean it up.

## Known duplication (not dead, but drifted from a single source of truth)

- **Three separate "Copy Participant Link" UIs**: `Dashboard.tsx` (in the study details modal), `StudyConfiguration.tsx` (in the prototype section), and the dead one in `StudyDesignPage.tsx`.
- **Three separate `getEmbedUrl`-style functions**: `Dashboard.tsx` (inline), `StudyConfiguration.tsx` (inline, with its own `nodeId` param, doesn't import `lib/figma.ts`), and `src/lib/figma.ts` (the original shared helper, now only consumed by the dead `StudyDesignPage.tsx`). If touching Figma-URL-building logic, check all three, not just `lib/figma.ts`.

## Conventions observed so far

- Data access goes through the `db` object in `src/db/db.ts` — components don't touch `localStorage` directly.
- Components use inline `style={{}}` alongside a handful of global classes (`btn`, `btn-primary`, `study-card`, etc.) defined in `src/index.css`, not CSS modules or Tailwind utilities.
- `lucide-react` is the icon set in use.
- No router library — `?session=` is read directly via `window.location.search` in `App.tsx`. Don't reach for `react-router` for a single param.

## Open from professor feedback (see PRD.md for the full spec)

- Hypothesis Validation Loop (two-pass biased/unbiased + manual closing) — **now implemented**, see `lib/analysis.ts` above. Worth double-checking the "closing"/locking half (marking a hypothesis resolved so it stops resurfacing) actually exists in `analysis.ts`/`db.ts`, since the audit that produced this note confirmed the two-pass generation but didn't specifically verify the close/lock UI.
- BYOK — implemented (`lib/config.ts` + `SettingsModal.tsx`), consent checkbox and persistent header indicator both present.
