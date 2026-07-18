# TraceKit — Working Notes for Claude Code

Privacy-first, local-only usability testing tool (Figma embed + click tracking + heatmaps + local AI hypotheses via Ollama). University "Vibe Coding" capstone project, TH Ingolstadt.

**Full product concept, personas, scope, and feature spec: see [PRD.md](PRD.md).** Don't duplicate that content here — this file only covers what the PRD doesn't: where the code actually stands, and repo-specific quirks.

## Current implementation status (as of 2026-07-18)

The codebase is a frontend-only scaffold, well behind the PRD's target stack:

- **Stack in place:** React 19 + Vite + TypeScript, `oxlint` for linting. No Tailwind CSS installed (styling is a hand-written CSS custom-property system in `src/index.css`, e.g. `var(--primary)`, `var(--radius-md)` — despite the PRD listing Tailwind). No backend, no SQLite, no Ollama integration yet.
- **"Database":** `src/db/db.ts` is a `localStorage`-backed mock with a simulated 400ms delay, seeded with 3 fake studies on first load. It stands in for the planned Node/Express + SQLite backend.
- **Built:** basic app shell ([App.tsx](src/App.tsx)), a Dashboard ([Dashboard.tsx](src/components/Dashboard.tsx)) with study list/search/inline-edit/delete, a Study Configuration form ([StudyConfiguration.tsx](src/components/StudyConfiguration.tsx)) for title/description, and a working Figma prototype embed page ([StudyDesignPage.tsx](src/components/StudyDesignPage.tsx)).
- **Creating a new study works again:** `StudyConfiguration.tsx` now has real Title (required) and Description fields wired to `db.createStudy`, with inline validation if the title is empty. On save it navigates straight to the new study's `StudyDesignPage` (Figma embed) and bumps the Dashboard's `refreshTrigger`. (This was broken between the module-2 commit and this fix — the old working quick-create flow, `CreateStudyPlaceholder.tsx`, is dead code now.)
- **Figma embed (Module 1) is real, not a placeholder:** `StudyDesignPage.tsx` (reached via a study's "Study Design" card, or automatically right after creating a study) validates a `figma.com` URL, persists it with `db.updateStudy`, and renders a live `<iframe>` embed with a desktop/mobile/tablet viewport toggle. No click-tracking overlay yet, and this view is researcher-facing only — there's no separate participant-facing test-session flow yet.
- **`StudyConfiguration.tsx`'s** other three sections (pre-study questions, prototype embed — duplicating what `StudyDesignPage.tsx` already does for real, post-study questions) are still pure visual placeholders, not persisted.
- **Not started:** click tracking, survey builder (real, not placeholder), heatmap visualization, AI hypothesis generator (incl. the two-pass hypothesis validation loop), BYOK provider settings, PDF export.
- **Dead code:** `src/components/EditStudyModal.tsx` and `src/components/CreateStudyPlaceholder.tsx` are no longer imported anywhere. Safe to delete or revive, just don't assume either is wired up.

## Conventions observed so far

- Data access goes through the `db` object in `src/db/db.ts` (`getAllStudies`, `createStudy`, `updateStudy`, `deleteStudy`) — components don't touch `localStorage` directly.
- Components use inline `style={{}}` alongside a handful of global classes (`btn`, `btn-primary`, `study-card`, etc.) defined in `src/index.css`, not CSS modules or Tailwind utilities.
- `lucide-react` is the icon set in use.

## Open from professor feedback (already folded into PRD.md, flagging here so it isn't missed during implementation)

- Hypothesis Validation Loop (two-pass biased/unbiased analysis + manual closing) is P0 — see PRD.md § 5 "Hypothesis Validation Loop" and § 6 "Two-Pass Strategy". This is the concept's core differentiator per the professor's feedback; don't build the plain single-pass AI Hypothesis Generator without also planning for this.
- BYOK (generic OpenAI-compatible endpoint) is P1 — see PRD.md § 5 "AI Provider Settings (BYOK)". Must ship with the consent dialog and persistent "External AI Active" indicator, not just a settings field.
