import { useState, type FormEvent } from 'react'
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

export default function LoginView({ onLoggedIn }: LoginViewProps) {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败'
      setError(msg)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-logo">
            <img
              src={`${import.meta.env.BASE_URL}dtx-logo.png`}
              alt="滇同学"
              width={88}
              height={88}
              decoding="async"
            />
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
            忘记密码?
          </button>
        </div>

        <p className="login-copy">© 2026 滇同学·智慧中台 版权所有</p>
      </div>
    </div>
  )
}
