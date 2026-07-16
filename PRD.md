# TraceKit — Vibe-Coding PRD

**Project Vibe (1-sentence pitch):** A privacy-first, open-source usability testing platform that helps students and UX professionals conduct remote prototype tests with transparent local AI analysis.

**Date:** July 2026 &nbsp;&nbsp;&nbsp; **Author(s):**  Edgard Fichtenau, Aron Thiele, Luisa Amberger;


---

## 1) Core Context — "Master Prompt"

- **Problem** (1–2 sentences): 
Usability testing is an essential part of UX design but remains inaccessible for students, freelancers, and small teams. Existing tools are expensive, cloud-based, and often lack transparency regarding AI-generated insights.
- **Solution** (1–2 sentences):
TraceKit provides an open-source usability testing platform that records interaction data locally, generates explainable AI-supported UX insights, and ensures that no user data ever leaves the device.
- **Target Users:**
UX Design students
* UX Researchers
* Freelance UX/UI Designers
* Small design agencies
* Academic researchers
- **Primary Use Cases:**
* Test Figma prototypes remotely
* Collect participant interactions
* Create click heatmaps
* Conduct pre- and post-study surveys
* Generate AI-supported UX hypotheses
* Export study results
- **North-Star Success Metric:**
A user can complete a usability study and receive actionable AI-generated insights within 15 minutes without uploading any data to the cloud.
- **Non-Goals:**
* Enterprise analytics
* Website analytics
* Marketing analytics
* Cloud-based data collection
* User behavior tracking outside usability studies

*Note: BYOK (bring-your-own-key) external AI providers (see Section 4/5) are an explicit, opt-in exception to "no data leaves the device" — disabled by default, never silently enabled, and always shown with a persistent indicator when active.*

---

## 2) UX Foundations (Vibe, Research, Accessibility)

- **Personas:**
UX Student
Needs an affordable and easy way to test semester projects.

Freelance Designer
Needs quick usability validation before delivering designs.

UX Researcher
Needs transparent AI-supported analysis while maintaining participant privacy.

- **Top Insights / Pain Points:**
* Commercial tools are expensive.
* Privacy concerns prevent some usability studies.
* Existing AI recommendations are often black boxes.
* Small teams frequently skip usability testing due to cost and complexity.
- **Emotional & Contextual "Vibe" Principles:**
* Calm
* Transparent
* Research-driven
* Privacy-first
* Minimalistic
* Trustworthy
* Educational
- **Accessibility & Inclusion Requirements:**
* WCAG 2.2 AA compliance
* Keyboard navigation
* Screen-reader compatibility
* High color contrast
* Responsive layouts
* Clear language
* Accessible charts and heatmaps
- **High-Level Journey:**
Create Study
↓
Embed Figma Prototype
↓
Create Survey
↓
Share Study Link
↓
Participants Complete Tasks
↓
Local Data Collection
↓
Heatmap Generation
↓
AI Analysis
↓
Review & Export Results
---

## 3) Scope & Priorities

- **MVP (V1) Goals:**
* Figma embedding
* Click tracking
* Survey builder
* Local database
* Heatmap visualization
* Local AI hypothesis generation via Ollama
* Hypothesis validation loop — capture initial hypotheses at study setup, evaluate them against collected data each analysis round, and let researchers close/lock validated ones so analysis doesn't spiral into endless new questions
- **Out of Scope for V1:**
* Video recording
* Mobile optimization
* Multi-user collaboration
* Cloud synchronization
* Enterprise dashboard

- **Assumptions & Risks:**
* Users are willing to run local AI.
* Local processing is sufficient for most studies.
* Figma embedding remains technically stable.

* Browser compatibility
* Local AI performance
* Large prototype handling
* Heatmap rendering performance
---

## 4) Tech Stack & Architecture

| Layer | Choice |
|---|---|
| Frontend | React + Tailwind CSS |
| Backend | Node.js/Express |
| Database | SQLite |
| Local AI | Ollama (default, fully local) |
| BYOK AI (optional) | Any OpenAI-compatible endpoint (base URL + API key + model name) — one generic adapter covers OpenAI, Groq, OpenRouter, etc. |
| Deployment | Runs entirely on the researcher's own device (Antigravity as the vibe-coding dev platform). No cloud hosting required for the core product. |
| Remote participants | Optional ngrok tunnel exposes the local instance temporarily; data still only round-trips to the researcher's machine, never third-party cloud storage |
| Security/Privacy | Local-only by default; BYOK is opt-in per study, requires explicit consent, and shows a persistent "External AI Active" indicator while enabled |

