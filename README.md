# Forecast Review — Forecasting Agent Demo

Interactive Prototype · Synthetic Demo Data

**[Open the public demo](https://forecasting-agent-demo.netlify.app/)** · Hosted on Netlify as a static deployment.

An implemented React prototype for forecast exception review: **Trigger → Observe → Decide → Act → Human Escalation → Learn/Evaluate**.

## Portfolio demo

The public application runs entirely as a static Vite frontend. Three fictional entities and nine synthetic exceptions demonstrate prioritization, root-cause diagnosis, illustrative historical retrieval, corrective recommendations, human-review states and safety evaluation. All names, relationships, dates, identifiers, incidents and performance values are invented examples. They do not describe customer engagements or measured business outcomes.

No backend, account, API keys, Qdrant, LLM calls or enterprise integration is required. Approval cards are read-only: there are no real approvals, retrains, ERP updates, backfills or tickets. Reset Scenario was removed because there are no mutable forecasts or approvals to reset. Client switching returns to the default Planner View. Retrieval similarities, confidence and evaluation scores are authored examples.

## Run and build

Use Node 24 (tested with 24.20.0).

```sh
cd frontend
npm ci
npm run dev
```

Production:

```sh
cd frontend
npm run build
npm run preview
```

Publish **only `frontend/dist`** to a static host. No environment variables or server functions are needed. Do not publish the repository root or the reference backend as a service.

## Designed production architecture

The preserved Python reference implementation contains a trigger router, exception triage, structured RCA, retrain/override recommendations, LLM-based evaluation, a pipeline adapter and permission-scoped vector retrieval. It is source-code evidence of the implemented agent pipeline, not infrastructure used by the public demo.

Designed flow: forecasting data → Trigger Router → Exception Triage → RCA Diagnostic → corrective recommendation → human approval/escalation → evaluation and learning. Low-risk reversible steps may be automated in the design; consequential changes require explicit human review. Operational execution and approval persistence are not implemented here.

The reference backend uses FastAPI, the Anthropic SDK, Qdrant and sentence-transformers. It contains only sanitized example scenarios and a new 27-record synthetic knowledge set. A local backend experiment would require a Python environment, `pip install -r backend/requirements.txt`, and private `ANTHROPIC_API_KEY`, `QDRANT_URL` and `QDRANT_API_KEY` settings. These must never be frontend variables or committed secrets. Ingestion deletes/recreates its example collection: use a dedicated disposable Qdrant instance. The reference service lacks production authentication, rate limits and comprehensive operational safeguards; do not expose it publicly.

Reference limitations: progress events are illustrative rather than instrumented agent callbacks; the adapter does not yet expose actual retrieved chunks and per-exception diagnostic provenance; evaluation is an LLM critique, not an independent benchmark. The portfolio frontend does not use those routes. Production readiness would require authenticated tenant scoping, verified source grounding, deterministic action gates, human-decision persistence, execution adapters, telemetry and integration tests.

## Code map

- `frontend/src/App.jsx`: static scenario selection and navigation.
- `frontend/src/data/`: nine synthetic cases with diagnosis, evidence, action states and evaluations.
- `frontend/src/components/panels/`: planner, reasoning, historical evidence and evaluation screens.
- `backend/agents/`: implemented orchestration and reasoning functions.
- `backend/knowledge/`: embedding, indexing, metadata filtering and retrieval.
- `backend/data/` and `backend/fixtures/`: sanitized examples for optional local experiments.

## Suggested portfolio walkthrough

Planner view is the primary business summary: issue, likely cause, risk and next review action. Selecting an action opens evidence, diagnosis, recommendation and human approval requirements on the same page. Original technical findings and action details remain in an expandable section; the reasoning, retrieval and evaluation tabs retain their full content. Outcome cards summarize the authored action states for the selected client: three exceptions, two completed autonomous steps, four recommendations awaiting approval and two expert escalations. These are scenario outcomes, not live agent execution. The four approval items and two escalations are actions, not distinct exceptions. Expected event cases are displayed as low business risk while their original detector severity remains in the technical fixture.

1. Velora Foods → Planner View, no exception selected: the recommended default portfolio screenshot. It shows client context, agent outcomes, three business-readable issues and next actions.
2. Select Review retraining recommendation → Agent Reasoning: plain-language diagnostic path, with the original agent trace available below.
3. Same exception → RAG Retrieval: precedent, relevance, resolution and outcome, with source metadata below.
4. Same exception → Planner view: diagnosis, retrain recommendation, interim correction and pending human review.
5. Same exception → Eval scores: the 0.82 tier-classification warning and improvement note.

The persistent disclosure should remain visible in screenshots. These screens demonstrate product workflow and safety-boundary design, not proof of production AI performance.

## Repository provenance

This is a clean portfolio snapshot with newly authored fictional data. It intentionally excludes the original repository history, old client-specific reference HTML, obsolete sample components and local assistant configuration. Publish this snapshot as a new repository (`forecasting-agent-demo`); do not link an older repository that still exposes historical client-specific narratives.

## Verification

The production build and lint pass. All nine cases were exercised locally and on the public deployment across planner, reasoning, evidence and evaluation tabs, including technical accordion expansion and client switching. Reset Scenario and About were removed in the readability pass. No browser errors or warnings were recorded during those checks. The local backend was stopped. A fresh public-site tab rendered the demo without app state or login; separate HTTP requests without cookies or authorization returned 200, and the served JavaScript/CSS matched the audited local build byte-for-byte. A fully isolated incognito browser context was not available through the testing interface.

The source and generated bundle were checked for original engagement identifiers and common credential patterns, with no matches found. This is a scoped review, not a legal clearance or an exhaustive secrets guarantee. All public scenario narratives and business metrics were newly authored as fictional examples.

Deployment uses Netlify Drop and is not automatically connected to GitHub. For updates, run the frontend build and upload only the new `frontend/dist` contents to the same Netlify project.

## Exception detail routes

Rows open dedicated `/exceptions/...` URLs. The flagship page is `/exceptions/seasonal-underforecast`. Browser Back/Forward, direct links and refresh are supported through the static Netlify rewrite. The Forecast Review search and filter selections remain available when returning during the same session. All nine cases have dedicated detail pages; the seasonal case includes the expanded RCA, demand-index chart and interactive decision previews.

Approval, rejection, change-request and escalation controls are local previews. They do not save decisions, run a retrain or create tickets, and reset when leaving the detail page. The chart is a synthetic representative product series, separate from the portfolio-wide accuracy summary. Its latest point illustrates a 15% underforecast. The affected share is 14.3% (1,842 of 12,842 SKUs); 28% would require a different denominator. The seasonal historical precedent now records a 2.1-point wMAPE improvement over two cycles, consistent in details and retrieval.
