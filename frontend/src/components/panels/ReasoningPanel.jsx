import { useState } from 'react'

function TraceStep({ step }) {
  const dotCls =
    step.kind === 'thought' ? 'd-thought' :
    step.kind === 'action'  ? 'd-action'  :
    step.kind === 'obs'     ? 'd-obs'     : 'd-finding'

  const kindCls =
    step.kind === 'thought' ? 'k-thought' :
    step.kind === 'action'  ? 'k-action'  :
    step.kind === 'obs'     ? 'k-obs'     : 'k-finding'

  const kindLabel =
    step.kind === 'obs'     ? 'Observation' :
    step.kind === 'finding' ? 'Finding'     :
    step.kind.charAt(0).toUpperCase() + step.kind.slice(1)

  return (
    <div className="tstep">
      <div className="tdot-col">
        <div className={`tdot ${dotCls}`} />
      </div>
      <div className="tcontent">
        <div className={`tkind ${kindCls}`}>{kindLabel}</div>
        {step.code
          ? <div className="tcode">{step.code}</div>
          : <div className="ttext">{step.text}</div>
        }
      </div>
    </div>
  )
}

function AgentAccordion({ agent, index }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="agent-block">
      <div
        className={`agent-head${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <div
          className="agent-idx"
          style={{ background: agent.idxBg, color: agent.idxColor }}
        >
          {index + 1}
        </div>
        <div className="agent-name-label">{agent.name}</div>
        <div className="agent-summary-text">{agent.summary}</div>
        <span className={`pill ${agent.resultCls}`}>{agent.result.replace("Illustrative trace", "Decision trace")}</span>
        <span className="agent-chevron">▾</span>
      </div>
      <div className={`agent-body${open ? ' open' : ''}`}>
        <div className="trace">
          {agent.steps.map((step, i) => (
            <TraceStep key={i} step={step} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TechnicalReasoning({ selectedExc }) {
  if (!selectedExc) {
    return (
      <div className="empty">
        <div className="empty-icon">↖</div>
        <div className="empty-title">Select an exception</div>
        <div className="empty-sub">Click any row in the exception queue to trace its agent reasoning end-to-end.</div>
      </div>
    )
  }

  return (
    <>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-soft)',
        borderRadius: 'var(--r-md)', padding: '11px 15px', marginBottom: '14px',
        display: 'flex', alignItems: 'center', gap: '10px'
      }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: 'var(--blue-bg)', color: 'var(--blue-mid)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700, flexShrink: 0
        }}>∑</div>
        <div style={{ fontSize: '12.5px', color: 'var(--text-2)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text-1)' }}>{selectedExc.planner.issue}</strong>
          {' '}— {selectedExc.agentSummary}
        </div>
      </div>

      {(selectedExc.agents ?? []).map((agent, i) => (
        <AgentAccordion key={i} agent={agent} index={i} />
      ))}
    </>
  )
}

export default function ReasoningPanel({selectedExc}) {
  if(!selectedExc) return <div className="empty"><div className="empty-title">Choose an issue in Planner View</div><p>See what the agent checked and why it reached its recommendation.</p></div>
  const e=selectedExc, p=e.planner
  const isData=e.type==='data_issue', isFeature=e.type==='feature_drift'
  const steps=isData ? [
    {name:'Data',status:'Issue found',checked:'Check data health',found:'Four days of sales data are missing after a file-format change.',why:'Incomplete sales records make this forecast unreliable.',conclusion:'This is a data issue, not evidence of a model issue.',decision:'Stop here. Restore the missing records before investigating the model.'},
    ...['Features','Model','External Signals'].map(name=>({name,status:'Not reached',decision:'Resolve the data issue first; downstream diagnosis would be unreliable.'}))
  ] : isFeature ? [
    {name:'Data',status:'Passed',checked:'Check data health',found:'Inputs are 97% complete, with no rejected files.',why:'Missing records do not explain the persistent shortfall.',conclusion:'The input feed is usable.',decision:'Continue to model inputs.'},
    {name:'Features',status:'Issue found',checked:'Check whether model inputs are current',found:'Planning assumptions have not been refreshed for ten weeks. Forecast error has increased over three cycles.',why:'Old assumptions no longer reflect current demand.',conclusion:p.diagnosis,decision:'Stop here. Refresh the inputs before assessing a different model.'},
    ...['Model','External Signals'].map(name=>({name,status:'Not reached',decision:'The outdated inputs explain the shortfall; address them before further diagnosis.'}))
  ] : [
    {name:'Data',status:'Passed',checked:'Check data health',found:'Inputs are 98% complete, with no feed failures.',why:'The demand change is not explained by missing sales records.',conclusion:'The input feed is usable.',decision:'Continue through the diagnostic path.'},
    {name:'Features',status:'Not separately recorded',checked:'Look for outdated model inputs',found:'No separate feature-check result is recorded in this case.',why:'A demand spike alone does not establish an input problem.',conclusion:'No feature failure is established by the available evidence.',decision:'Keep this evidence gap visible; inspect the remaining context.'},
    {name:'Model',status:'Not separately recorded',checked:'Look for a model-specific failure',found:'No separate model-test result is recorded in this case.',why:'An unusual forecast alone does not prove the model is broken.',conclusion:'No model failure is established by the available evidence.',decision:'Check whether an external event explains the increase.'},
    {name:'External Signals',status:'Explained',checked:'Compare the event calendar and past demand',found:p.evidence[1]+' '+p.evidence[2],why:'The timing and size of the change match a planned event.',conclusion:'The increase is expected event-driven demand.',decision:'Stop here. Ask a planner to review a temporary adjustment and its expiry.'}
  ]
  return <><header className="support-heading"><h1>Why the agent recommends this</h1><p>{p.issue}</p></header><div className="diagnostic-order">Data → Features → Model → External Signals</div><div className="diagnostic-path">{steps.map((step,i)=><section className="path-step" key={step.name}><div className="path-title"><h2>Step {i+1}: {step.checked || step.name}</h2><span className={step.status==='Issue found'?'pill p-red':'pill p-blue'}>{step.status}</span></div>{step.found && <div className="path-facts"><div><h3>What was found</h3><p>{step.found}</p></div><div><h3>Why it matters</h3><p>{step.why}</p></div><div><h3>Conclusion</h3><p>{step.conclusion}</p></div></div>}<p className="path-decision"><strong>{step.status==='Issue found'||step.status==='Explained'?'Why the investigation stops here':'Continue or stop'}:</strong> {step.decision}</p></section>)}</div><details className="technical-detail"><summary>View technical trace</summary><TechnicalReasoning selectedExc={e}/></details></>
}
