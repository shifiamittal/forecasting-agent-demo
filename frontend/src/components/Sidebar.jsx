export default function Sidebar({ clients, selectedClient, onSelectClient, cycleData, onRun }) {
  const cycle = cycleData.cycle
  return (
    <aside className="sidebar">
      <div className="sb-top"><div className="sb-brand">Forecast<span> Review</span></div><div className="sb-sub">Forecasting Agent</div></div>
      <div className="sb-section">
        <div className="sb-label">Fictional entities</div>
        {clients.map(c => <button key={c.id} className={`client-card${selectedClient === c.id ? ' active' : ''}`} onClick={() => onSelectClient(c.id)}><span className="cc-name">{c.name}</span><span className="cc-cycle">{c.cycle}</span></button>)}
      </div>
      <div className="sb-section"><div className="sb-label">Example cycle</div><div className="cycle-card">
        <div className="cc-row"><span className="cc-k">Entity</span><span className="cc-v">{cycle.client_name}</span></div>
        <div className="cc-row"><span className="cc-k">Cycle</span><span className="cc-v">{cycle.cycle_id}</span></div>
        <div className="cc-row"><span className="cc-k">Sample SKUs</span><span className="cc-v">{cycle.skus_scanned.toLocaleString()}</span></div>
        <div className="cc-row"><span className="cc-k">Agent architecture</span><span className="cc-v">{cycle.agents_active}</span></div>
      </div></div>
      <div className="sb-section"><div className="sb-label">Demo mode</div><div className="cycle-card">
        <div className="cc-row"><span className="cc-k">Runtime</span><span className="cc-v">Static frontend</span></div>
        <div className="cc-row"><span className="cc-k">Data</span><span className="cc-v">Synthetic fixtures</span></div>
        <div className="cc-row"><span className="cc-k">Actions</span><span className="cc-v">Read-only states</span></div>
        <div className="cc-row"><span className="cc-k">API keys</span><span className="cc-v">Not required</span></div>
      </div></div>
      <button className="run-btn" onClick={onRun}>↺ Reset scenario</button>
      <div className="sb-footer demo-disclosure">Interactive Prototype · Synthetic Demo Data</div>
    </aside>
  )
}
