import { useState } from 'react'
import HomeScreen from './HomeScreen'
import MineScreen from './MineScreen'
import PlaceholderScreen from './PlaceholderScreen'
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
  { id: 'channel', label: '渠道' },
  { id: 'product', label: '商品' },
  { id: 'ship', label: '发货' },
  { id: 'mine', label: '我的' },
]

export default function DianShell({ displayName, onLogout }: DianShellProps) {
  const [tab, setTab] = useState<DianTab>('home')

  return (
    <div className="dian-shell">
      <div className="dian-scroll">
        {tab === 'home' ? <HomeScreen /> : null}
        {tab === 'channel' ? (
          <PlaceholderScreen title="渠道" subtitle="店铺与销售渠道表现、流量转化将展示于此，支持渠道分析入口。" />
        ) : null}
        {tab === 'product' ? (
          <PlaceholderScreen title="商品" subtitle="商品列表、库存与动销分析将展示于此。" />
        ) : null}
        {tab === 'ship' ? <PlaceholderScreen title="发货" subtitle="发货单、物流跟踪与发货预警将展示于此。" /> : null}
        {tab === 'mine' ? <MineScreen displayName={displayName} onLogout={onLogout} /> : null}
      </div>

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
