import { useRef, useEffect } from 'react'
import MetricCard from '../shared/MetricCard'
import Pill from '../shared/Pill'
import ConfidenceBar from '../shared/ConfidenceBar'
import ActionItem from '../shared/ActionItem'

export default function PlannerPanel({ cycleData, selectedExcId, onSelectExc }) {
  const detailRef = useRef(null)
  useEffect(() => {
    if (selectedExcId) detailRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [selectedExcId])
  if (!cycleData?.cycle) return <div className="empty">Choose an entity to review its forecast.</div>
  const { cycle, exceptions } = cycleData
  const selected = exceptions.find(e => e.id === selectedExcId)
  const reviewCount = exceptions.filter(e => e.actions.some(a => a.tier !== 'T1')).length
  const highCount = exceptions.filter(e => ['HIGH', 'CRITICAL'].includes(e.sev)).length
  const p = selected?.planner

  return <>
    <header className="planner-intro">
      <div><h1>Forecast review</h1><p>{cycle.client_name} · Find what needs attention. Review the next step.</p></div>
      <span className="planner-note">Prioritized by risk</span>
    </header>
    <div className="metrics">
      <MetricCard label="Issues detected" val={exceptions.length} cls="mv-blue" sub="Across this forecast cycle" />
      <MetricCard label="High-risk issues" val={highCount} cls="mv-red" sub="Review these first" />
      <MetricCard label="Need human review" val={reviewCount} cls="mv-amber" sub="Approval or specialist input" />
      <MetricCard label="Safe to handle autonomously" val={exceptions.length-reviewCount} cls="mv-blue" sub="Entire issues, not individual steps" />
    </div>
    <div className="card">
      <div className="card-head"><h2 className="card-title">What needs attention</h2><span className="planner-note">Select an action to review below</span></div>
      <div className="exc-wrap"><table className="exc-table planner-table">
        <thead><tr><th scope="col">What happened</th><th scope="col">Likely cause</th><th scope="col">Risk</th><th scope="col">Next step</th></tr></thead>
        <tbody>{exceptions.map(e => <tr key={e.id} className={selectedExcId === e.id ? 'selected' : ''} onClick={() => onSelectExc(selectedExcId === e.id ? null : e.id)}>
          <td><strong className="issue-label">{e.planner.issue}</strong><div>{e.planner.happened}</div><small>{e.sku} · {e.segment}</small></td>
          <td>{e.planner.cause}</td>
          <td><Pill cls={e.sevCls}>{e.sev === 'MED' ? 'Medium' : e.sev === 'HIGH' ? 'High' : e.sev}</Pill></td>
          <td><button className="review-cta" aria-expanded={selectedExcId === e.id} aria-controls="planner-detail" onClick={event => {event.stopPropagation(); onSelectExc(selectedExcId === e.id ? null : e.id)}}>{e.planner.nextAction} <span aria-hidden="true">→</span></button><span className="review-state">Human review required</span></td>
        </tr>)}</tbody>
      </table></div>
    </div>
    {!selected && <p className="planner-hint">Choose an issue above. Evidence, diagnosis and approval needs are all here in Planner view.</p>}
    {selected && <section key={selected.id} id="planner-detail" className="planner-detail" ref={detailRef} aria-label="Exception review">
      <div className="detail-heading"><div><span className="section-label">Issue</span><h2>{p.issue}</h2><p>{p.impact}</p><small>{selected.sku} · {selected.segment}</small></div><Pill cls={selected.sevCls}>{selected.sev === 'HIGH' ? 'High risk' : 'Medium risk'}</Pill></div>
      <div className="decision-grid">
        <section className="decision-block"><h3>Evidence</h3><ul>{p.evidence.map(item => <li key={item}>{item}</li>)}</ul><span className="planner-note">Synthetic observations and historical examples</span></section>
        <section className="decision-block"><h3>Diagnosis</h3><p>{p.diagnosis}</p><ConfidenceBar confidence={selected.rca.confidence} /></section>
        <section className="decision-block action-focus"><span className="section-label">Recommended action</span><h3>{p.nextAction}</h3><p>{p.recommendation}</p></section>
        <section className="decision-block approval-focus"><h3>Human approval / escalation</h3><Pill cls="p-amber">Awaiting human review</Pill><p>{p.approval}</p><span className="planner-note">Illustrative status · no action is executed</span></section>
      </div>
      <details className="technical-detail"><summary>Supporting technical detail & action breakdown</summary>
        <div className="card-body"><p>{selected.rca.finding}</p><ul>{selected.rca.evidence.map(item => <li key={item}>{item}</li>)}</ul><small>{selected.type} · {selected.tier} · {selected.rca.layer}</small></div>
        <div className="action-grid">{selected.actions.map((a,i) => <ActionItem key={i} action={a} />)}</div>
      </details>
      <p className="planner-hint">For the full trace, use Agent reasoning, RAG retrieval or Eval scores above.</p>
    </section>}
  </>
}
