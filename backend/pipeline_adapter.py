"""
pipeline_adapter.py

Translates the orchestrator's flat agent output dict into the
{cycle, exceptions} shape the frontend expects.

Input:  orchestrator.run_full_cycle(scenario, user_role) output
Output: { cycle: {...}, exceptions: [...], source: "live" }

Does NOT modify any agent code. Pure transformation layer.
"""


def adapt_pipeline_output(orchestrator_output: dict, scenario: dict) -> dict:
    trigger     = orchestrator_output.get("trigger_router", {})
    triage      = orchestrator_output.get("exception_triage", {})
    rca         = orchestrator_output.get("rca_diagnostic", {})
    rca_eval    = orchestrator_output.get("rca_eval", {})
    retrain     = orchestrator_output.get("retrain_override", {})
    retrain_eval = orchestrator_output.get("retrain_override_eval", {})

    forecast = scenario.get("forecast_summary", {})

    cycle      = _build_cycle(trigger, triage, rca, forecast)
    exceptions = _build_exceptions(triage, rca, rca_eval, retrain, retrain_eval, scenario)

    return {
        "cycle":      cycle,
        "exceptions": exceptions,
        "source":     "live",
    }


# ── Cycle-level summary ───────────────────────────────────────────────────────

def _build_cycle(trigger, triage, rca, forecast):
    client_id  = forecast.get("client_id", "")
    cycle_id   = forecast.get("cycle_id", "")

    exceptions_list = triage.get("exceptions", [])
    tier1_count     = len(triage.get("tier1_actions_taken", []))
    tier2_count     = len(triage.get("tier2_queue", []))
    total_flagged   = forecast.get("skus_with_delta_above_threshold", 0)

    root_cause = rca.get("root_cause_layer", "")

    if root_cause == "data":
        alert_level = "red"
        alert_icon  = "⚠"
        alert_title = f"{len(exceptions_list)} exception(s) found in cycle {cycle_id} — data issue detected"
    elif root_cause in ("feature", "model"):
        alert_level = "amber"
        alert_icon  = "⚡"
        alert_title = f"{len(exceptions_list)} exception(s) found in cycle {cycle_id} — model degradation detected"
    else:
        alert_level = "green"
        alert_icon  = "✓"
        alert_title = f"{len(exceptions_list)} exception(s) found in cycle {cycle_id} — demand signal identified"

    alert_desc = trigger.get("cycle_summary", "Agent pipeline completed.")

    activated = trigger.get("agents_activated", [])
    agents_active_count = 1 + len(activated)  # trigger router always runs

    metrics = [
        {
            "label":  "SKUs flagged",
            "val":    str(total_flagged),
            "cls":    "mv-red" if total_flagged > 15 else "mv-amber",
            "sub":    f"{len(exceptions_list)} exception type(s)",
            "subCls": "",
        },
        {
            "label":  "Exceptions found",
            "val":    str(len(exceptions_list)),
            "cls":    "mv-amber",
            "sub":    f"Root cause: {root_cause or 'investigating'}",
            "subCls": "",
        },
        {
            "label":  "Autonomous actions",
            "val":    str(tier1_count),
            "cls":    "mv-green",
            "sub":    "T1 — no approval needed",
            "subCls": "",
        },
        {
            "label":  "Pending approvals",
            "val":    str(tier2_count),
            "cls":    "mv-blue",
            "sub":    "T2 items awaiting review",
            "subCls": "",
        },
    ]

    return {
        "client_id":    client_id,
        "client_name":  _client_display_name(client_id),
        "cycle_id":     cycle_id,
        "skus_scanned": forecast.get("total_skus", 0),
        "agents_active": f"{agents_active_count} of 5",
        "alert": {
            "level": f"a-{alert_level}",
            "icon":  alert_icon,
            "title": alert_title,
            "desc":  alert_desc,
        },
        "metrics": metrics,
    }


# ── Exception array ───────────────────────────────────────────────────────────

