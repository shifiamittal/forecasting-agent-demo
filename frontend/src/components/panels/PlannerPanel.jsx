import { useRef, useEffect } from 'react'
import MetricCard from '../shared/MetricCard'
import Pill from '../shared/Pill'
import ConfidenceBar from '../shared/ConfidenceBar'
import ActionItem from '../shared/ActionItem'

export default function PlannerPanel({ cycleData, selectedExcId, onSelectExc }) {
  const detailRef = useRef(null)
  useEffect(() => {
    if (selectedExcId) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [selectedExcId])
  if (!cycleData?.cycle) return <div className="empty">Choose an entity to review its forecast.</div>
  const { cycle, exceptions } = cycleData
  const selected = exceptions.find(e => e.id === selectedExcId)
  const actions = exceptions.flatMap(e => e.actions)
  const p = selected?.planner

  return <>
    <header className="planner-intro">
      <div><h1>Forecast review</h1><p>{cycle.client_name} · April 2026 forecast cycle</p></div>
      <span className="planner-note">Prioritized by risk</span>
    </header>
    <div className="metrics">
      <MetricCard label="Exceptions identified" val={exceptions.length} cls="mv-blue" sub="Issues surfaced for this cycle" />
      <MetricCard label="Autonomous actions completed" val={actions.filter(a => a.tier === 'T1').length} cls="mv-green" sub="Quality flag and event context" />
      <MetricCard label="Recommendations awaiting approval" val={actions.filter(a => a.tier === 'T2').length} cls="mv-amber" sub="Human decisions needed" />
      <MetricCard label="Expert escalations" val={actions.filter(a => a.tier === 'T3').length} cls="mv-red" sub="Specialist follow-up required" />
    </div>
    <div className="card">
      <div className="exc-wrap"><table className="exc-table planner-table">
        <thead><tr><th scope="col">What needs attention</th><th scope="col">Likely cause</th><th scope="col">Risk</th><th scope="col">Next step</th></tr></thead>
        <tbody>{exceptions.map(e => <tr key={e.id} className={selectedExcId === e.id ? 'selected' : ''} onClick={() => onSelectExc(selectedExcId === e.id ? null : e.id)}>
          <td><strong className="issue-label">{e.planner.issue}</strong></td>
          <td>{e.planner.cause}</td>
          <td><Pill cls={e.planner.risk === 'High' ? 'p-red' : 'p-green'}>{e.planner.risk}</Pill></td>
          <td><button className="review-cta" aria-expanded={selectedExcId === e.id} aria-controls="planner-detail" onClick={event => {event.stopPropagation(); onSelectExc(selectedExcId === e.id ? null : e.id)}}>{e.planner.nextAction} <span aria-hidden="true">→</span></button><span className="review-state">Human review required</span></td>
        </tr>)}</tbody>
      </table></div>
    </div>
    {!selected && <p className="planner-hint">Choose an issue above. Evidence, diagnosis and approval needs are all here in Planner view.</p>}
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
