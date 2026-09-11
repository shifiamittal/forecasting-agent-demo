export default function ChunkCard({ chunk }) {
  const simPct = Math.round(chunk.sim * 100)
  return (
    <div className="chunk-card">
      <div className="ck-top">
        <div>
          <div className="ck-source">{chunk.source}</div>
          <div className="ck-id">{chunk.id}</div>
        </div>
        <div className="ck-sim">
          <span className="sim-label">Cosine similarity</span>
          <div className="sim-bar-bg">
            <div className="sim-bar-fill" style={{ width: `${simPct}%` }} />
          </div>
          <span className="sim-val">{chunk.sim.toFixed(2)}</span>
        </div>
      </div>
      <div className="ck-preview">{chunk.preview}</div>
      <div className="ck-tags">
        {chunk.tags.map((t, i) => (
          <span key={i} className="qb-tag qt-gray">{t}</span>
        ))}
        <span className="qb-tag qt-blue">{chunk.date}</span>
      </div>
    </div>
  )
}
