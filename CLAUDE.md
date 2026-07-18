# TraceKit — Working Notes for Claude Code

Privacy-first, local-only usability testing tool (Figma embed + click tracking + heatmaps + local AI hypotheses via Ollama). University "Vibe Coding" capstone project, TH Ingolstadt.

**Full product concept, personas, scope, and feature spec: see [PRD.md](PRD.md).** Don't duplicate that content here — this file only covers what the PRD doesn't: where the code actually stands, and repo-specific quirks.

## Current implementation status (as of 2026-07-18)

The codebase is a frontend-only scaffold, well behind the PRD's target stack:

- **Stack in place:** React 19 + Vite + TypeScript, `oxlint` for linting. No Tailwind CSS installed (styling is a hand-written CSS custom-property system in `src/index.css`, e.g. `var(--primary)`, `var(--radius-md)` — despite the PRD listing Tailwind). No backend, no SQLite, no Ollama integration yet.
- **"Database":** `src/db/db.ts` is a `localStorage`-backed mock with a simulated 400ms delay, seeded with 3 fake studies on first load. It stands in for the planned Node/Express + SQLite backend.
- **Built:** basic app shell ([App.tsx](src/App.tsx)), a Dashboard ([Dashboard.tsx](src/components/Dashboard.tsx)) with study list/search/inline-edit/delete, a Study Configuration form ([StudyConfiguration.tsx](src/components/StudyConfiguration.tsx)) for title/description, and a working Figma prototype embed page ([StudyDesignPage.tsx](src/components/StudyDesignPage.tsx)).
- **Creating a new study works again:** `StudyConfiguration.tsx` now has real Title (required) and Description fields wired to `db.createStudy`, with inline validation if the title is empty. On save it navigates straight to the new study's `StudyDesignPage` (Figma embed) and bumps the Dashboard's `refreshTrigger`. (This was broken between the module-2 commit and this fix — the old working quick-create flow, `CreateStudyPlaceholder.tsx`, is dead code now.)
- **Figma embed (Module 1) is real, not a placeholder:** `StudyDesignPage.tsx` (reached via a study's "Study Design" card, or automatically right after creating a study) validates a `figma.com` URL, persists it with `db.updateStudy`, and renders a live `<iframe>` embed with a desktop/mobile/tablet viewport toggle. This view is researcher-facing only (preview, no tracking attached).
- **Click Tracking (Module 3) is implemented but untested end-to-end** — it needs a real Figma OAuth app `client-id` that didn't exist yet as of this note (see below). Building blocks:
  - `src/lib/figma.ts`: shared `getEmbedUrl`/`isValidFigmaUrl`, used by both `StudyDesignPage.tsx` and `ParticipantSession.tsx`. Appends `?client-id=` from `VITE_FIGMA_CLIENT_ID` (see `.env.example`) when set — without it the embed still renders but stays silent, no events fire.
  - `src/components/ParticipantSession.tsx`: the actual participant-facing route, reached via `?session=<studyId>` in the URL (parsed directly in `App.tsx`, no router library — that branch returns before the normal header/dashboard tree renders at all). Flow: intro screen (title + Start) → tracked embed with a visible "I'm done" button → thank-you screen, which also increments `study.completedParticipants`.
  - `db.ts` gained `Session`/`TrackedEvent` types and a `tracekit_sessions` localStorage store, with `createSession`/`appendEvent`/`endSession`/`getSessionsByStudy`. `appendEvent` intentionally skips the simulated 400ms delay other `db` calls have — clicks can fire in quick succession.
  - The `postMessage` listener in `ParticipantSession.tsx` reads `MOUSE_PRESS_OR_RELEASE` (`data.targetNodeId`, `data.targetNodeMousePosition.{x,y}`, `data.handled` → stored as `isHotspot`) and `PRESENTED_NODE_CHANGED` (`data.presentedNodeId`, chained against the previous node in a ref to build from/to pairs) — field names verified against Figma's own Embed API docs and example repo, not guessed.
  - "Copy Participant Link" button lives in `StudyDesignPage.tsx`, visible once a study has a saved `figmaUrl`.
  - **Still needed to actually verify it works:** a Figma OAuth app with an `http://localhost:5173` (or whatever port) embed origin registered, its client ID in a local `.env.local` as `VITE_FIGMA_CLIENT_ID`. Playwright testing covered the whole UI flow (intro → active → done → participant count increments) but couldn't exercise real `postMessage` events without that key.
- **Not started:** heatmap visualization (Module 4, consumes the `sessions` data written above), survey builder (Module 2, `StudyConfiguration.tsx`'s three sections are still visual placeholders — not persisted), AI hypothesis generator + two-pass hypothesis validation loop (Modules 5–6), BYOK provider settings (Module 7), PDF export (Module 8).
- **Dead code:** `src/components/EditStudyModal.tsx` and `src/components/CreateStudyPlaceholder.tsx` are no longer imported anywhere. Safe to delete or revive, just don't assume either is wired up.

## Conventions observed so far

- Data access goes through the `db` object in `src/db/db.ts` (`getAllStudies`, `createStudy`, `updateStudy`, `deleteStudy`, `createSession`, `appendEvent`, `endSession`, `getSessionsByStudy`) — components don't touch `localStorage` directly.
- Components use inline `style={{}}` alongside a handful of global classes (`btn`, `btn-primary`, `study-card`, etc.) defined in `src/index.css`, not CSS modules or Tailwind utilities.
- `lucide-react` is the icon set in use.
- No router library — the one exception (`?session=` for participant links) is handled by reading `window.location.search` directly in `App.tsx`. Keep it that way unless a second real route shows up; don't reach for `react-router` for a single param.

## Open from professor feedback (already folded into PRD.md, flagging here so it isn't missed during implementation)

- Hypothesis Validation Loop (two-pass biased/unbiased analysis + manual closing) is P0 — see PRD.md § 5 "Hypothesis Validation Loop" and § 6 "Two-Pass Strategy". This is the concept's core differentiator per the professor's feedback; don't build the plain single-pass AI Hypothesis Generator without also planning for this.
- BYOK (generic OpenAI-compatible endpoint) is P1 — see PRD.md § 5 "AI Provider Settings (BYOK)". Must ship with the consent dialog and persistent "External AI Active" indicator, not just a settings field.
