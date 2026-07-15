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
| Frontend | React |
| Backend | Tailwind CSS |
| Database | SQLite|
| Key APIs | Ollama |
| Deployment | Antigravity |
| Security/Privacy | local only storage |

---

## 5) Feature Modules (Prompt-by-Prompt, Build the MVP)

### Module #: Study Creation

- **Priority:** P0
- **User Story:** "As a UX researcher, I want to create a usability study so that I can invite participants."
- **Acceptance Criteria — To-Prompt Checklist:**
* Study creation page
* Study title
* Description
* Save locally
* Edit study
* Delete study

### Module #: Figma Prototype Embed

- **Priority:** P0 
- **User Story:** "As a researcher, I want to embed my Figma prototype so participants can interact with it."
- **Acceptance Criteria — To-Prompt Checklist:**
* Paste Figma URL
* Embedded prototype loads
* Responsive viewer
* Error handling

### Module #: Survey Builder

- **Priority:** P0 
- **User Story:** "As a researcher, I want to ask questions before and after the test."
- **Acceptance Criteria — To-Prompt Checklist:**
* Pre-study survey
* Post-study survey
* Multiple question types
* Local storage

### Module #: Click Tracking

- **Priority:** P0 
- **User Story:** "As a researcher, I want participant interactions to be recorded automatically."
- **Acceptance Criteria — To-Prompt Checklist:**
* Record clicks
* Record timestamps
* Record navigation path
* Local storage only

### Module #: Heatmap Visualization

- **Priority:** P0 
- **User Story:** "As a researcher, I want visual representations of user behavior."
- **Acceptance Criteria — To-Prompt Checklist:**
* Click heatmap
* Hover overlay
* Zoom
* Filter participants

### Module #: AI Hyphothesis Generator

- **Priority:** P0 
- **User Story:** "As a researcher, I want AI-generated UX hypotheses supported by evidence."
- **Acceptance Criteria — To-Prompt Checklist:**
* Local Ollama integration
* Explainable hypotheses
* Confidence score
* Linked evidence

### Module #: Export result

- **Priority:** P1
- **User Story:** "As a researcher, I want to share my results."
- **Acceptance Criteria — To-Prompt Checklist:**
* Export PDF
* Export screenshots
* Export AI summary

---

## 6) AI Design & Prompting Strategy

- **System Prompt:**
“You are a UX research assistant. Analyze usability testing data objectively. Generate evidence-based UX hypotheses only from the provided interaction data. Explain confidence levels and reference supporting user behavior.”
- **Prompt Bank (TACO examples):**
* Analyze click patterns.
* Identify usability bottlenecks.
* Summarize survey responses.
* Generate UX improvement hypotheses.
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
* Process all data locally.
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





