import AlertBanner from '../shared/AlertBanner'
import MetricCard from '../shared/MetricCard'
import Pill from '../shared/Pill'
import ConfidenceBar from '../shared/ConfidenceBar'
import ActionItem from '../shared/ActionItem'

function tierPillCls(tierCls) {
  if (tierCls === 'tier-t1') return 'p-blue'
  if (tierCls === 'tier-t2') return 'p-amber'
  return 'p-red'
}

export default function PlannerPanel({ cycleData, selectedExcId, onSelectExc }) {
  if (!cycleData) {
    return (
      <div className="empty">
        <div className="empty-icon">▶</div>
        <div className="empty-title">Waiting for cycle run</div>
        <div className="empty-sub">Choose a fictional entity to explore the sample cycle.</div>
      </div>
    )
  }

  const { cycle, exceptions = [] } = cycleData ?? {}
  const selectedExc = exceptions?.find(e => e.id === selectedExcId) ?? null

  if (!cycle) {
    return (
      <div className="empty">
        <div className="empty-icon">▶</div>
        <div className="empty-title">Waiting for cycle run</div>
        <div className="empty-sub">Choose a fictional entity to explore the sample cycle.</div>
      </div>
    )
  }

  return (
    <>
      {/* Section 1 — always visible */}
      <AlertBanner
        level={cycle.alert?.level}
        icon={cycle.alert?.icon}
        title={cycle.alert?.title}
        desc={cycle.alert?.desc}
      />

      <div className="metrics">
        {(cycle.metrics ?? []).map((m, i) => (
          <MetricCard key={i} label={m.label} val={m.val} cls={m.cls} sub={m.sub} subCls={m.subCls} />
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">
            <div className="card-icon ci-red">⚑</div>
            Exception queue — cycle {cycle.cycle_id}
          </div>
          <Pill cls="p-gray">{exceptions.length} exceptions found</Pill>
        </div>
        <div className="exc-wrap">
          <table className="exc-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Severity</th>
                <th>Type</th>
                <th>Agent diagnosis</th>
                <th>Tier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map(exc => (
                <tr
                  key={exc.id}
                  className={selectedExcId === exc.id ? 'selected' : ''}
                  onClick={() => onSelectExc(exc.id === selectedExcId ? null : exc.id)}
                >
                  <td>
                    <div className="sku-name">{exc.sku}</div>
                    <div className="sku-seg">{exc.segment}</div>
                  </td>
                  <td><Pill cls={exc.sevCls}>{exc.sev}</Pill></td>
                  <td>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: '11.5px', color: 'var(--text-2)' }}>
                      {exc.type}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-2)', maxWidth: '280px' }}>
                    {exc.diagnosis}
                  </td>
                  <td><Pill cls={tierPillCls(exc.tierCls)}>{exc.tier}</Pill></td>
                  <td style={{ color: 'var(--blue-mid)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    View full story →
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '9px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border-soft)', fontSize: '11.5px', color: 'var(--text-3)' }}>
          ↑ Click any row to trace the full diagnosis across all tabs
        </div>
      </div>

      {/* Section 2 — visible only when exception selected */}
      {selectedExc && (
        <div style={{ paddingTop: '14px' }}>
          <AlertBanner
            level={selectedExc.alert.level}
            icon={selectedExc.alert.icon}
            title={selectedExc.alert.title}
            desc={selectedExc.alert.desc}
          />

          <div className="two-col">
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-head">
                <div className="card-title">
                  <div className="card-icon ci-amber">⬡</div>
                  Root cause analysis — {selectedExc.sku}
                </div>
                <Pill cls="p-gray">{selectedExc.rca.layer}</Pill>
              </div>
              <div className="card-body">
                <div
                  className="rca-finding"
                  children={selectedExc.rca.finding}
                />
                <div className="evidence-list">
                  {selectedExc.rca.evidence.map((ev, i) => (
                    <div key={i} className="ev-item">
                      <div className="ev-dot" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
                <ConfidenceBar confidence={selectedExc.rca.confidence} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">
                <div className="card-icon ci-blue">✦</div>
                Recommendations & human oversight
              </div>
              <Pill cls="p-gray">{selectedExc.actions.length} actions</Pill>
            </div>
            <div className="action-grid">
              {selectedExc.actions.map((action, i) => (
                <ActionItem key={i} action={action} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
