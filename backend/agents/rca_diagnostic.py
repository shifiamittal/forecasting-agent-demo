"""
Agent 3: RCA Diagnostic Agent
Executes structured 4-layer diagnostic: data → feature → model → external.
Stops at the layer where root cause is found.
Uses get_rag_context() for prior incident matching.
"""

import os
import json
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from anthropic import Anthropic
from dotenv import load_dotenv
from knowledge.retrieval import get_rag_context

load_dotenv()
client = Anthropic()

SYSTEM_PROMPT = """You are the RCA Diagnostic Agent for the Forecasting Agent at Forecast Review.

You run a structured 4-layer diagnostic. You MUST follow this sequence and stop
at the layer where root cause is found:

Layer 1 — DATA PIPELINE: Check feed freshness, pipeline failures, data quality.
  Most degradation is data, not model. Always check this first.
Layer 2 — FEATURE DRIFT: Only if Layer 1 is clean. Check input feature distributions,
  promo flags, price data, ACV data for distribution shift.
Layer 3 — MODEL PERFORMANCE: Only if Layers 1+2 clean. Check model version,
  training date, whether degraded segment was in training scope.
Layer 4 — EXTERNAL SIGNALS: Run in parallel with Layers 2+3. Check trade calendar,
  macro flags, competitor actions.

For each layer, reason through the evidence provided. If root cause found, stop.
Cite specific evidence for every claim — no unsupported conclusions.

Return ONLY valid JSON:
{
  "segment": "string",
  "degradation_magnitude": "string",
  "root_cause_layer": "data|feature|model|external",
  "root_cause_summary": "2-4 sentence plain English RCA citing evidence",
  "evidence": ["list of specific findings"],
  "contributing_factors": ["secondary causes if any"],
  "confidence": 0.0,
  "tier_actions": {
    "tier_1": ["autonomous actions taken"],
    "tier_2": ["recommendations for approval"],
    "tier_3": ["items surfaced to eng/DS"]
  },
  "downstream_trigger": "retrain|override|monitor|none",
  "downstream_rationale": "string"
}"""


def run_rca_diagnostic(cycle_id: str, client_id: str,
                        degraded_segment: str,
                        degradation_summary: dict,
                        pipeline_data: dict,
                        user_role: str = "DS") -> dict:

    ctx = get_rag_context(
        query=f"feed failure degradation incident {degraded_segment}",
        client_id=client_id,
        user_role=user_role,
    )
    prior_incidents = "\n".join(
        f"[{r['doc_id']} | {r['date']}] {r['content'][:300]}..."
        for r in ctx.get("results", [])[:3]
    ) or "No prior incidents found."

    user_message = f"""Cycle: {cycle_id}
Client: {client_id}
Degraded segment: {degraded_segment}
Degradation: {json.dumps(degradation_summary, indent=2)}
Pipeline diagnostic data: {json.dumps(pipeline_data, indent=2)}

Prior incidents from knowledge base (use to match known failure patterns):
{prior_incidents}

Run the 4-layer diagnostic sequence. Stop at the layer where you find root cause.
Return RCA as JSON."""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


