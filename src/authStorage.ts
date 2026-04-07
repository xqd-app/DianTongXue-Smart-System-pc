const LS_REMEMBER = 'dtx_login_remember_v1'
const SS_SESSION = 'dtx_login_session_v1'
const SS_ACCOUNT = 'dtx_login_account_v1'
const LS_ACCOUNT = 'dtx_login_account_v1'
const SS_TOKEN = 'dtx_auth_token_v1'

export function isAuthLoggedIn(): boolean {
  try {
    if (sessionStorage.getItem(SS_SESSION) === '1') return true
    if (localStorage.getItem(LS_REMEMBER) === '1') return true
  } catch {
    /* 隐私模式等 */
  }
  return false
}

/** 登录成功后写入会话；勾选记住我时同时写入本地，刷新后仍显示账号名 */
export function persistLogin(rememberMe: boolean, accountDisplay: string, authToken?: string | null): void {
  const name = accountDisplay.trim()
  try {
    sessionStorage.setItem(SS_SESSION, '1')
    if (name) sessionStorage.setItem(SS_ACCOUNT, name)
    else sessionStorage.removeItem(SS_ACCOUNT)
    if (authToken) sessionStorage.setItem(SS_TOKEN, authToken)
    else sessionStorage.removeItem(SS_TOKEN)

    if (rememberMe) {
      localStorage.setItem(LS_REMEMBER, '1')
      if (name) localStorage.setItem(LS_ACCOUNT, name)
      else localStorage.removeItem(LS_ACCOUNT)
    } else {
      localStorage.removeItem(LS_REMEMBER)
      localStorage.removeItem(LS_ACCOUNT)
    }
  } catch {
    /* ignore */
  }
}

/** 当前登录展示名：优先本会话，其次记住我存的本地名 */
export function getAccountDisplay(): string {
  try {
    const s = sessionStorage.getItem(SS_ACCOUNT)?.trim()
    if (s) return s
    const l = localStorage.getItem(LS_ACCOUNT)?.trim()
    if (l) return l
  } catch {
    /* ignore */
  }
  return ''
}

export function getAuthToken(): string | null {
  try {
    const t = sessionStorage.getItem(SS_TOKEN)?.trim()
    return t || null
  } catch {
    return null
  }
}

export function clearLogin(): void {
  try {
    sessionStorage.removeItem(SS_SESSION)
    sessionStorage.removeItem(SS_ACCOUNT)
    sessionStorage.removeItem(SS_TOKEN)
    localStorage.removeItem(LS_REMEMBER)
    localStorage.removeItem(LS_ACCOUNT)
  } catch {
    /* ignore */
  }
}
