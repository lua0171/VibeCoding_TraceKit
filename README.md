# TraceKit

A free, open-source, fully local usability-testing tool: embed a Figma prototype, collect click/navigation data from participants, generate click heatmaps, and get AI-generated UX hypotheses — all processed locally, no data leaves your device by default.

Built as the final project for **Vibe Coding for User Experience Designers** (UXD_VCUX_FW-SS26, TH Ingolstadt).

See [PRD.md](PRD.md) for the full product concept and [CLAUDE.md](CLAUDE.md) for engineering notes on the current implementation.

## Requirements

- [Node.js](https://nodejs.org/) 18+ and npm
- [Ollama](https://ollama.com/) for local AI analysis (optional — you can also use BYOK with any OpenAI-compatible provider instead, configured in-app)
- A [Figma personal access token](https://www.figma.com/developers/api#access-tokens) to import prototypes (configured in-app, under Settings)

## Installation

```bash
git clone <this-repo-url>
cd VibeCoding_TraceKit
npm install
```

## Running the app

```bash
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`) in your browser.

## Setting up local AI analysis (optional but recommended)

The AI Hypothesis Validation Loop needs a model to talk to. By default the app expects Ollama running locally:

```bash
brew install ollama          # or see https://ollama.com/download for other platforms
brew services start ollama   # or `ollama serve`
ollama pull llama3.2:1b      # matches the app's default model — a small, fast model
```

If your machine has more RAM to spare, you can pull a larger model (e.g. `ollama pull llama3`) and set it as the model name in the app's Settings (gear icon, top right) — the default `llama3.2:1b` was chosen to stay responsive on modest hardware (~8GB RAM).

Alternatively, skip Ollama entirely and use BYOK: open Settings and switch the AI provider to "External AI Provider (BYOK)", pointing at any OpenAI-compatible endpoint with your own API key. Note this sends interaction data to that external provider — the app shows a persistent warning while this is active.

## Other scripts

```bash
npm run test      # run the test suite (Vitest)
npm run lint       # lint the codebase (oxlint)
npm run build      # type-check and production build
npm run preview    # preview the production build locally
```

## How it works, briefly

1. Create a study, add a Figma prototype URL and import it (needs a Figma personal access token in Settings).
2. Optionally add pre-study/post-study survey questions and usability tasks.
3. Copy the participant link from the study and share it — participants complete it in their own browser; all interaction data is written to that browser's local storage, never uploaded anywhere.
4. Back in the study's Results view, review the click heatmap and run the AI Hypothesis Validation Loop to get evidence-linked UX hypotheses.

Everything (studies, sessions, click events, hypotheses) is currently stored in the browser's `localStorage` — a deliberate MVP choice (see PRD.md § 4) to keep the "just run the app" story simple; there is no backend server or database to set up.
