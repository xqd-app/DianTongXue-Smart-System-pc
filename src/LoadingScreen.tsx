import { useEffect } from 'react'
import './LoadingScreen.css'

export default function LoadingScreen() {
  useEffect(() => {
    document.title = '滇同学·智慧中台'
  }, [])

  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true" aria-label="加载中">
      <h1 className="loading-screen-brand">滇同学·智慧中台</h1>
      <div className="loading-screen-spinner" aria-hidden />
      <p className="loading-screen-hint">正在加载…</p>
    </div>
  )
}
