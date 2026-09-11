"""
Orchestrator: chains all agents for a full forecast cycle run.
Returns structured output for SSE streaming to frontend.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.trigger_router import run_trigger_router
from agents.exception_triage import run_exception_triage
from agents.rca_diagnostic import run_rca_diagnostic
from agents.retrain_override import run_retrain_override
from agents.eval_agent import run_eval_agent


def run_full_cycle(scenario: dict, user_role: str = "DS") -> dict:
    """
    Full agent chain for one forecast cycle.
    scenario keys: forecast_summary, config, escalation_flag,
                   prior_accuracy, sku_exceptions, pipeline_data
    """
    results = {}

    # Step 1: Trigger Router
    print("Running Trigger Router...")
    routing = run_trigger_router(
        forecast_summary=scenario["forecast_summary"],
        config=scenario["config"],
        escalation_flag=scenario.get("escalation_flag", False),
        prior_accuracy=scenario["prior_accuracy"],
    )
    results["trigger_router"] = routing

    client_id       = routing["client_id"]
    agents_activated = routing.get("agents_activated", [])
    priority_segs   = routing.get("priority_segments", [])

    # Step 2: Exception Triage (always runs if activated)
    if any("exception_triage" in a.lower() for a in agents_activated):
        print("Running Exception Triage...")
        triage = run_exception_triage(
            cycle_id=routing["cycle_id"],
            client_id=client_id,
            priority_segments=priority_segs,
            sku_exceptions=scenario.get("sku_exceptions", []),
            user_role=user_role,
        )
        results["exception_triage"] = triage

    # Step 3: RCA Diagnostic
    if any("rca_diagnostic" in a.lower() for a in agents_activated):
        print("Running RCA Diagnostic...")
        rca = run_rca_diagnostic(
            cycle_id=routing["cycle_id"],
            client_id=client_id,
            degraded_segment=priority_segs[0] if priority_segs else "unknown",
            degradation_summary=scenario.get(
                "degradation_summary",
                scenario["forecast_summary"]
                    .get("segments_with_accuracy_breach", [{}])[0]
            ),
            pipeline_data=scenario.get("pipeline_data", {}),
            user_role=user_role,
        )
        results["rca_diagnostic"] = rca

        # Step 4: Eval on RCA
        print("Running Eval on RCA...")
        rca_eval = run_eval_agent("rca_diagnostic", rca)
        results["rca_eval"] = rca_eval

        # Step 5: Retrain/Override if RCA triggers it
        if rca.get("downstream_trigger") in ("retrain", "override"):
            print("Running Retrain/Override Agent...")
            retrain = run_retrain_override(
                cycle_id=routing["cycle_id"],
                client_id=client_id,
                rca_output=rca,
                degradation_history=scenario.get("degradation_history", []),
                user_role=user_role,
            )
            results["retrain_override"] = retrain

            print("Running Eval on Retrain/Override...")
            retrain_eval = run_eval_agent("retrain_override", retrain)
            results["retrain_override_eval"] = retrain_eval

    return results



# Fictional example inputs; not connected to any enterprise feed.
DEMO_SCENARIOS = {'velora_cycle_18': {'forecast_summary': {'cycle_id': 'VL-DEMO-018',
                                          'client_id': 'VELORA',
                                          'total_skus': 360,
                                          'skus_with_delta_above_threshold': 12,
                                          'segments_with_accuracy_breach': [{'segment': 'Spring '
                                                                                        'confectionery',
                                                                             'wMAPE_prior': 8.6,
                                                                             'wMAPE_current': 12.7,
                                                                             'bias': 0.15}],
                                          'data_quality_flags': 1,
                                          'trade_calendar_events': ['Fictional spring event']},
                     'config': {'delta_threshold': 0.12,
                                'bias_threshold': 0.13,
                                'degradation_threshold_wMAPE': 2.5,
                                'sustained_degradation_cycles': 3},
                     'escalation_flag': False,
                     'prior_accuracy': {'wMAPE': 8.6, 'bias': 0.06},
                     'sku_exceptions': [{'sku_id': 'VL-COCOA-FEED',
                                         'location_id': 'Maplebridge Market',
                                         'forecast_delta_pct': 0.29,
                                         'bias_history': [0.06, 0.1, 0.15],
                                         'data_quality_score': 0.46,
                                         'trade_calendar_event': None}],
                     'degradation_summary': {'wMAPE_prior': 8.6,
                                             'wMAPE_current': 12.7,
                                             'bias_current': 0.15,
                                             'cycles_degraded': 3},
                     'pipeline_data': {'feed_freshness': {'Maplebridge Market': '4 sample days '
                                                                                'missing'},
                                       'pipeline_failures': ['Synthetic quantity-field rename '
                                                             'rejected by validator'],
                                       'data_quality_scores': {'sample_feed': 0.46},
                                       'feature_drift': {'seasonal demand coefficient': 0.73},
                                       'model_metadata': {'model_id': 'demo_seasonal_v3',
                                                          'last_trained': '2026-02-13'},
                                       'trade_calendar': ['Fictional spring event 2026-04-27 to '
                                                          '2026-05-03']},
                     'degradation_history': [{'cycle': 16, 'wMAPE': 8.6, 'bias': 0.06},
                                             {'cycle': 17, 'wMAPE': 10.4, 'bias': 0.1},
                                             {'cycle': 18, 'wMAPE': 12.7, 'bias': 0.15}]},
 'nuvora_cycle_18': {'forecast_summary': {'cycle_id': 'NV-DEMO-018',
                                          'client_id': 'NUVORA',
                                          'total_skus': 520,
                                          'skus_with_delta_above_threshold': 15,
                                          'segments_with_accuracy_breach': [{'segment': 'Modular '
                                                                                        'building '
                                                                                        'materials',
                                                                             'wMAPE_prior': 8.6,
                                                                             'wMAPE_current': 12.7,
                                                                             'bias': 0.15}],
                                          'data_quality_flags': 1,
                                          'trade_calendar_events': ['Fictional spring event']},
                     'config': {'delta_threshold': 0.12,
                                'bias_threshold': 0.13,
                                'degradation_threshold_wMAPE': 2.5,
                                'sustained_degradation_cycles': 3},
                     'escalation_flag': False,
                     'prior_accuracy': {'wMAPE': 8.6, 'bias': 0.06},
                     'sku_exceptions': [{'sku_id': 'NV-CERAMIC-FEED',
                                         'location_id': 'Elmport Supply',
                                         'forecast_delta_pct': 0.29,
                                         'bias_history': [0.06, 0.1, 0.15],
                                         'data_quality_score': 0.46,
                                         'trade_calendar_event': None}],
                     'degradation_summary': {'wMAPE_prior': 8.6,
                                             'wMAPE_current': 12.7,
                                             'bias_current': 0.15,
                                             'cycles_degraded': 3},
                     'pipeline_data': {'feed_freshness': {'Elmport Supply': '4 sample days '
                                                                            'missing'},
                                       'pipeline_failures': ['Synthetic quantity-field rename '
                                                             'rejected by validator'],
                                       'data_quality_scores': {'sample_feed': 0.46},
                                       'feature_drift': {'project mix distribution': 0.69},
                                       'model_metadata': {'model_id': 'demo_project_v3',
                                                          'last_trained': '2026-02-13'},
                                       'trade_calendar': ['Fictional spring event 2026-04-27 to '
                                                          '2026-05-03']},
                     'degradation_history': [{'cycle': 16, 'wMAPE': 8.6, 'bias': 0.06},
                                             {'cycle': 17, 'wMAPE': 10.4, 'bias': 0.1},
                                             {'cycle': 18, 'wMAPE': 12.7, 'bias': 0.15}]},
 'terralune_cycle_18': {'forecast_summary': {'cycle_id': 'TL-DEMO-018',
                                             'client_id': 'TERRALUNE',
                                             'total_skus': 280,
                                             'skus_with_delta_above_threshold': 9,
                                             'segments_with_accuracy_breach': [{'segment': 'Urban '
                                                                                           'delivery '
                                                                                           'mobility',
                                                                                'wMAPE_prior': 8.6,
                                                                                'wMAPE_current': 12.7,
                                                                                'bias': 0.15}],
                                             'data_quality_flags': 1,
                                             'trade_calendar_events': ['Fictional spring event']},
                        'config': {'delta_threshold': 0.12,
                                   'bias_threshold': 0.13,
                                   'degradation_threshold_wMAPE': 2.5,
                                   'sustained_degradation_cycles': 3},
                        'escalation_flag': False,
                        'prior_accuracy': {'wMAPE': 8.6, 'bias': 0.06},
                        'sku_exceptions': [{'sku_id': 'TL-CARGO-FEED',
                                            'location_id': 'Harborline Fleet',
                                            'forecast_delta_pct': 0.29,
                                            'bias_history': [0.06, 0.1, 0.15],
                                            'data_quality_score': 0.46,
                                            'trade_calendar_event': None}],
                        'degradation_summary': {'wMAPE_prior': 8.6,
                                                'wMAPE_current': 12.7,
                                                'bias_current': 0.15,
                                                'cycles_degraded': 3},
                        'pipeline_data': {'feed_freshness': {'Harborline Fleet': '4 sample days '
                                                                                 'missing'},
                                          'pipeline_failures': ['Synthetic quantity-field rename '
                                                                'rejected by validator'],
                                          'data_quality_scores': {'sample_feed': 0.46},
                                          'feature_drift': {'fleet service age': 0.76},
                                          'model_metadata': {'model_id': 'demo_service_v3',
                                                             'last_trained': '2026-02-13'},
                                          'trade_calendar': ['Fictional spring event 2026-04-27 to '
                                                             '2026-05-03']},
                        'degradation_history': [{'cycle': 16, 'wMAPE': 8.6, 'bias': 0.06},
                                                {'cycle': 17, 'wMAPE': 10.4, 'bias': 0.1},
                                                {'cycle': 18, 'wMAPE': 12.7, 'bias': 0.15}]}}

def get_scenarios():
    return DEMO_SCENARIOS
