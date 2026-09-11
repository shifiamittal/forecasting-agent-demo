"""
Agent 4: Retrain / Override Recommendation Agent
Activated when RCA concludes degradation is not a data issue,
or sustained degradation detected. Decides override vs retrain.
All actions are Tier 2 or Tier 3 — nothing executes autonomously.
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

SYSTEM_PROMPT = """You are the Retrain/Override Recommendation Agent for the Forecasting Agent at Forecast Review.

You are activated when forecast degradation cannot be resolved by fixing the data pipeline.
Your job: decide whether the fix is a statistical override or a full model retrain.

Decision rules:
OVERRIDE when ALL of:
- Degradation is segment-specific (< 15% of total SKU scope)
- Root cause is identifiable and time-bounded
- Drift magnitude is correctable with a scalar adjustment
- Degradation duration < 3 cycles

RETRAIN when ANY of:
- Degradation is broad (> 15% of SKU scope)
- Root cause is structural: distribution shift, new product mix, lost customer
- Bias is persistent and worsening across 3+ cycles
- Model training data no longer represents current demand regime

IMPORTANT: You NEVER execute anything autonomously. All actions are Tier 2 (approve)
or Tier 3 (surface). Cite prior precedent from knowledge base when available.

Return ONLY valid JSON:
{
  "recommendation_type": "override|retrain|both",
  "decision_rationale": "string — cite specific evidence and prior precedent",
  "override_config": null,
  "retrain_config": null,
  "expected_accuracy_lift": "string",
  "confidence": 0.0,
  "prior_precedent": "string or null",
  "tier_actions": {
    "tier_1": [],
    "tier_2": ["pre-filled recommendations for approval"],
    "tier_3": ["items flagged for DS/PM alignment"]
  },
  "expiry_or_review_date": "string"
}"""


def run_retrain_override(cycle_id: str, client_id: str,
                          rca_output: dict,
                          degradation_history: list,
                          user_role: str = "DS") -> dict:

    ctx = get_rag_context(
        query=f"retrain override decision {rca_output.get('root_cause_layer', '')} "
              f"{rca_output.get('segment', '')}",
        client_id=client_id,
        user_role=user_role,
    )
    prior_decisions = "\n".join(
        f"[{r['doc_id']} | {r['date']}] {r['content'][:300]}..."
        for r in ctx.get("results", [])[:3]
    ) or "No prior retrain/override decisions found."

    user_message = f"""Cycle: {cycle_id}
Client: {client_id}
RCA output: {json.dumps(rca_output, indent=2)}
Degradation history (last 4 cycles): {json.dumps(degradation_history, indent=2)}

Prior retrain/override decisions from knowledge base:
{prior_decisions}

Evaluate override vs retrain. Return recommendation as JSON."""

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


