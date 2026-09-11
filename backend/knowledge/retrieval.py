"""
RAG Knowledge Agent — retrieval pipeline.
Implements: NL query router -> pre-filter -> semantic search -> re-rank.

Three enterprise access control-aligned design decisions:
1. Metadata catalog: every chunk tagged with source_type, client, role, segment
2. Permission graph: visible_to filter scopes retrieval by user_role
3. NL query router: intent classification pre-selects source_types before
   vector search — answers "how does the backend know which dataset to call"
"""

import os
import json
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny
from sentence_transformers import SentenceTransformer

load_dotenv()

COLLECTION_NAME = "forecasting_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

INTENT_ROUTING = {
    "data_issue": {
        "signals": [
            "feed", "stale", "missing", "pipeline", "ingestion",
            "outage", "blocked", "schema", "timeout", "duplicate"
        ],
        "source_types": ["incident_record", "readiness_report"],
    },
    "model_issue": {
        "signals": [
            "drift", "bias", "wmape", "accuracy", "degradation",
            "retrain", "model", "worsening", "performance"
        ],
        "source_types": ["incident_record", "retrain_decision"],
    },
    "override": {
        "signals": [
            "override", "correction", "adjustment", "planner",
            "manual", "suppress"
        ],
        "source_types": ["override_decision", "incident_record"],
    },
    "promo_event": {
        "signals": [
            "promo", "holiday", "valentine", "halloween", "christmas",
            "easter", "seasonal", "lift", "event", "calendar"
        ],
        "source_types": ["trade_calendar", "incident_record"],
    },
    "feature_drift": {
        "signals": [
            "acv", "distribution", "feature", "planogram",
            "refresh", "staleness"
        ],
        "source_types": [
            "incident_record", "retrain_decision", "readiness_report"
        ],
    },
}

DEFAULT_SOURCE_TYPES = [
    "incident_record", "readiness_report", "override_decision",
    "retrain_decision", "trade_calendar"
]


def classify_intent(query: str) -> tuple[str, list[str]]:
    q = query.lower()
    best_intent = "general"
    best_types = DEFAULT_SOURCE_TYPES
    best_score = 0

    for intent, config in INTENT_ROUTING.items():
        score = sum(1 for s in config["signals"] if s in q)
        if score > best_score:
            best_score = score
            best_intent = intent
            best_types = config["source_types"]

    return best_intent, best_types


def get_rag_context(
    query: str,
    client_id: str,
    user_role: str = "DS",
    top_k: int = 5,
) -> dict:
    qdrant = QdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
    )
    model = SentenceTransformer(EMBEDDING_MODEL)

    # Stage 1: NL query router + metadata pre-filter
    intent, source_types = classify_intent(query)

    must_conditions = [
        FieldCondition(key="client_id", match=MatchValue(value=client_id)),
        FieldCondition(
            key="source_type",
            match=MatchAny(any=source_types)
        ),
    ]
    search_filter = Filter(must=must_conditions)

    # Stage 2: Semantic vector search
    query_vector = model.encode(query).tolist()
    search_result = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=search_filter,
        limit=top_k * 3,
        with_payload=True,
    )
    candidates = search_result.points

    # Permission graph: filter by user_role
    permitted = []
    for hit in candidates:
        visible = json.loads(hit.payload.get("visible_to", '["DS"]'))
        if user_role in visible:
            permitted.append(hit)

    # Stage 3: Re-rank by keyword overlap
    query_tokens = set(query.lower().split())

    def overlap_score(hit):
        content_tokens = set(hit.payload.get("content", "").lower().split())
        return len(query_tokens & content_tokens)

    reranked = sorted(
        permitted,
        key=lambda h: (overlap_score(h), h.score),
        reverse=True,
    )[:top_k]

    # Format results
    results = []
    for hit in reranked:
        p = hit.payload
        results.append({
            "doc_id": p.get("doc_id"),
            "source_type": p.get("source_type"),
            "date": p.get("date"),
            "relevance_score": round(hit.score, 3),
            "content": p.get("content"),
            "segment": p.get("segment"),
            "root_cause_layer": p.get("root_cause_layer"),
        })

    gaps = "No relevant context found." if not results else None

    return {
        "query": query,
        "intent": intent,
        "source_types_searched": source_types,
        "user_role": user_role,
        "results": results,
        "retrieval_confidence": round(reranked[0].score, 3) if reranked else 0.0,
        "gaps": gaps,
    }


if __name__ == "__main__":
    result = get_rag_context(
        query="Maplebridge Market feed failure chocolate seasonal",
        client_id="VELORA",
        user_role="DS",
    )
    print(f"Intent: {result['intent']}")
    print(f"Source types searched: {result['source_types_searched']}")
    print(f"Results found: {len(result['results'])}")
    for r in result["results"]:
        print(f"  [{r['relevance_score']}] {r['doc_id']} — {r['source_type']}")