"""
Agent 2: Exception Triage Agent
Scores every SKU by exception severity, classifies exception type,
generates ranked exception queue with tier-classified actions.
Uses get_rag_context() for prior incident and override history.
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

SYSTEM_PROMPT = """You are the Exception Triage Agent for the Forecasting Agent at Forecast Review.

Your job is to review SKU-level forecast exceptions, classify them, score severity,
and produce a ranked exception queue with tier-classified actions.

Exception classification:
- data_issue: data quality score < 0.7 OR known feed outage
- model_issue: data quality >= 0.7 AND bias outside threshold 2+ cycles AND no external signal explains delta
- demand_signal: external event in trade calendar explains the delta

Severity scoring (0-10):
- forecast_delta_score: delta magnitude normalized 0-10
- bias_persistence_score: consecutive out-of-range bias cycles, capped at 10
- data_quality_penalty: (1 - data_quality_score) * 10
- final_severity = 0.4 * forecast_delta + 0.4 * bias_persistence + 0.2 * data_quality_penalty

Tier classification:
- Tier 1 (autonomous): severity < 4 OR exception_type = demand_signal with known calendar event
- Tier 2 (recommend + approve): severity 4-7 OR model_issue on non-top-20-velocity SKU
- Tier 3 (surface only): severity > 7 OR data_issue with no known root cause OR model_issue on top-20-velocity SKU

Return ONLY valid JSON:
{
  "exceptions": [
    {
      "sku_id": "string",
      "location_id": "string",
      "severity_score": 0.0,
      "exception_type": "data_issue|model_issue|demand_signal",
      "one_line_diagnosis": "string",
      "tier": 1,
      "recommended_action": "string",
      "evidence": ["list of supporting signals"]
    }
  ],
  "tier1_actions_taken": ["list of autonomous actions executed"],
  "tier2_queue": ["list of items queued for approval"],
  "tier3_surfaced": ["list of items surfaced to eng/DS"],
  "summary": "2-sentence summary of triage results"
}"""


def run_exception_triage(cycle_id: str, client_id: str,
                          priority_segments: list,
                          sku_exceptions: list,
                          user_role: str = "DS") -> dict:

    rag_results = []
    for seg in priority_segments:
        ctx = get_rag_context(
            query=f"exception override history {seg}",
            client_id=client_id,
            user_role=user_role,
        )
        rag_results.extend(ctx.get("results", [])[:2])

    rag_summary = "\n".join(
        f"[{r['doc_id']}] {r['content'][:200]}..."
        for r in rag_results
    ) or "No prior context found."

    user_message = f"""Cycle: {cycle_id}
Client: {client_id}
Priority segments: {priority_segments}
SKU exceptions to triage: {json.dumps(sku_exceptions, indent=2)}

Prior context from knowledge base:
{rag_summary}

Classify each exception and return the ranked queue as JSON."""

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


