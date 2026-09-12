export default function Sidebar({ clients, selectedClient, onSelectClient, cycleData }) {
  return <aside className="sidebar">
    <div className="sb-top"><div className="sb-brand">Forecast<span> Review</span></div><div className="sb-sub">Forecasting Agent</div></div>
    <div className="sb-section"><div className="sb-label">Fictional clients</div>
      {clients.map(c => <button key={c.id} className={`client-card${selectedClient === c.id ? ' active' : ''}`} onClick={() => onSelectClient(c.id)}><span className="cc-name">{c.name}</span></button>)}
    </div>
    <div className="sb-section"><div className="sb-label">Review context</div><div className="cycle-card">
      <div className="cc-row"><span className="cc-k">Client</span><span className="cc-v">{cycleData.cycle.client_name}</span></div>
      <div className="cc-row"><span className="cc-k">Cycle</span><span className="cc-v">April 2026</span></div>
      <div className="cc-row"><span className="cc-k">Products scanned</span><span className="cc-v">{cycleData.cycle.skus_scanned}</span></div>
    </div></div>
    <div className="sb-section"><div className="sb-label">Decision approach</div><p className="sidebar-explainer">Check the evidence.<br/>Act within clear limits.<br/>Bring people in when needed.</p></div>
    <div className="sb-footer demo-disclosure">Interactive Prototype · Synthetic Demo Data</div>
  </aside>
}
