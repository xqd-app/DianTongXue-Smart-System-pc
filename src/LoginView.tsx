import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { persistLogin } from './authStorage'
import { loginWithPassword } from './loginApi'
import './Login.css'

function UserFieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="9" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6 19c0-3.3 2.7-6 6-6s6 2.7 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockFieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <rect
        x="5"
        y="10"
        width="14"
        height="11"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 10V8a4 4 0 0 1 8 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

type LoginViewProps = {
  onLoggedIn: (account: string) => void
}

function LoginBrandMark({ gradientId }: { gradientId: string }) {
  return (
    <svg className="login-brand-svg" viewBox="0 0 88 88" width="88" height="88" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fdba74" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="44" r="41" fill={`url(#${gradientId})`} />
      <path
        d="M44 10 Q 58 14 66 26"
        fill="none"
        stroke="#15803d"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <ellipse cx="44" cy="71" rx="16" ry="9" fill="#fb923c" opacity="0.92" />
      <circle cx="44" cy="45" r="23" fill="#fff" opacity="0.96" />
      <text
        x="44"
        y="51"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#c2410c"
        fontFamily="system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif"
      >
        滇同学
      </text>
    </svg>
  )
}

export default function LoginView({ onLoggedIn }: LoginViewProps) {
  const navigate = useNavigate()
  const gradId = useId().replace(/:/g, '')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [logoImgOk, setLogoImgOk] = useState(true)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const u = account.trim()
    if (!u) {
      setError('请输入账号')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    setPending(true)
    try {
      const { token } = await loginWithPassword(u, password)
      persistLogin(remember, u, token ?? null)
      onLoggedIn(u)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败'
      setError(msg)
    } finally {
      setPending(false)
    }
  }

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
  }

  return (
    <div className="login-screen">
      <header className="login-top-bar">
        <button type="button" className="login-top-btn" aria-label="返回" onClick={goBack}>
          <span className="login-top-back-icon" aria-hidden>
            ‹
          </span>
        </button>
        <button type="button" className="login-top-btn" aria-label="更多">
          <span className="login-top-more-icon" aria-hidden>
            ···
          </span>
        </button>
      </header>

      <div className="login-body">
        <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-logo">
            {logoImgOk ? (
              <img
                src={`${import.meta.env.BASE_URL}dtx-logo.png`}
                alt="滇同学·智慧中台"
                width={88}
                height={88}
                decoding="async"
                onError={() => setLogoImgOk(false)}
              />
            ) : (
              <LoginBrandMark gradientId={gradId} />
            )}
          </div>
        </div>
        <h1 className="login-title">智慧中台</h1>
        <p className="login-sub">欢迎登录，请使用您的账号密码</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div>
            <span className="login-field-label">账号</span>
            <div className="login-input-row">
              <input
                type="text"
                name="account"
                autoComplete="username"
                placeholder="请输入账号"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                aria-label="账号"
              />
              <span className="login-input-icon">
                <UserFieldIcon />
              </span>
            </div>
          </div>
          <div>
            <span className="login-field-label">密码</span>
            <div className="login-input-row">
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="密码"
              />
              <span className="login-input-icon">
                <LockFieldIcon />
              </span>
            </div>
          </div>

          {error ? <p className="login-error">{error}</p> : null}

          <button type="submit" className="login-submit" disabled={pending}>
            {pending ? '登录中…' : '登录'}
          </button>
        </form>

        <div className="login-footer-row">
          <label className="login-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            记住我
          </label>
          <button type="button" className="login-forgot">
            忘记密码？
          </button>
        </div>

        <p className="login-copy">© 2026 滇同学·智慧中台 版权所有</p>
        </div>
      </div>
    </div>
  )
}
