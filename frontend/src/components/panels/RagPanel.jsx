import ChunkCard from '../shared/ChunkCard'

function RetrievalDetails({ selectedExc }) {
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
          RAG pipeline — {selectedExc.planner.issue}
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
            <div className="rf-lbl">Knowledge records</div>
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
          <div className="qb-label">Retrieval query</div>
          <div className="qb-text">"{rag.query}"</div>
          <div className="qb-filters">
            {rag.filters.map((f, i) => (
              <span key={i} className="qb-tag qt-blue">{f}</span>
            ))}
            <span className="qb-tag qt-gray">{rag.latency}</span>
          </div>
        </div>

        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-3)', marginBottom: '8px' }}>
          Historical evidence (top {rag.stats.reranked} after re-rank)
        </div>

        {rag.chunks.map((chunk, i) => (
          <ChunkCard key={i} chunk={chunk} />
        ))}

      </div>
    </div>
  )
}

export default function RagPanel({selectedExc}) {
 if(!selectedExc) return <div className="empty"><div className="empty-title">Choose an issue in Planner View</div><p>Review the history behind the recommendation.</p></div>
 const e=selectedExc, p=e.planner, data=e.type==='data_issue', feature=e.type==='feature_drift'
 const records=[
 {title:data?'Previous incident: sales feed interrupted':feature?'Previous incident: outdated forecast inputs':'Previous event: temporary demand increase',relevance:data?'The same quantity-field change caused rejected sales files.':feature?'Outdated inputs shifted the forecast baseline in a similar case.':'A planned event produced a short-lived demand increase.',resolution:data?'Corrected the quantity mapping after review.':feature?'Refreshed inputs and retrained the model under controlled review.':'Applied a temporary adjustment only during the event window.',outcome:data?'Data completeness recovered in the next cycle.':feature?'Forecast error improved from 12.1% to 9.8%.':'The following cycle returned to baseline without a lasting offset.'},
 {title:'Current readiness record',relevance:data?'Confirms the missing files in the affected feed.':feature?'Separates an input-refresh problem from missing sales data.':'Links a complete feed to the registered event dates.',resolution:'No previous resolution recorded; this is a current readiness check.',outcome:p.evidence[0]},
 {title:'Previous review guidance',relevance:'Defines the human decision needed for this type of issue.',resolution:data?'Review the mapping, completeness and totals before releasing forecasts.':feature?'Require named approval for retraining and a short-lived adjustment.':'Review the event dates and the adjustment expiry.',outcome:'Approval guidance recorded; no completed outcome is recorded for this item.'}
 ]
 return <><header className="support-heading"><h1>History behind the recommendation</h1><p>{p.issue}</p></header><div className="precedent-list">{records.map((record,i)=><article className="precedent-card" key={record.title}><h2>{record.title}</h2><dl><div><dt>Why it is relevant</dt><dd>{record.relevance}</dd></div><div><dt>{i===1?'Resolution status':'Previous resolution'}</dt><dd>{record.resolution}</dd></div><div><dt>Outcome</dt><dd>{record.outcome}</dd></div></dl><details className="technical-detail"><summary>Source & relevance</summary><ChunkCard chunk={e.rag.chunks[i]}/></details></article>)}</div><details className="technical-detail"><summary>Retrieval method & source metadata</summary><RetrievalDetails selectedExc={e}/></details></>
}
