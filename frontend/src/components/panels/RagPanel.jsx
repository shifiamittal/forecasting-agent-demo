import ChunkCard from '../shared/ChunkCard'

export default function RagPanel({ selectedExc }) {
  if (!selectedExc) {
    return (
      <div className="empty">
        <div className="empty-icon">↖</div>
        <div className="empty-title">Select an exception</div>
        <div className="empty-sub">Click any row in the exception queue to see the knowledge retrieved.</div>
      </div>
    )
  }

  const { rag } = selectedExc
  if (!rag) return <div className="empty"><div className="empty-icon">↖</div><div className="empty-title">No RAG data</div></div>

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <div className="card-icon ci-teal">◎</div>
          RAG pipeline — {selectedExc.sku}
        </div>
        <span className="pill p-gray">{rag.intent}</span>
      </div>
      <div className="card-body">

        <div className="pipeline-row">
          <div className="p-stage">Pre-filter</div>
          <span className="p-arrow">→</span>
          <div className="p-stage">Semantic search</div>
          <span className="p-arrow">→</span>
          <div className="p-stage">Re-rank</div>
        </div>

        <div className="rag-funnel">
          <div className="rf-item">
            <div className="rf-val">{rag.stats.total.toLocaleString()}</div>
            <div className="rf-lbl">Demo records</div>
          </div>
          <div className="rf-item">
            <div className="rf-val">{rag.stats.filtered}</div>
            <div className="rf-lbl">After metadata filter</div>
          </div>
          <div className="rf-item">
            <div className="rf-val">{rag.stats.topK}</div>
            <div className="rf-lbl">Semantic top-k</div>
          </div>
          <div className="rf-item">
            <div className="rf-val">{rag.stats.reranked}</div>
            <div className="rf-lbl">Re-ranked final</div>
          </div>
        </div>

        <div className="query-box">
          <div className="qb-label">Illustrative retrieval query</div>
          <div className="qb-text">"{rag.query}"</div>
          <div className="qb-filters">
            {rag.filters.map((f, i) => (
              <span key={i} className="qb-tag qt-blue">{f}</span>
            ))}
            <span className="qb-tag qt-gray">{rag.latency}</span>
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-3)', marginBottom: '8px' }}>
          Synthetic historical evidence (top {rag.stats.reranked} after re-rank)
        </div>

        {rag.chunks.map((chunk, i) => (
          <ChunkCard key={i} chunk={chunk} />
        ))}

      </div>
    </div>
  )
}
