# Vibe Coding History

A selection of AI interactions from building and testing TraceKit. This
covers one working session with Claude Code (2026-07-20), the day the
Figma prototype study was set up, tested end-to-end, and debugged against
real usage. Earlier sessions (initial feature implementation, accessibility
audit, etc.) are documented in `CLAUDE.md`'s changelog-style notes but
aren't transcribed here.

The throughline: almost nothing below was "write me a feature." It was
"here's what I observed / here's what I want," followed by the AI
investigating the actual running app and actual data before touching code.

---

## 1. Setting up a real study, not a mock one

**Prompt:**
> kannst du meine figma projekte sehen, hab ja den mcp installiert glaube ich.
> Oder brauchst du nen link? Ich will, dass du mir die studie für einen Figma
> Prototypen auf setzt

**What happened:** The AI checked its Figma MCP connection (`whoami`),
established it could read files but not browse/list them, and asked for a
link. Given the link, it read the file's structure directly (27 frames,
grouped into three flows: card quiz, battle/multiplayer, friends) and used
that to ask targeted clarifying questions (which flow to test, where
participants should start, what post-survey to use) before building
anything — rather than guessing at study design.

It then discovered a real architectural constraint mid-task: automating
the study creation in an isolated Playwright browser wouldn't work, because
TraceKit has no backend — the created study would only exist in that
throwaway browser's `localStorage`, invisible to the user's real browser.
Solution: build the study via headless automation (so the Figma token
never had to be shared in chat), then hand over a small, idempotent
browser-console snippet to merge just that one study into the user's real
`localStorage` — without touching anything else already there.

**Bug found along the way:** every newly created study was silently
seeded with an unrelated mock study's demo tasks
(`StudyConfiguration.tsx`'s task-seeding `else` branch matched *any*
non-mock study id). Found because the freshly created study came back
with 5 tasks instead of 3. Fixed on the spot before continuing.

---

## 2. "Ich werde beim Klick gleich auf nen ganz falschen screen weiter geleitet"

**Prompt (with screenshots of the intended Figma flow):**
> Ich starte glaube ich am richtigen screen, werde aber falsch weiter
> geleitet. Für Aufgabe 1 ist folgender flow gedacht [...] Wenn ich des in
> der app mache dann werde ich beim Klick gleich auf nen ganz falschen
> screen weiter geleitet

**What happened:** No fix was proposed before evidence existed. The AI:
1. Read `PrototypeViewer.tsx`'s navigation code and found it silently
   fell back to `frames[0]` (an arbitrary screen) whenever a hotspot's
   target frame ID didn't resolve — a real robustness bug, fixed first.
2. Asked the user for the actual imported hotspot JSON (via a
   console snippet) to find *why* the target didn't resolve, rather than
   guessing.
3. Found the target ID belonged to a Figma *component* ("Property 1=Frame
   1"), not a page frame — via the Figma MCP connection directly, not
   assumption.
4. When the user pushed back — "die Verbindungen in Figma sind alle
   eigentlich richtig" — the AI revised its hypothesis instead of
   defending the first one, re-read `figmaApi.ts`, and found the real bug:
   the code preferred a legacy `transitionNodeID` field over the modern
   `interactions` array whenever both existed with different targets.
5. A second, related bug surfaced immediately after the fix (the bottom
   nav still didn't work) — traced to the Figma API's `?depth=3` parameter
   silently truncating icons nested inside reusable component instances.

Both fixes shipped with unit tests reproducing the exact failure modes
(`findClickTarget`, `resolveNavigationTarget` in `figmaApi.test.ts`).

---

## 3. "die Heatmap ist meistens leider bisschen daneben"

**Prompt (with a screenshot showing a heatmap dot above the actual click):**
> die Heatmap ist meistens leider bisschen daneben. In dem Screen habe ich
> direkt auf OK geklickt, aber die Heatmap zeigt drüber an

**What happened:** Traced through two components to find that click
coordinates were normalized against the *outer*, flex-centered viewer
container instead of the actual rendered frame image — and the outer
container has a different aspect ratio (and therefore different
letterboxing) during a live participant session (full browser viewport)
versus heatmap replay (a fixed box). Fixed at the source (a `frameRef` on
the actual image area) and in the replay wrapper (matching the frame's
real aspect ratio instead of a hardcoded 960×640 box) — both sides of the
same coordinate system had to agree.

---

## 4. "Wieso seh ich die [tasks] da nicht getrennt?"

**Prompt:**
> Also ich habe ja als user 3 tasks gemacht. Wieso seh ich die da nt
> getrennt? Wieso kann ich nicht die auswertung der fragen von am anfang
> und nach dem test sehen. Sollte ich die heatmap nicht screenweise sehen?

**What happened:** Rather than assuming these were missing features, the
AI read `StudyResultsPage.tsx` and the underlying data model first, and
reported back precisely: per-task and per-survey data was *already being
captured* (`TrackedEvent.taskId`, `Session.preSurveyAnswers`), just never
rendered — a UI gap, not data loss. The per-screen heatmap filter already
existed too; it was just mislabeled with raw Figma node IDs instead of
frame names. Three real fixes followed (task breakdown table, survey
results section, resolved screen names), landed directly rather than via
parallel subagents once it was clear all three touched the same 330-line
file and would just conflict with each other.

---

## 5. Planning the demo video against real constraints

**Prompt:**
> Ich habe für die Demo 6 Minuten zeit [...] Wie soll ich die 6 Minuten am
> besten auf teilen und wie soll ich des am besten mit der ai stimme
> machen, dass des timing immer stimmt?

**What happened:** Rather than writing generic advice, the AI watched the
existing slide-deck half of the video (extracted frames via `ffmpeg`,
read the actual narration transcript once supplied) to keep the demo
script consistent with what had already been promised on screen — and
caught two real accuracy problems in the *other* half of the video before
they could ship: a factually wrong tech-stack claim (it described
React+Tailwind+SQLite; the app is React with a hand-written CSS system and
`localStorage`, no backend — contradicting the project's own PRD) and an
unqualified "full WCAG 2.2 AA compliance" claim. It also flagged a
concrete production risk specific to this app: the AI Hypothesis
Validation Loop makes one sequential Ollama call per hypothesis, so
"it'll load quickly" was an untested assumption worth a dry run before
recording, not a given.

---

## What this shows

Most of the value here wasn't code generation — it was the AI treating
every bug report as something to verify against the real running app
and real data before proposing a fix, and being willing to discard its
own first hypothesis when the user pushed back with better information
(section 2). The best result all day was `resolveNavigationTarget` +
`findClickTarget` + the `frameRef` coordinate fix: three real, previously
invisible product bugs found only because someone actually clicked
through the real prototype and said something looked wrong.
