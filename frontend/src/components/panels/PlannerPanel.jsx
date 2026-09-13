import { useRef, useEffect } from 'react'
import ForecastReviewLanding from './ForecastReviewLanding'
import Pill from '../shared/Pill'
import ConfidenceBar from '../shared/ConfidenceBar'
import ActionItem from '../shared/ActionItem'

export default function PlannerPanel({ cycleData, selectedExcId, onSelectExc }) {
  const detailRef = useRef(null)
  useEffect(() => {
    if (selectedExcId) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [selectedExcId])
  if (!cycleData?.cycle) return <div className="empty">Choose an entity to review its forecast.</div>
  const { exceptions } = cycleData
  const selected = exceptions.find(e => e.id === selectedExcId)
  const p = selected?.planner

  return <>
    <ForecastReviewLanding key={cycleData.cycle.client_id} cycleData={cycleData} selectedExcId={selectedExcId} onSelectExc={id => { onSelectExc(id); if (id && id === selectedExcId) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }) }} />
    {selected && <section key={selected.id} id="planner-detail" className="planner-detail" ref={detailRef} aria-label="Exception review">
      <div className="detail-heading"><div><span className="section-label">Issue</span><h2>{p.issue}</h2><p>{p.impact}</p></div><Pill cls={p.risk === 'High' ? 'p-red' : 'p-green'}>{p.risk} risk</Pill></div>
      <div className="decision-grid">
        <section className="decision-block"><h3>Evidence</h3><ul>{p.evidence.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section className="decision-block"><h3>Diagnosis</h3><p>{p.diagnosis}</p><ConfidenceBar confidence={selected.rca.confidence} /></section>
        <section className="decision-block action-focus"><span className="section-label">Recommended action</span><h3>{p.nextAction}</h3><p>{p.recommendation}</p></section>
        <section className="decision-block approval-focus"><h3>Human approval / escalation</h3><Pill cls="p-amber">Awaiting human review</Pill><p>{p.approval}</p></section>
      </div>
      <details className="technical-detail"><summary>Evidence & decision path</summary>
        <div className="card-body"><p>{selected.rca.finding}</p><ul>{selected.rca.evidence.map(item => <li key={item}>{item}</li>)}</ul><small>{selected.type} · {selected.tier} · {selected.rca.layer}</small></div>
        <div className="action-grid">{selected.actions.map((a,i) => <ActionItem key={i} action={a} />)}</div>
      </details>
      <p className="planner-hint">For the full trace, use Agent Reasoning, RAG Retrieval or Eval Scores above.</p>
    </section>}
  </>
}
