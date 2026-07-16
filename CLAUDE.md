# TraceKit — Working Notes for Claude Code

Privacy-first, local-only usability testing tool (Figma embed + click tracking + heatmaps + local AI hypotheses via Ollama). University "Vibe Coding" capstone project, TH Ingolstadt.

**Full product concept, personas, scope, and feature spec: see [PRD.md](PRD.md).** Don't duplicate that content here — this file only covers what the PRD doesn't: where the code actually stands, and repo-specific quirks.

## Current implementation status (as of 2026-07-16)

The codebase is a frontend-only scaffold, well behind the PRD's target stack:

- **Stack in place:** React 19 + Vite + TypeScript, `oxlint` for linting. No Tailwind CSS installed (styling is a hand-written CSS custom-property system in `src/index.css`, e.g. `var(--primary)`, `var(--radius-md)` — despite the PRD listing Tailwind). No backend, no SQLite, no Ollama integration yet.
- **"Database":** `src/db/db.ts` is a `localStorage`-backed mock with a simulated 400ms delay, seeded with 3 fake studies on first load. It stands in for the planned Node/Express + SQLite backend.
- **Built:** basic app shell ([App.tsx](src/App.tsx)), a Dashboard ([Dashboard.tsx](src/components/Dashboard.tsx)) with study list/search/inline-edit/delete, and a Study Creation placeholder ([CreateStudyPlaceholder.tsx](src/components/CreateStudyPlaceholder.tsx)) that only injects a random mock study — no real form (no Figma URL field, no tasks, no survey, no initial-hypotheses field yet).
- **Not started:** Figma embed, click tracking, survey builder, heatmap visualization, AI hypothesis generator (incl. the two-pass hypothesis validation loop), BYOK provider settings, PDF export.
- **Dead code:** `src/components/EditStudyModal.tsx` is not imported anywhere — inline editing moved directly into `Dashboard.tsx`. Safe to delete or revive, just don't assume it's wired up.

## Conventions observed so far

- Data access goes through the `db` object in `src/db/db.ts` (`getAllStudies`, `createStudy`, `updateStudy`, `deleteStudy`) — components don't touch `localStorage` directly.
- Components use inline `style={{}}` alongside a handful of global classes (`btn`, `btn-primary`, `study-card`, etc.) defined in `src/index.css`, not CSS modules or Tailwind utilities.
- `lucide-react` is the icon set in use.

## Open from professor feedback (already folded into PRD.md, flagging here so it isn't missed during implementation)

- Hypothesis Validation Loop (two-pass biased/unbiased analysis + manual closing) is P0 — see PRD.md § 5 "Hypothesis Validation Loop" and § 6 "Two-Pass Strategy". This is the concept's core differentiator per the professor's feedback; don't build the plain single-pass AI Hypothesis Generator without also planning for this.
- BYOK (generic OpenAI-compatible endpoint) is P1 — see PRD.md § 5 "AI Provider Settings (BYOK)". Must ship with the consent dialog and persistent "External AI Active" indicator, not just a settings field.
