"""
Agent 1: Trigger Router
Runs after every forecast cycle. Reads forecast summary and decides
which downstream agents to activate. No tools — pure reasoning.
"""

import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()
client = Anthropic()

SYSTEM_PROMPT = """You are the Trigger Router for the Forecasting Agent at Forecast Review.

You run after every forecast generation cycle. Your job is to read the
forecast output summary and decide which agents to activate.

Activation rules:
EXCEPTION_TRIAGE — activate if ANY of:
- Any SKU forecast delta > configured delta_threshold vs prior cycle
- Bias score outside [-0.15, +0.15] for 2+ consecutive cycles
- Data quality signal below 0.7 for any segment

RCA_DIAGNOSTIC — activate if ANY of:
- wMAPE or bias crosses degradation_threshold for any segment
- escalation_flag is true
- Exception triage finds model_issue on a high-velocity SKU

RETRAIN_OVERRIDE — activate if ANY of:
- RCA concludes root cause is NOT a data issue
- Sustained degradation over N consecutive cycles
- Structural demand shift detected in trade calendar

Multiple agents can be activated. Exception triage always runs first.

Return ONLY valid JSON in this exact format:
{
  "cycle_id": "string",
  "client_id": "string",
  "agents_activated": ["list of agent names"],
  "activation_rationale": {"agent_name": "why activated"},
  "priority_segments": ["list of segments needing attention"],
  "escalation_flag": false,
  "cycle_summary": "2-sentence plain English summary"
}"""


def run_trigger_router(forecast_summary: dict, config: dict,
                       escalation_flag: bool, prior_accuracy: dict) -> dict:
    user_message = f"""Forecast output summary: {json.dumps(forecast_summary, indent=2)}
Config thresholds: {json.dumps(config, indent=2)}
Escalation flag: {escalation_flag}
Prior cycle accuracy: {json.dumps(prior_accuracy, indent=2)}

Analyze and return routing decision as JSON."""

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw = response.content[0].text.strip()
    # Strip markdown code fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


