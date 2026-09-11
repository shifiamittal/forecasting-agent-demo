import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('React render error:', error, info.componentStack)
  }

  reset() {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (error) {
      const msg = (error instanceof Error)
        ? (error.stack || error.message)
        : String(error)
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100vh', background: '#0f172a', padding: '32px'
        }}>
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: '10px', padding: '28px 32px', maxWidth: '640px', width: '100%'
          }}>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: '14px', marginBottom: '8px' }}>
              React render error — paste this to diagnose
            </div>
            <pre style={{
              background: '#0f172a', borderRadius: '6px', padding: '12px',
              fontSize: '11.5px', color: '#94a3b8', overflowX: 'auto',
              marginBottom: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {msg}
            </pre>
            <button
              onClick={() => this.reset()}
              style={{
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: '6px', padding: '7px 18px', fontSize: '13px',
                cursor: 'pointer', fontWeight: 600
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
