export default function QualityChecks({ evaluation, monitoring }) {
  const labels = ['Evidence grounding', 'Diagnostic sequence', monitoring ? 'Action safety' : 'Action tier']
  return <section className="ed-section ed-quality" aria-label="Quality checks">
    <h2>Quality checks</h2>
    <p>An independent evaluation checks whether the diagnosis is evidence-grounded, follows the required diagnostic process, and applies the correct action tier.</p>
    <ul>{labels.map((label, index) => <li key={label}>
      {label} — <span className={evaluation?.checks[index] === true ? 'ed-quality-pass' : 'ed-quality-review'}>{evaluation?.checks[index] === true ? 'Pass' : 'Human review required'}</span>
    </li>)}</ul>
    <p>Overall evaluation: <strong>{Number.isFinite(evaluation?.overall) ? (evaluation.overall / 100).toFixed(2) : 'Human review required'}</strong></p>
  </section>
}
