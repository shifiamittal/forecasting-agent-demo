# Forecast Review — Forecasting Agent Demo

Interactive Prototype · Synthetic Demo Data

An implemented React prototype for forecast exception review: **Trigger → Observe → Decide → Act → Human Escalation → Learn/Evaluate**.

## Portfolio demo

The public application runs entirely as a static Vite frontend. Three fictional entities and nine synthetic exceptions demonstrate prioritization, root-cause diagnosis, illustrative historical retrieval, corrective recommendations, human-review states and safety evaluation. All names, relationships, dates, identifiers, incidents and performance values are invented examples. They do not describe customer engagements or measured business outcomes.

No backend, account, API keys, Qdrant, LLM calls or enterprise integration is required. Approval cards are read-only: there are no real approvals, retrains, ERP updates, backfills or tickets. Reset scenario clears the selected case; it does not run an agent. Retrieval similarities, confidence and evaluation scores are authored examples.

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

1. Velora Foods → Planner view: three ranked sample exception groups.
2. `VL-COCOA-BASELINE` → Agent reasoning: expand RCA Diagnostic Agent.
3. Same exception → RAG retrieval: synthetic historical evidence and relevance examples.
4. Same exception → Planner view: diagnosis, retrain recommendation, interim correction and pending human review.
5. Same exception → Eval scores: the 0.82 tier-classification warning and improvement note.

The persistent disclosure should remain visible in screenshots. These screens demonstrate product workflow and safety-boundary design, not proof of production AI performance.

## Repository provenance

This is a clean portfolio snapshot with newly authored fictional data. It intentionally excludes the original repository history, old client-specific reference HTML, obsolete sample components and local assistant configuration. Publish this snapshot as a new repository (`forecasting-agent-demo`); do not link an older repository that still exposes historical client-specific narratives.
