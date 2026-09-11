export default function ActionItem({ action }) {
  return (
    <div className="action-item">
      <div className={`act-tier ${action.tierCls}`}>{action.tier} — {action.tierLabel}</div>
      <div className="act-title">{action.title}</div>
      <div className="act-desc">{action.desc}</div>
      <div className={`act-status ${action.statusCls}`}>{action.status}</div>
    </div>
  )
}
