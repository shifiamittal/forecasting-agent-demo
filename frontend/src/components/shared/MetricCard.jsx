export default function MetricCard({ label, val, cls, sub, subCls }) {
  return (
    <div className="metric">
      <div className="met-label">{label}</div>
      <div className={`met-val ${cls}`}>{val}</div>
      <div className={`met-sub${subCls ? ` ${subCls}` : ''}`}>{sub}</div>
    </div>
  )
}
