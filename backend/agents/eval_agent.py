"""
Agent 5: Eval Agent
Runs asynchronously after every RCA and recommendation.
Scores on three dimensions: faithfulness, layer sequence compliance,
tier classification accuracy.
Feeds findings back into agent improvement loop.
"""

import os
import json
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic()

SYSTEM_PROMPT = """You are the Eval Agent for the Forecasting Agent at Forecast Review.

You evaluate the quality of RCA diagnoses and retrain/override recommendations.
Score on three dimensions:

DIMENSION 1 — DIAGNOSTIC FAITHFULNESS (0.0-1.0)
Are all claims directly supported by listed evidence?
Any conclusion without explicit evidence = deduction.
1.0 = every claim has evidence. 0.0 = conclusions without evidence.

DIMENSION 2 — LAYER SEQUENCE COMPLIANCE (0.0-1.0)
For RCA: did it follow data → feature → model → external?
Did it stop at the layer where root cause was found?
1.0 = correct sequence. 0.0 = layers skipped or wrong order.
For retrain/override: did it apply override vs retrain decision rules correctly?

DIMENSION 3 — TIER CLASSIFICATION ACCURACY (0.0-1.0)
Were actions correctly classified by reversibility and stakes?
1.0 = all tiers correct. 0.0 = autonomous action on irreversible decision.
CRITICAL: any Tier 1 action on an irreversible decision = 0.0 + immediate flag.

Thresholds:
- tier_classification_accuracy < 0.9 → action_required = "agent_prompt_review"
- Any Tier 1 irreversible action → action_required = "immediate_escalation"
- Overall score < 0.75 → action_required = "flag_for_review"

Return ONLY valid JSON:
{
  "diagnostic_faithfulness": {
    "score": 0.0,
    "rationale": "string",
    "unsupported_claims": ["list or empty"]
  },
  "layer_sequence_compliance": {
    "score": 0.0,
    "rationale": "string"
  },
  "tier_classification_accuracy": {
    "score": 0.0,
    "rationale": "string",
    "misclassified_actions": ["list or empty"]
  },
  "overall_score": 0.0,
  "action_required": "none|flag_for_review|agent_prompt_review|immediate_escalation",
  "improvement_note": "string — specific actionable suggestion"
}"""


def run_eval_agent(agent_name: str, agent_output: dict) -> dict:
    user_message = f"""Agent evaluated: {agent_name}
Output to evaluate:
{json.dumps(agent_output, indent=2)}

Score this output on all three dimensions and return evaluation as JSON."""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    result = json.loads(raw.strip())
    result["agent_evaluated"] = agent_name
    return result


