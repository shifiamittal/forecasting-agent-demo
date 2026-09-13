import { useState } from 'react'
import queueFixtures from '../../data/forecast-review.json'
import './ForecastReviewLanding.css'

function OutcomeIcon({ type }) {
  const paths = {
    issues: <><path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3v.1"/></>,
    completed: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    approval: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    expert: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3"/></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>
}

export default function ForecastReviewLanding({ cycleData, selectedExcId, onSelectExc }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const {cycle, exceptions} = cycleData
  const queue = queueFixtures[cycle.client_id]
  const actions = exceptions.flatMap(e => e.actions)
  const rows = exceptions.map(e => ({...e, queue:queue.issues[e.id]})).sort((a,b) => a.queue.rank-b.queue.rank)
  const matching = rows.filter(e => {
    const matchesFilter = filter === 'all' || (filter === 'high' && e.queue.priority === 'High') || (filter === 'low' && e.queue.priority === 'Low') || (filter === 'planner' && e.queue.status === 'Awaiting planner approval') || (filter === 'ds' && e.queue.status === 'Awaiting DS approval')
    const text = [e.planner.issue,e.planner.cause,e.queue.action,e.queue.status,e.queue.priority,e.queue.affectedSkus].join(' ').toLowerCase()
    return matchesFilter && text.includes(search.trim().toLowerCase())
  })
  const cards = [
    {type:'issues',label:'Exceptions identified',value:exceptions.length,sub:`Out of ${cycle.skus_scanned.toLocaleString()} SKUs`},
    {type:'completed',label:'Autonomous actions completed',value:actions.filter(a=>a.tier==='T1').length,sub:'Low-risk actions completed'},
    {type:'approval',label:'Recommendations awaiting approval',value:actions.filter(a=>a.tier==='T2').length,sub:'Planner or data scientist review needed'},
    {type:'expert',label:'Expert escalations',value:actions.filter(a=>a.tier==='T3').length,sub:'Specialist alignment required'},
  ]
  return <section className="forecast-landing" aria-label="Forecast Review overview">
    <header className="fl-header"><div><div className="fl-eyebrow">FORECASTING AGENT</div><h1>Forecast Review</h1><p>The agent has analyzed this forecast cycle and identified exceptions that need attention.</p></div></header>
    <div className="fl-outcomes">{cards.map(card=><article className={`fl-outcome fl-${card.type}`} key={card.type}><span className="fl-icon"><OutcomeIcon type={card.type}/></span><div><div className="fl-number">{card.value}</div><h2>{card.label}</h2><p>{card.sub}</p></div></article>)}</div>
    <div className="fl-queue-heading"><div><h2>Exceptions ({exceptions.length})</h2><p>Prioritized by impact and urgency. Select a row to review the recommendation.</p></div><div className="fl-controls"><label className="fl-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" aria-label="Search exceptions" placeholder="Search exceptions…" value={search} onChange={event=>{setSearch(event.target.value);onSelectExc(null)}}/></label><label className="fl-filter"><span>Filter</span><select aria-label="Filter exceptions" value={filter} onChange={event=>{setFilter(event.target.value);onSelectExc(null)}}><option value="all">All exceptions</option><option value="high">High priority</option><option value="low">Low priority</option><option value="ds">DS approval</option><option value="planner">Planner approval</option></select></label></div></div>
    <div className="fl-table-wrap"><table className="fl-table"><caption className="fl-sr-only">Prioritized forecast exceptions for {cycle.client_name}</caption><thead><tr>{['Priority','Forecast issue','Affected SKUs','Likely cause','Recommended action','Status','Updated'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{matching.map(e=><tr key={e.id} className={e.id===selectedExcId?'fl-selected':''} onClick={()=>onSelectExc(e.id)}><td><span className={`fl-priority fl-priority-${e.queue.priority.toLowerCase()}`}>{e.queue.priority}</span></td><td><button className="fl-issue-link" aria-controls="planner-detail" aria-expanded={e.id===selectedExcId} onClick={event=>{event.stopPropagation();onSelectExc(e.id)}}>{e.planner.issue}</button></td><td className="fl-count">{e.queue.affectedSkus.toLocaleString()}</td><td>{e.planner.cause}</td><td><span className="fl-action">{e.queue.action}<span aria-hidden="true"> →</span></span></td><td><span className={`fl-status ${e.queue.status.includes('planner')?'fl-planner-status':''}`}>{e.queue.status}</span></td><td><time className="fl-updated">{e.queue.updated}</time></td></tr>)}</tbody></table>{matching.length===0&&<div className="fl-empty"><h3>No matching exceptions</h3><p>Try a different search or filter.</p><button onClick={()=>{setSearch('');setFilter('all')}}>Clear search and filters</button></div>}</div>
    <div className="fl-queue-footer" role="status" aria-live="polite">Showing {matching.length} of {exceptions.length} exception groups{search || filter!=='all' ? ' · filtered results' : ''}</div>
  </section>
}
