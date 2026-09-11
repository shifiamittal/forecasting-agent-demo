export default function EvalPanel({ selectedExc }) {
  if (!selectedExc) {
    return (
      <div className="empty">
        <div className="empty-icon">↖</div>
        <div className="empty-title">Select an exception</div>
        <div className="empty-sub">Click any row in the exception queue to see eval scores.</div>
      </div>
    )
  }

  const ev = selectedExc.eval
  if (!ev) return <div className="empty"><div className="empty-icon">↖</div><div className="empty-title">No eval data</div></div>
  const circ = 2 * Math.PI * 30
  const offset = circ * (1 - (ev.overall ?? 0) / 100)
  const ringColor = ev.overall >= 90 ? '#16a34a' : ev.overall >= 80 ? '#d97706' : '#dc2626'

  return (
    <>
      <div className="eval-hero">
        <div className="score-ring">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r="30" fill="none" stroke="var(--ink-100)" strokeWidth="6" />
            <circle
              cx="38" cy="38" r="30" fill="none"
              stroke={ringColor} strokeWidth="6"
              strokeDasharray={circ.toFixed(1)}
              strokeDashoffset={offset.toFixed(1)}
              strokeLinecap="round"
            />
          </svg>
          <div className="score-center">
            <div className="score-num" style={{ color: ringColor }}>{ev.overall}</div>
            <div className="score-denom">/100</div>
          </div>
        </div>

        <div className="eval-dims">
          {ev.dims.map((dim, i) => {
            const pct = Math.round(dim.val * 100)
            return (
              <div key={i} className="dim-row">
                <span className="dim-name">{dim.name}</span>
                <div className="dim-bar-bg">
                  <div className={`dim-bar db-${dim.cls}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`dim-val dv-${dim.cls}`}>{dim.val.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="card-head">
          <div className="card-title">
            <div className="card-icon ci-green">✓</div>
            Illustrative evaluation — {selectedExc.sku}
          </div>
        </div>
        <div className="card-body">
          <div className="rca-finding" style={{ marginBottom: '10px' }}>{ev.verdict}</div>
          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '10px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: '5px' }}>
              Improvement note
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>{ev.improvement}</div>
          </div>
        </div>
      </div>

      <div className="eval-grid">
        {ev.extraMetrics.map((m, i) => (
          <div key={i} className="eval-metric">
            <div className="em-label">{m.label}</div>
            <div className={`em-val ${m.cls}`}>{m.val}</div>
            <div className="em-sub">{m.sub}</div>
            <div className="em-note">{m.note}</div>
          </div>
        ))}
      </div>
    </>
  )
}