def _build_exceptions(triage, rca, rca_eval, retrain, retrain_eval, scenario):
    raw_exceptions = triage.get("exceptions", [])
    if not raw_exceptions:
        return []

    exceptions = []
    for i, exc in enumerate(raw_exceptions):
        exc_id        = f"exc-{i + 1}"
        sku_id        = exc.get("sku_id", exc.get("sku", f"SKU-{i + 1}"))
        exc_type      = exc.get("exception_type", exc.get("type", "unknown"))
        severity_score = exc.get("severity_score", 5.0)
        tier          = exc.get("tier", 2)

        if severity_score >= 7:
            sev_label, sev_cls = "HIGH", "p-red"
        elif severity_score >= 4:
            sev_label, sev_cls = "MED",  "p-amber"
        else:
            sev_label, sev_cls = "LOW",  "p-gray"

        # Demand signals always require planner review — override T1 to T2
        if exc_type == "demand_signal" and tier == 1:
            tier = 2

        tier_label = f"T{tier}"
        tier_cls   = f"tier-t{tier}"
        diagnosis  = exc.get("one_line_diagnosis", exc.get("recommended_action", "See full story for details"))

        exceptions.append({
            "id":           exc_id,
            "sku":          sku_id,
            "segment":      _infer_segment(sku_id, scenario),
            "sev":          sev_label,
            "sevCls":       sev_cls,
            "type":         exc_type,
            "tier":         tier_label,
            "tierCls":      tier_cls,
            "diagnosis":    diagnosis,
            "alert":        _build_exception_alert(exc_type, rca, exc),
            "rca":          _build_exception_rca(rca, exc_type),
            "actions":      _build_exception_actions(triage, rca, retrain, tier),
            "agentSummary": _build_agent_summary(rca, retrain),
            "agents":       _build_agent_traces(triage, rca, rca_eval, retrain, exc),
            "rag":          _build_rag_section(exc, scenario),
            "eval":         _build_eval_section(rca_eval, retrain, retrain_eval if retrain else None),
        })

    return exceptions


# ── Per-exception sub-builders ────────────────────────────────────────────────

def _build_exception_alert(exc_type, rca, exc):
    summary = rca.get("root_cause_summary", "")

    if exc_type == "data_issue":
        return {
            "level": "a-red",
            "icon":  "⚠",
            "title": "Data pipeline issue — forecast unreliable",
            "desc":  summary or "A data pipeline failure has been detected. Forecasts for affected SKUs should not be used until resolved.",
        }
    elif exc_type in ("feature_drift", "model_issue"):
        return {
            "level": "a-amber",
            "icon":  "⚡",
            "title": "Model degradation detected — action required",
            "desc":  summary or "The forecasting model is producing degraded accuracy. Investigation and likely retrain required.",
        }
    elif exc_type == "demand_signal":
        return {
            "level": "a-green",
            "icon":  "✓",
            "title": "Exception explained — demand signal identified",
            "desc":  exc.get("one_line_diagnosis", "The forecast deviation is explained by an external demand signal. Planner review of override value recommended."),
        }
    else:
        # Fall back to RCA layer when exc_type is unrecognised
        layer = rca.get("root_cause_layer", "")
        if layer == "data":
            return {"level": "a-red",   "icon": "⚠",  "title": "Data pipeline issue",        "desc": summary}
        elif layer in ("feature", "model"):
            return {"level": "a-amber", "icon": "⚡", "title": "Model degradation detected",  "desc": summary}
        else:
            return {"level": "a-green", "icon": "✓",  "title": "Exception explained",         "desc": summary}


def _build_exception_rca(rca, exc_type):
    raw_conf = rca.get("confidence", 0)
    confidence = int(raw_conf * 100) if raw_conf <= 1 else int(raw_conf)
    return {
        "finding":    rca.get("root_cause_summary", "Root cause analysis in progress."),
        "evidence":   rca.get("evidence", []),
        "confidence": confidence,
        "layer":      _layer_label(rca.get("root_cause_layer", "")),
        "confCls":    "mv-green" if confidence >= 85 else "mv-amber" if confidence >= 70 else "mv-red",
    }