---

## 5) Feature Modules (Prompt-by-Prompt, Build the MVP)

### Module #: Study Creation

- **Priority:** P0
- **User Story:** "As a UX researcher, I want to create a usability study so that I can invite participants."
- **Acceptance Criteria — To-Prompt Checklist:**
* Study creation page
* Study title
* Description
* Optional initial hypotheses list (free text; evaluated against collected data in later analysis rounds, see Hypothesis Validation Loop module)
* Save locally
* Edit study
* Delete study

### Module 1: Figma Prototype Embed

- **Priority:** P0 
- **User Story:** "As a researcher, I want to embed my Figma prototype so participants can interact with it."
- **Acceptance Criteria — To-Prompt Checklist:**
* Paste Figma URL
* Embedded prototype loads
* (Responsive viewer)
* Error handling

### Module 2: Survey Builder

- **Priority:** P0 
- **User Story:** "As a researcher, I want to be able to embed my prototype and formulate questions that the participant can answer before and after the test."
- **Acceptance Criteria — To-Prompt Checklist:**
* Pre-study survey
* Post-study survey
* Multiple question types
* Local storage
* Embed Prototype

### Module 3: Click Tracking

- **Priority:** P0 
- **User Story:** "As a researcher, I want participant interactions to be recorded automatically."
- **Acceptance Criteria — To-Prompt Checklist:**
* Record clicks
* Record timestamps
* Record navigation path
* Local storage only

### Module 4: Heatmap Visualization

- **Priority:** P0 
- **User Story:** "As a researcher, I want visual representations of user behavior."
- **Acceptance Criteria — To-Prompt Checklist:**
* Click heatmap
* Hover overlay
* Zoom
* Filter participants

### Module 5: AI Hypothesis Generator

- **Priority:** P0 
- **User Story:** "As a researcher, I want AI-generated UX hypotheses supported by evidence."
- **Acceptance Criteria — To-Prompt Checklist:**
* Local Ollama integration
* Explainable hypotheses
* Confidence score
* Linked evidence

### Module 6: Hypothesis Validation Loop (Closing the Loop)

- **Priority:** P0
- **User Story:** "As a researcher, I want to check my own assumptions against the data and lock in what's confirmed, so analysis doesn't spiral into endless new questions."
- **Acceptance Criteria — To-Prompt Checklist:**
* Two-pass analysis per run: a biased pass evaluates every currently open hypothesis (initial + carried over from prior rounds) against the data — confirmed / refuted / inconclusive, with confidence and evidence; an unbiased pass generates new hypotheses from the raw data only, with no knowledge of the open hypotheses
* Rule-based merge (no extra LLM call): Pass-1 verdicts update existing hypotheses; Pass-2 findings are deduplicated against existing evidence and either fold into an existing hypothesis or get added as new
* Combined hypothesis list tagged by origin ("Confirms/refutes hypothesis X" vs. "New finding")
* Hypotheses above a confidence threshold are flagged "Ready to close"; researcher must actively confirm closing (never auto-closed)
* Closed hypotheses are excluded from future biased passes but remain visible in the study and in exports with a "Locked" badge

### Module 7: AI Provider Settings (BYOK)

- **Priority:** P1
- **User Story:** "As a researcher, I want to optionally use my own AI provider's API key instead of local Ollama."
- **Acceptance Criteria — To-Prompt Checklist:**
* Provider choice: Ollama (default, local) or a generic OpenAI-compatible endpoint (base URL, API key, model name)
* Explicit consent dialog the first time a non-Ollama provider is activated, stating that interaction/survey data will leave the device
* Persistent header indicator ("External AI Active") whenever a non-Ollama provider is enabled, replacing the default "Local-Only Sandbox" state
* API key stored locally only, never synced or transmitted anywhere except the configured endpoint

### Module 8: Export result

