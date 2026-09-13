import QualityChecks from './QualityChecks'
import { useState } from 'react'

function SectionTitle({ number, children }) {
  return <h2 className="ed-section-title"><span>{number}</span>{children}</h2>
}
function Facts({ items, className }) {
  return <dl className={className}>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

export default function AdditionalExceptionDetails({ data, exception, queue, header }) {
  const [decision, setDecision] = useState('')
  const [escalation, setEscalation] = useState(false)
  return <article className="exception-page">
    {header}
    <section className="ed-issue">
      <h2>{exception.planner.issue}</h2><p>{data.impact}</p>
      <Facts className="ed-facts" items={[
        ['Affected SKUs', queue.affectedSkus.toLocaleString()], ['Product group', exception.segment],
        ['Current status', <span className="ed-status">{queue.status}</span>], ['Last updated', queue.updated],
      ]}/>
    </section>
    <section className="ed-section">
      <SectionTitle number="1">What happened?</SectionTitle><p>{data.happened}</p>
      {data.evidence && <ul>{data.evidence.map(item => <li key={item}>{item}</li>)}</ul>}
      {data.metrics && <div className="ed-metrics">{data.metrics.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>}
      {data.consequence && <p className="ed-impact">{data.consequence}</p>}
    </section>
    <section className="ed-section">
      <SectionTitle number="2">Root-cause diagnosis</SectionTitle><p>{data.sequence}</p>
      <div className="ed-table-wrap"><table className="ed-rca">
        <thead><tr><th>Diagnostic check</th><th>What the agent found</th><th>Result</th></tr></thead>
        <tbody>{data.checks.map(([check, finding, result, kind]) => <tr key={check} className={kind === 'root' ? 'ed-root-row' : ''}>
          <td>{check}</td><td>{finding}</td><td>{kind === 'parallel' ? <span className="ed-root-label ed-parallel-label">{result}</span> : result}</td>
        </tr>)}</tbody>
      </table></div>
      <div className="ed-diagnosis"><h3>Diagnosis</h3><p>{data.diagnosis}</p><div className="ed-confidence">
        <span>Agent confidence: <strong>{data.confidence}%</strong></span><span>Root cause category: <strong>{data.category}</strong></span>
      </div></div>
    </section>
    <section className="ed-section">
      <SectionTitle number="3">Recommended intervention</SectionTitle>
      <div className="ed-recommendation"><h3>{data.recommendation}</h3><p>{data.recommendationCopy}</p></div>
      {data.intervention && <ul>{data.intervention.map(item => <li key={item}>{item}</li>)}</ul>}
      {data.facts && <Facts className="ed-retrain-facts" items={data.facts}/>}
      <h3 className="ed-subheading">{data.why}</h3><ul>{data.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
    </section>
    <section className="ed-section">
      <SectionTitle number="4">Action & approval</SectionTitle>
      {data.monitoring ? <div className="ed-approval">
        <h3>{data.action}</h3><p><strong>Status:</strong> {data.status}</p>
        <p>{data.monitoringCopy}</p><p><strong>Monitoring review point:</strong> {data.reviewPoint}</p>
        <p className="ed-preview-note">Synthetic monitoring scenario only. No live monitoring is running.</p>
      </div> : <><p>This recommendation requires human approval before it can be executed.</p>
      <div className="ed-approval">
        <span className="ed-tier">Tier 2 — Recommend + approve</span><h3>{data.action}</h3><p><strong>Status:</strong> {data.status}</p>
        <div className="ed-buttons">
          <button className="ed-primary" onClick={() => setDecision('Approval selected')}>{data.approve}</button>
          <button className="ed-reject" onClick={() => setDecision('Rejection selected')}>Reject</button>
          <button className="ed-secondary" onClick={() => setDecision('Change request selected')}>Request changes</button>
        </div>
        <p className="ed-preview-note">Decision preview only. Nothing is saved or executed; selections reset when you leave this page.</p>
        <div className="ed-feedback" role="status" aria-live="polite">{decision && `${decision}: ${data.action}. Preview only.`}</div>
      </div>
      </>}
      {data.escalation && <div className="ed-escalation">
        <span className="ed-tier">Tier 3 — Expert escalation</span><h3>{data.escalation.title}</h3><p>{data.escalation.copy}</p>
        <button className="ed-secondary" onClick={() => setEscalation(true)}>{data.escalation.button}</button>
        <div className="ed-feedback" role="status" aria-live="polite">{escalation && 'Engineering escalation preview. No ticket has been created.'}</div>
      </div>}
    </section>
    <section className="ed-section">
      <SectionTitle number="5">Historical precedent</SectionTitle><p>The agent retrieved a similar past incident to inform this recommendation.</p>
      <Facts className="ed-precedent" items={data.precedent}/>
    </section>
  <QualityChecks evaluation={exception.eval} monitoring={data.monitoring}/></article>
}
