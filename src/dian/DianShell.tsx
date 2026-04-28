import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import HomeScreen from './HomeScreen'
import MineScreen from './MineScreen'
import BusinessScreen from './BusinessScreen'
import PlaceholderScreen from './PlaceholderScreen'
import { ScrollToTopFab } from './ScrollToTopFab'
import './dian-app.css'

export type DianTab = 'home' | 'channel' | 'product' | 'ship' | 'mine'

type DianShellProps = {
  displayName: string
  onLogout: () => void
}

function TabIcon({ id, active }: { id: DianTab; active: boolean }) {
  const c = active ? '#2563eb' : '#94a3b8'
  switch (id) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
          <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" strokeLinejoin="round" />
        </svg>
      )
    case 'channel':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="5" cy="12" r="2.2" fill={c} stroke="none" />
          <circle cx="19" cy="6" r="2.2" fill={c} stroke="none" />
          <circle cx="19" cy="18" r="2.2" fill={c} stroke="none" />
          <path d="M7 12 L17 6 M7 12 L17 18" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'product':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
          <path d="M6 8h12v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      )
    case 'ship':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
          <path d="M3 16h18l-2 4H5l-2-4z" />
          <path d="M5 16V8h10v8" />
          <circle cx="8" cy="18" r="1" fill={c} stroke="none" />
          <circle cx="16" cy="18" r="1" fill={c} stroke="none" />
        </svg>
      )
    case 'mine':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" aria-hidden>
          <circle cx="12" cy="9" r="3.5" />
          <path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

const TABS: { id: DianTab; label: string }[] = [
  { id: 'home', label: '首页' },
  { id: 'channel', label: '数据' },
  { id: 'product', label: 'AI' },
  { id: 'ship', label: '业务' },
  { id: 'mine', label: '我的' },
]

const DIAN_TAB_STORAGE_KEY = 'dian-shell-tab-v1'

function isDianTab(p: string | null): p is DianTab {
  return p === 'home' || p === 'channel' || p === 'product' || p === 'ship' || p === 'mine'
}

/** URL ?tab= 优先；否则用上次 Tab（侧滑从 /sc-query 回到 / 时仍是业务等，而不是总页默认首页） */
function resolveInitialTab(searchParams: URLSearchParams): DianTab {
  const p = searchParams.get('tab')
  if (isDianTab(p)) return p
  try {
    const s = sessionStorage.getItem(DIAN_TAB_STORAGE_KEY)
    if (isDianTab(s)) return s
  } catch {
    /* ignore */
  }
  return 'home'
}

export default function DianShell({ displayName, onLogout }: DianShellProps) {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<DianTab>(() => resolveInitialTab(searchParams))
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const p = searchParams.get('tab')
    if (isDianTab(p)) setTab(p)
  }, [searchParams])

  useEffect(() => {
    try {
      sessionStorage.setItem(DIAN_TAB_STORAGE_KEY, tab)
    } catch {
      /* ignore */
    }
  }, [tab])

  useEffect(() => {
    // 同步 document.title + meta title，并触发微信 WebView 刷新标题
    const current = TABS.find((item) => item.id === tab)
    const title =
      tab === 'home' || tab === 'mine' ? '滇同学·智慧中台' : (current?.label ?? '滇同学·智慧中台')

    const applyTitle = () => {
      document.title = title
      const appMeta = document.querySelector('meta[name="application-name"]')
      appMeta?.setAttribute('content', title)
      const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      appleMeta?.setAttribute('content', title)
    }

    applyTitle()
    const retryId = window.setTimeout(() => {
      applyTitle()
      // 微信 iOS 容器标题刷新兜底
      const ua = window.navigator.userAgent.toLowerCase()
      if (ua.includes('micromessenger')) {
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = 'about:blank'
        const remove = () => {
          iframe.removeEventListener('load', remove)
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }
        iframe.addEventListener('load', remove)
        document.body.appendChild(iframe)
      }
    }, 80)
    return () => window.clearTimeout(retryId)
  }, [tab])

  return (
    <div className="dian-shell">
      <div ref={setScrollRoot} className="dian-scroll">
        {tab === 'home' ? <HomeScreen /> : null}
        {tab === 'channel' ? (
          <PlaceholderScreen title="数据" items={['经营数据', '统计报表', '多维分析']} />
        ) : null}
        {tab === 'product' ? <PlaceholderScreen title="AI" items={[]} /> : null}
        {tab === 'ship' ? <BusinessScreen /> : null}
        {tab === 'mine' ? <MineScreen displayName={displayName} onLogout={onLogout} /> : null}
      </div>

      <ScrollToTopFab target="element" scrollEl={scrollRoot} variant="aboveTabbar" />

      <nav className="dian-tabbar" aria-label="主导航">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'dian-active' : ''}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <TabIcon id={id} active={tab === id} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