- **Priority:** P1
- **User Story:** "As a researcher, I want to share my results."
- **Acceptance Criteria — To-Prompt Checklist:**
* Export a single PDF containing: study summary, heatmap per prototype screen, full hypothesis list (closed hypotheses with their verdict, open ones flagged "unresolved"), each with confidence, origin, and evidence reference, and the survey response summary
* Export screenshots
* Export AI summary

---

## 6) AI Design & Prompting Strategy

- **System Prompt:**
“You are a UX research assistant. Analyze usability testing data objectively. Generate evidence-based UX hypotheses only from the provided interaction data. Explain confidence levels and reference supporting user behavior.” Reused unchanged regardless of provider (Ollama or BYOK) — only the model/endpoint changes, not the prompting strategy.
- **Hypothesis Loop — Two-Pass Strategy:**
* Pass 1 (biased): system prompt above + the current list of open hypotheses (initial + carried over from prior rounds). Task: judge each as confirmed / refuted / inconclusive, with confidence and cited evidence. Never sees Pass 2's output.
* Pass 2 (unbiased): system prompt above + raw interaction data only. No mention of open hypotheses. Task: generate new hypotheses purely from the data, same as today.
* Merge is rule-based (not a third LLM call), to stay fast (Ollama performance budget) and keep every statement traceable to the pass that produced it.
- **Prompt Bank (TACO examples):**
* Analyze click patterns.
* Identify usability bottlenecks.
* Summarize survey responses.
* Generate UX improvement hypotheses.
* Evaluate a given hypothesis against the data (biased pass).
* Explain confidence score.
- **Reasoning Boosters (CoT, ToT, Meta):**
* Chain of Thought
* Evidence-first reasoning
* Confidence estimation
* Reflection before output
- **Hallucination Mitigation & Safety:**
* Never invent observations.
* Reference actual click data.
* Provide confidence estimates.
* Explain uncertainty.
* Process all data locally by default; BYOK sends data externally only with explicit, per-provider consent.
* Keep the biased and unbiased passes strictly independent so the model isn't nudged to only confirm existing assumptions.
- **Vibe-Coding History:**
Development is documented using AI-assisted coding sessions, including prompt history and implementation decisions.

---

## 7) IA, Flows & UI

- **Information Architecture:**
Dashboard
→ Studies
→ Participants
→ Heatmaps
→ AI Insights
→ Exports
→ Settings
- **Key Flows:**
Create Study
↓
Configure Prototype
↓
Publish
↓
Collect Data
↓
Analyze
↓
Export
- **Design Tokens & Components:**
Typography
* Inter
Colors
* Neutral Gray
* White
* Blue Accent
* Green Success
* Red Error
Components
* Buttons
* Cards
* Tables
* Heatmaps
* Dialogs
* Charts
* Survey Forms
- **Localization & Tone Guidelines:**
Language
* English (V1)
Tone
* Professional
* Transparent
* Friendly
* Educational

---

## 8) Iteration Plan & Workflow

- **Build Rhythm:**
Prototype
↓
Develop
↓
(Test)
↓
(Review)
↓
(Iterate)
- **Risk/Spike Tickets:**
* Ollama performance
* Heatmap rendering
* Figma embedding
* Local database scaling

---

## 9) Quality: Testing, A11y, Performance

- **Testing:** 
* Unit tests
* Integration tests
* End-to-end tests
* Usability testing
- **Accessibility:**
* WCAG 2.2 AA
* Keyboard support
* Screen readers
* Focus indicators
- **Performance Budgets:**
* Initial load < 2 s
* Heatmap generation < 5 s
* AI response < 20 s locally
---

## 10) Metrics & Analytics

- **Events & Props:**
* Study Created
* Prototype Loaded
* Survey Submitted
* Participant Started
* Participant Finished
* Heatmap Generated
* AI Insight Generated
- **Dashboards/KPIs:**
* Studies completed
* Completion rate
* Average AI generation time
* Task completion success
* Average usability issues detected
- **Experimentation:**
* Compare AI prompt strategies
* Heatmap visualization improvements
* Survey UX optimization

---

## 11) Launch & Ops

- **Environments & Feature Flags:**
* Local Development
* Beta Testing
* Production
* AI Analysis
* PDF Export
* Mobile Testing
* Remote Testing
- **Support & Maintenance:**
* GitHub Issues
* Open-source documentation
* Community contributions
* Regular dependency updates





