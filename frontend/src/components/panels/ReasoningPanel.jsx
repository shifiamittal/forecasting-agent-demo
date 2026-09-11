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
        <span className={`pill ${agent.resultCls}`}>{agent.result}</span>
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

export default function ReasoningPanel({ selectedExc }) {
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
          <strong style={{ color: 'var(--text-1)' }}>{selectedExc.sku}</strong>
          {' '}— {selectedExc.agentSummary}
        </div>
      </div>

      {(selectedExc.agents ?? []).map((agent, i) => (
        <AgentAccordion key={i} agent={agent} index={i} />
      ))}
    </>
  )
}
