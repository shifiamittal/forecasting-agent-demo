"""
Knowledge layer ingestion pipeline.
Reads synthetic documents, embeds them using sentence-transformers,
stores in Qdrant with full metadata catalog + permission graph.
"""

import os
import json
from datetime import datetime
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter,
    FieldCondition, MatchValue, MatchAny
)
from sentence_transformers import SentenceTransformer
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from data.synthetic_data import SYNTHETIC_DOCUMENTS

load_dotenv()

COLLECTION_NAME = "forecasting_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
VECTOR_DIM = 384


def get_qdrant_client():
    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")
    if not url or not api_key:
        raise ValueError(
            "QDRANT_URL and QDRANT_API_KEY must be set in .env"
        )
    return QdrantClient(url=url, api_key=api_key)


def build_metadata(doc: dict) -> dict:
    """
    Metadata catalog schema.
    Every field is a PM decision — each was added to solve a specific
    retrieval failure or compliance requirement.

    permission graph: visible_to controls which user roles can retrieve
    this chunk — DS, planner, engineering — same query returns different
    chunks depending on who is asking. This is the enterprise access control parallel:
    permission-aware retrieval scoped to user role.
    """
    return {
        "doc_id":           doc["doc_id"],
        "source_type":      doc["source_type"],
        "client_id":        doc["client_id"],
        "date":             doc["date"],
        "segment":          doc.get("segment", ""),
        "retailer_scope":   json.dumps(doc.get("retailer_scope", [])),
        "severity":         doc.get("severity") or "none",
        "root_cause_layer": doc.get("root_cause_layer") or "none",
        "visible_to":       json.dumps(doc.get("visible_to", ["DS"])),
        "freshness_ts":     datetime.utcnow().isoformat(),
        "embedding_model":  EMBEDDING_MODEL,
    }


def setup_collection(client: QdrantClient):
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in existing:
        print(f"Collection '{COLLECTION_NAME}' already exists — recreating.")
        client.delete_collection(COLLECTION_NAME)
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
    )
    # Create payload indexes for filtered search
    from qdrant_client.models import PayloadSchemaType
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="client_id",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=COLLECTION_NAME,
        field_name="source_type",
        field_schema=PayloadSchemaType.KEYWORD,
    )
    print(f"Collection '{COLLECTION_NAME}' created with payload indexes.")


def ingest(docs: list[dict], client: QdrantClient, model: SentenceTransformer):
    points = []
    for i, doc in enumerate(docs):
        embedding = model.encode(doc["content"]).tolist()
        metadata = build_metadata(doc)
        points.append(
            PointStruct(
                id=i,
                vector=embedding,
                payload={**metadata, "content": doc["content"]},
            )
        )
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"Ingested {len(points)} documents into '{COLLECTION_NAME}'.")


def main():
    print("Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)
    print("Connecting to Qdrant...")
    client = get_qdrant_client()
    setup_collection(client)
    print("Ingesting documents...")
    ingest(SYNTHETIC_DOCUMENTS, client, model)
    count = client.count(collection_name=COLLECTION_NAME).count
    print(f"Ingestion complete. Total vectors in collection: {count}")


if __name__ == "__main__":
    main()
