type MineScreenProps = {
  displayName: string
  onLogout: () => void
}

export default function MineScreen({ displayName, onLogout }: MineScreenProps) {
  const label = displayName.trim() || '滇同学'
  return (
    <>
      <header className="dian-topbar">
        <h1 className="dian-topbar-title">我的</h1>
      </header>
      <div className="dian-simple-pad">
        <div className="dian-mine-card">
          <div className="dian-user-avatar" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="9" r="3.5" />
              <path d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="dian-mine-name">{label}</div>
            <div className="dian-mine-sub">智慧中台 · 已登录</div>
          </div>
        </div>
        <div className="dian-menu-list">
          <button type="button" className="dian-menu-row">
            账号与安全
            <small>›</small>
          </button>
          <button type="button" className="dian-menu-row">
            消息通知
            <small>›</small>
          </button>
          <button type="button" className="dian-menu-row">
            关于滇同学
            <small>v0.1</small>
          </button>
        </div>
        <button type="button" className="dian-logout-btn" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </>
  )
}