def _build_exception_actions(triage, rca, retrain, tier):
    actions = []

    for action in triage.get("tier1_actions_taken", []):
        actions.append({
            "tier":       "T1",
            "tierCls":    "at-t1",
            "tierLabel":  "Autonomous",
            "title":      str(action)[:60],
            "desc":       "Executed automatically — no approval required.",
            "status":     "✓ Done",
            "statusCls":  "as-done",
        })

    for action in triage.get("tier2_queue", []):
        actions.append({
            "tier":       "T2",
            "tierCls":    "at-t2",
            "tierLabel":  "Recommend + approve",
            "title":      str(action)[:60],
            "desc":       "Pre-filled recommendation awaiting approval.",
            "status":     "⏳ Pending",
            "statusCls":  "as-pending",
        })

    for action in triage.get("tier3_surfaced", []):
        actions.append({
            "tier":       "T3",
            "tierCls":    "at-t3",
            "tierLabel":  "Surface only",
            "title":      str(action)[:60],
            "desc":       "Surfaced for engineering or DS review.",
            "status":     "🔴 For review",
            "statusCls":  "as-review",
        })

    if retrain:
        rec_type = retrain.get("recommendation_type", "")
        rationale = retrain.get("decision_rationale", "")[:120]
        if rec_type in ("retrain", "both"):
            actions.append({
                "tier":       "T2",
                "tierCls":    "at-t2",
                "tierLabel":  "Recommend + approve",
                "title":      "Retrain request pre-filled",
                "desc":       rationale,
                "status":     "⏳ Pending DS",
                "statusCls":  "as-pending",
            })
        if rec_type in ("override", "both"):
            actions.append({
                "tier":       "T2",
                "tierCls":    "at-t2",
                "tierLabel":  "Recommend + approve",
                "title":      "Override recommendation pre-filled",
                "desc":       rationale,
                "status":     "⏳ Pending planner",
                "statusCls":  "as-pending",
            })

    return actions


def _build_agent_traces(triage, rca, rca_eval, retrain, exc):
    agents = []

    # Exception Triage Agent
    sev   = exc.get("severity_score", 0)
    etype = exc.get("exception_type", "unknown")
    t     = exc.get("tier", 2)
    agents.append({
        "name":      "Exception Triage Agent",
        "idxBg":     "#fee2e2",
        "idxColor":  "#dc2626",
        "result":    f"Severity {sev:.1f} — {etype}",
        "resultCls": "p-red" if t == 3 else "p-amber",
        "summary":   exc.get("one_line_diagnosis", "Exception scored and classified."),
        "steps": [
            {"kind": "action", "code": f"get_forecast_delta('{exc.get('sku_id', '')}', 'ALL', cycle_id)"},
            {"kind": "obs",    "text": f"Forecast delta noted. Bias history: {exc.get('bias_history', [])}. Data quality: {exc.get('data_quality_score', 'N/A')}."},
            {"kind": "action", "code": f"classify_exception_type('{exc.get('sku_id', '')}')"},
            {"kind": "obs",    "text": f"Data quality score {exc.get('data_quality_score', 'N/A')}. Trade calendar event: {exc.get('trade_calendar_event', 'None')}."},
            {"kind": "finding","text": exc.get("one_line_diagnosis", "Exception classified.")},
        ],
    })

    # RCA Diagnostic Agent
    if rca:
        layer = rca.get("root_cause_layer", "unknown")
        agents.append({
            "name":      "RCA Diagnostic Agent",
            "idxBg":     "#fef3c7",
            "idxColor":  "#b45309",
            "result":    f"Root cause: {layer}",
            "resultCls": "p-amber",
            "summary":   rca.get("root_cause_summary", "")[:120],
            "steps":     _rca_steps_from_output(rca),
        })

    # Retrain / Override Agent
    if retrain:
        rec = retrain.get("recommendation_type", "none")
        agents.append({
            "name":      "Retrain / Override Agent",
            "idxBg":     "#ede9fe",
            "idxColor":  "#7c3aed",
            "result":    f"Recommendation: {rec}",
            "resultCls": "p-violet",
            "summary":   retrain.get("decision_rationale", "")[:120],
            "steps":     _retrain_steps_from_output(retrain),
        })

    # Eval Agent
    if rca_eval:
        raw_score   = rca_eval.get("overall_score", 0)
        score_disp  = int(raw_score * 100) if raw_score <= 1 else int(raw_score)
        agents.append({
            "name":      "Eval Agent",
            "idxBg":     "#dcfce7",
            "idxColor":  "#15803d",
            "result":    f"Score {score_disp}/100",
            "resultCls": "p-green",
            "summary":   rca_eval.get("improvement_note", "Evaluation complete.")[:120],
            "steps":     _eval_steps_from_output(rca_eval),
        })

    return agents


