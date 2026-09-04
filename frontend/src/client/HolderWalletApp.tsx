import React, { Component, type ReactNode } from 'react'
import HolderApp from './holder/HolderApp'

class HolderErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('Escrow wallet crashed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="pv-shell pv-app">
          <header className="pv-topbar">
            <div className="pv-topbar__inner">
              <a href="/" className="pv-brand">
                <span className="pv-brand__mark" aria-hidden>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
                    <path d="M8 9V7a4 4 0 0 1 8 0v2" />
                  </svg>
                </span>
                <span className="pv-brand__name">PrizeVault</span>
              </a>
            </div>
          </header>
          <main className="pv-main">
            <div className="pv-container" style={{ paddingTop: 'var(--pv-space-10)' }}>
              <div className="pv-card">
                <div className="pv-empty">
                  <h3 className="pv-empty__title">Something went wrong</h3>
                  <p className="pv-empty__text">Reload the page or reconnect your wallet.</p>
                  {this.state.error?.message ? (
                    <code
                      style={{
                        marginTop: 'var(--pv-space-6)',
                        maxWidth: '100%',
                        overflowWrap: 'anywhere',
                        fontSize: 'var(--pv-text-xs)',
                      }}
                    >
                      {this.state.error.message}
                    </code>
                  ) : null}
                </div>
              </div>
            </div>
          </main>
        </div>
      )
    }
    return this.props.children
  }
}

export default function HolderWalletApp() {
  return (
    <HolderErrorBoundary>
      <HolderApp />
    </HolderErrorBoundary>
  )
}

export { HolderErrorBoundary, HolderWalletApp }
