import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RootErrorBoundary } from './RootErrorBoundary.tsx'

/** 微信/系统顶栏等常在 JS 执行前就读 title */
document.title = '滇同学·智慧中台'

/**
 * Hash 模式：尚无 # 片段时，把「pathname 里 base 之后的部分」迁到 hash（如 /mobile/sc-query → #/sc-query），
 * 避免首屏 hash 为空时 HashRouter 不匹配白屏；仅 /mobile 则变为 #/。
 */
function ensureHashRootForSpa(): void {
  const v = import.meta.env.VITE_HASH_ROUTER?.trim().toLowerCase()
  if (v !== 'true' && v !== '1' && v !== 'yes') return
  const h = window.location.hash
  if (h !== '' && h !== '#') return

  const rawBase = import.meta.env.BASE_URL || '/'
  const base = rawBase.replace(/\/+$/, '') || ''
  const path = window.location.pathname
  let suffix: string
  if (base && (path === base || path.startsWith(`${base}/`))) {
    suffix = path.slice(base.length) || '/'
  } else if (!base || base === '/') {
    suffix = path || '/'
  } else {
    suffix = '/'
  }
  const frag = suffix === '' || suffix === '/' ? '/' : suffix.startsWith('/') ? suffix : `/${suffix}`
  window.location.hash = `#${frag}`
}

ensureHashRootForSpa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