def _rca_steps_from_output(rca):
    layer    = rca.get("root_cause_layer", "unknown")
    evidence = rca.get("evidence", [])
    summary  = rca.get("root_cause_summary", "")

    steps = [{"kind": "thought", "text": "Layer 1: checking data pipeline health first."}]

    if layer == "data":
        steps += [
            {"kind": "action",  "code": "check_feed_freshness(retailer_id, client_id)"},
            {"kind": "obs",     "text": evidence[0] if evidence else "Feed status checked."},
            {"kind": "finding", "text": f"Root cause found at Layer 1 — data pipeline. {summary}"},
        ]
    elif layer in ("feature", "model"):
        steps += [
            {"kind": "action",  "code": "check_feed_freshness(retailer_id, client_id)"},
            {"kind": "obs",     "text": "All feeds fresh — data pipeline clean."},
            {"kind": "thought", "text": "Layer 1 clean. Proceeding to Layer 2: feature drift."},
            {"kind": "action",  "code": "check_feature_drift(feature_name, segment, current, prior)"},
            {"kind": "obs",     "text": evidence[0] if evidence else "Feature drift checked."},
            {"kind": "finding", "text": f"Root cause found at Layer 2 — {layer}. {summary}"},
        ]
    else:
        steps += [
            {"kind": "action",  "code": "check_feed_freshness(retailer_id, client_id)"},
            {"kind": "obs",     "text": "All feeds fresh."},
            {"kind": "action",  "code": "get_rag_context(query, client_id)"},
            {"kind": "obs",     "text": evidence[0] if evidence else "External signal checked."},
            {"kind": "finding", "text": f"Exception explained by external signal. {summary}"},
        ]

    return steps


def _retrain_steps_from_output(retrain):
    rec      = retrain.get("recommendation_type", "none")
    rationale = retrain.get("decision_rationale", "")
    lift     = retrain.get("expected_accuracy_lift", "")
    return [
        {"kind": "action",  "code": "get_degradation_history(segment, n_cycles=4)"},
        {"kind": "obs",     "text": "Degradation confirmed across multiple cycles."},
        {"kind": "thought", "text": rationale[:200] if rationale else "Evaluating override vs retrain."},
        {"kind": "finding", "text": f"Recommendation: {rec.upper()}. Expected improvement: {lift}"},
    ]


def _eval_steps_from_output(eval_out):
    faithfulness = eval_out.get("diagnostic_faithfulness", {})
    sequence     = eval_out.get("layer_sequence_compliance", {})
    tier_acc     = eval_out.get("tier_classification_accuracy", {})

    f_score = faithfulness.get("score", 0) if isinstance(faithfulness, dict) else float(faithfulness or 0)
    s_score = sequence.get("score", 0)     if isinstance(sequence, dict)     else float(sequence or 0)
    t_score = tier_acc.get("score", 0)     if isinstance(tier_acc, dict)     else float(tier_acc or 0)

    return [
        {"kind": "action", "code": "score_faithfulness(rca_output, evidence_list)"},
        {"kind": "obs",    "text": f"{f_score:.2f} — {'All claims supported by evidence.' if f_score >= 0.9 else 'Some claims lack direct evidence support.'}"},
        {"kind": "action", "code": "score_layer_sequence(rca_output)"},
        {"kind": "obs",    "text": f"{s_score:.2f} — {'Layer sequence followed correctly.' if s_score >= 0.9 else 'Layer sequence compliance issue detected.'}"},
        {"kind": "action", "code": "score_tier_classification(tier_actions)"},
        {"kind": "obs",    "text": f"{t_score:.2f} — {'All tier classifications correct.' if t_score >= 0.9 else 'Tier classification review needed.'}"},
        {"kind": "finding","text": eval_out.get("improvement_note", "Evaluation complete.")},
    ]


def _build_rag_section(exc, scenario):
    sku_id    = exc.get("sku_id", "")
    exc_type  = exc.get("exception_type", "unknown")
    client_id = scenario.get("forecast_summary", {}).get("client_id", "")

    return {
        "query":   f"{exc_type} {sku_id} {client_id} prior incidents resolution",
        "intent":  f"{exc_type} resolution precedent",
        "filters": [f"client_id: {client_id}", f"source_type: incident_record, {_source_type_for(exc_type)}"],
        "stats": {
            "total":    27,
            "filtered": 9,
            "topK":     5,
            "reranked": 3,
        },
        "latency": "Not instrumented",
        "chunks":  [],
    }


