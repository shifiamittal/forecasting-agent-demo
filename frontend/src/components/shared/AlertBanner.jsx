export default function AlertBanner({ level, icon, title, desc }) {
  return (
    <div className={`alert ${level}`}>
      <div className="alert-icon">{icon}</div>
      <div>
        <div className="alert-title">{title}</div>
        <div className="alert-desc">{desc}</div>
      </div>
    </div>
  )
}
