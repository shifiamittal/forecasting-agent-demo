export default function ConfidenceBar({ confidence }) {
  const color = confidence >= 90 ? '#16a34a' : confidence >= 80 ? '#d97706' : '#dc2626'
  return (
    <div className="conf-row">
      <span className="conf-lbl">Confidence</span>
      <div className="conf-bar-bg">
        <div className="conf-bar-fill" style={{ width: `${confidence}%`, background: color }} />
      </div>
      <span className="conf-val" style={{ color }}>{confidence}%</span>
    </div>
  )
}