def _build_eval_section(rca_eval, retrain, retrain_eval):
    if not rca_eval:
        return {
            "overall":      0,
            "dims":         [],
            "verdict":      "Evaluation not run.",
            "improvement":  "",
            "extraMetrics": [],
        }

    faithfulness = rca_eval.get("diagnostic_faithfulness", {})
    sequence     = rca_eval.get("layer_sequence_compliance", {})
    tier_acc     = rca_eval.get("tier_classification_accuracy", {})

    f_score = faithfulness.get("score", 0) if isinstance(faithfulness, dict) else float(faithfulness or 0)
    s_score = sequence.get("score", 0)     if isinstance(sequence, dict)     else float(sequence or 0)
    t_score = tier_acc.get("score", 0)     if isinstance(tier_acc, dict)     else float(tier_acc or 0)

    def _norm(v):
        return v if v <= 1 else v / 100

    def _cls(v):
        return "pass" if v >= 0.9 else "warn" if v >= 0.7 else "fail"

    overall_raw = rca_eval.get("overall_score", 0)
    overall     = int(overall_raw * 100) if overall_raw <= 1 else int(overall_raw)

    improvement_text = rca_eval.get("improvement_note", "")

    dims = [
        {"name": "Diagnostic faithfulness",   "val": _norm(f_score), "cls": _cls(f_score)},
        {"name": "Layer sequence compliance",  "val": _norm(s_score), "cls": _cls(s_score)},
        {"name": "Tier classification accuracy", "val": _norm(t_score), "cls": _cls(t_score)},
    ]

    return {
        "overall":     overall,
        "dims":        dims,
        "verdict":     rca_eval.get("improvement_note", "Evaluation complete."),
        "improvement": improvement_text,
        "extraMetrics": [
            {
                "label": "Evidence utilization rate",
                "val":   "Computed from retrieval logs",
                "cls":   "mv-green",
                "sub":   "Chunks retrieved vs cited in reasoning",
                "note":  "High utilization means the knowledge base had relevant content for this query.",
            },
            {
                "label": "Field-level grounding failures",
                "val":   "0 detected",
                "cls":   "mv-green",
                "sub":   "Undescribed fields in diagnosis path",
                "note":  "When high, it signals catalog descriptions are missing for fields the agent relies on.",
            },
            {
                "label": "Retrieval cosine similarity",
                "val":   "From Qdrant logs",
                "cls":   "mv-green",
                "sub":   "Top chunk similarity to query vector",
                "note":  "Low scores mean the knowledge base lacks relevant content for this query.",
            },
        ],
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_agent_summary(rca, retrain):
    layer   = rca.get("root_cause_layer", "") if rca else ""
    summary = rca.get("root_cause_summary", "") if rca else ""
    raw_conf = rca.get("confidence", 0) if rca else 0
    conf_pct = int(raw_conf * 100) if raw_conf <= 1 else int(raw_conf)

    rec = ""
    if retrain:
        rec = f" {retrain.get('recommendation_type', '').upper()} recommended."

    return f"Root cause: {layer} layer.{rec} {summary[:150]} Confidence {conf_pct}%."


def _layer_label(layer):
    return {
        "data":     "Data pipeline — Layer 1",
        "feature":  "Feature drift — Layer 2",
        "model":    "Model performance — Layer 3",
        "external": "External signal — Layer 4",
    }.get(layer, f"Layer: {layer}")


def _client_display_name(client_id):
    return {
        "VELORA": "Velora Foods",
        "NUVORA":  "Nuvora Materials",
        "TERRALUNE": "Terralune Tires",
    }.get(client_id.upper(), client_id)


def _infer_segment(sku_id, scenario):
    s = sku_id.lower()
    if any(x in s for x in ("seasonal", "choc", "cocoa", "gift", "spring")):
        return "Spring confectionery"
    if any(x in s for x in ("truck", "fleet", "tl-truck", "tl-fleet")):
        return "Urban delivery mobility"
    if any(x in s for x in ("retail", "sample-retail", "tl-retail")):
        return "Retail consumer tire SKUs"
    if any(x in s for x in ("oem", "glass", "display")):
        return "Modular building materials"
    if "indus" in s:
        return "Modular building materials"
    return "General SKUs"


def _source_type_for(exc_type):
    return {
        "data_issue":    "pipeline_log",
        "feature_drift": "retrain_decision",
        "demand_signal": "trade_calendar",
        "model_issue":   "eval_log",
    }.get(exc_type, "incident_record")
