import { useEffect, useState } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import LoginView from './LoginView'
import DianShell from './dian/DianShell'
import ScQueryScreen from './dian/ScQueryScreen'
import ScLicenseDetailPage from './dian/ScLicenseDetailPage'
import LoadingScreen from './LoadingScreen'
import { clearLogin, getAccountDisplay, isAuthLoggedIn } from './authStorage'
import './App.css'

const APP_BOOT_MIN_MS = 900

function routerBasename(): string | undefined {
  const raw = import.meta.env.BASE_URL
  if (raw === '/' || raw === '') return undefined
  return raw.replace(/\/$/, '') || undefined
}

/** 为 true 时使用 Hash 路由，避免 /mobile/sc-query/... 深层路径刷新被网关回退到 PC 站 index */
function useHashRouterFromEnv(): boolean {
  const v = import.meta.env.VITE_HASH_ROUTER?.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

/** Hash 模式不传 basename：子路径 basename 与 HashRouter 在部分 WebView 下组合会导致匹配失败白屏；JS/CSS 仍由 Vite `base` 决定。 */
function routerBasenameForRouter(useHash: boolean): string | undefined {
  if (useHash) return undefined
  return routerBasename()
}

/** 开发/演示：跳过账号校验（VITE_SKIP_LOGIN=true；dev 默认见 vite.config） */
function envSkipLogin(): boolean {
  const v = import.meta.env.VITE_SKIP_LOGIN
  return v === 'true' || v === '1' || v === 'yes'
}

function skipLoginDisplayName(): string {
  return import.meta.env.VITE_SKIP_LOGIN_DISPLAY?.trim() || '访客'
}

function ScQueryPage() {
  return <ScQueryScreen />
}

function ScLicenseDetailRoute() {
  const navigate = useNavigate()
  const onBack = () => {
    // 手机 WebView 中 -1 可能回到外部（如网页版智慧中台）；详情返回固定回站内列表
    void navigate('/sc-query', { replace: true })
  }
  return <ScLicenseDetailPage onBack={onBack} />
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [loggedIn, setLoggedIn] = useState(() => isAuthLoggedIn() || envSkipLogin())
  const [accountName, setAccountName] = useState(() => {
    if (envSkipLogin()) return skipLoginDisplayName()
    return isAuthLoggedIn() ? getAccountDisplay() : ''
  })

  useEffect(() => {
    const id = window.setTimeout(() => setBooting(false), APP_BOOT_MIN_MS)
    return () => window.clearTimeout(id)
  }, [])

  if (booting) {
    return <LoadingScreen />
  }

  const shell = (
    <DianShell
      displayName={accountName || getAccountDisplay() || skipLoginDisplayName()}
      onLogout={() => {
        clearLogin()
        if (envSkipLogin()) {
          setAccountName(skipLoginDisplayName())
          return
        }
        setAccountName('')
        setLoggedIn(false)
      }}
    />
  )

  const useHash = useHashRouterFromEnv()
  const Router = useHash ? HashRouter : BrowserRouter

  return (
    <Router basename={routerBasenameForRouter(useHash)}>
      <Routes>
        <Route
          path="/login"
          element={
            loggedIn ? (
              <Navigate to="/" replace />
            ) : (
              <LoginView
                onLoggedIn={(account) => {
                  setAccountName(account.trim())
                  setLoggedIn(true)
                }}
              />
            )
          }
        />
        <Route path="/sc-query/detail/:licenseNo" element={<ScLicenseDetailRoute />} />
        <Route path="/sc-query" element={<ScQueryPage />} />
        <Route
          path="/"
          element={loggedIn ? shell : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
