import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SC_QUERY_ENTRY_MIN_MS = 160

export default function BusinessScreen() {
  const navigate = useNavigate()
  const [enteringScQuery, setEnteringScQuery] = useState(false)
  const entryLockRef = useRef(false)

  const openScQuery = useCallback(() => {
    if (entryLockRef.current) return
    entryLockRef.current = true
    setEnteringScQuery(true)
    const t0 = performance.now()
    const go = () => {
      const wait = Math.max(0, SC_QUERY_ENTRY_MIN_MS - (performance.now() - t0))
      window.setTimeout(() => {
        void navigate('/sc-query')
      }, wait)
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(go)
    })
  }, [navigate])

  return (
    <>
      {enteringScQuery ? (
        <div
          className="dian-nav-route-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="正在进入 SC 查询"
        >
          <div className="dian-nav-route-loading-backdrop" aria-hidden />
          <div className="dian-nav-route-loading-card">
            <div className="dian-nav-route-loading-spinner" aria-hidden />
            <p className="dian-nav-route-loading-text">正在打开 SC 查询…</p>
          </div>
        </div>
      ) : null}

      <div className="dian-simple-pad">
        <section className="dian-home-modules" aria-label="功能模块">
          <h2 className="dian-home-modules-title">功能模块</h2>
          <div className="dian-home-modules-grid">
            <button
              type="button"
              className="dian-home-module-tile"
              onClick={openScQuery}
              disabled={enteringScQuery}
              aria-busy={enteringScQuery}
            >
              <span className="dian-home-module-icon" aria-hidden>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-5-5z" strokeLinejoin="round" />
                  <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" />
                  <circle cx="15.5" cy="10.5" r="3.5" />
                  <path d="M17.5 12.5L20 15" strokeLinecap="round" />
                </svg>
              </span>
              <span className="dian-home-module-label">sc查询</span>
            </button>
          </div>
        </section>
      </div>
    </>
  )
}
