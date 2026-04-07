/**
 * 智慧中台登录：POST ${API 根}/auth/login
 * - 密码：明文先 SHA256 → 64 位 hex（与 passwordEncryption.encryptPassword 一致）
 * - 签名字段：sign、timestamp、nonce、requestId（与 requestSigner.generateRequestSign 一致）
 * - 验签 path 须为 Express req.path：/api/auth/login
 */

import { sha256PasswordHex } from './utils/passwordHash'
import { generateRequestSign } from './utils/requestSigner'
import { decryptResponse, shouldDecryptResponseJson } from './utils/responseDecryption'

/** 与 test-server validateRequest(req.path) 一致，勿改为 /auth/login */
const LOGIN_SIGN_PATH = '/api/auth/login'

function getApiBase(): string | null {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (apiBase) {
    const t = apiBase.replace(/\/+$/, '')
    return t.startsWith('http') || t.startsWith('/') ? t : `/${t}`
  }
  const root = import.meta.env.VITE_SC_API_BASE?.trim()
  if (root) return `${root.replace(/\/+$/, '')}/api`
  return null
}

function loginPath(): string {
  const p = import.meta.env.VITE_LOGIN_PATH?.trim() || 'auth/login'
  return p.replace(/^\/+/, '')
}

function messageFromJsonBody(body: unknown): string | null {
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>
    const m = o.error ?? o.message ?? o.msg
    if (typeof m === 'string' && m.trim()) return m.trim()
  }
  return null
}

function formatAuthError(body: unknown, fallback: string): string {
  const msg = messageFromJsonBody(body)
  if (!body || typeof body !== 'object') return msg || fallback
  const o = body as Record<string, unknown>
  const code = o.code
  const codeStr = typeof code === 'string' && code.trim() ? code.trim() : null
  if (msg && codeStr) return `${msg}（${codeStr}）`
  return msg || fallback
}

function parseResponseBody(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch {
    return {}
  }
  if (shouldDecryptResponseJson(parsed)) {
    try {
      return decryptResponse(parsed.data)
    } catch {
      throw new Error('响应已加密但解密失败，请检查 VITE_RESPONSE_ENCRYPTION_KEY 与服务器一致')
    }
  }
  return parsed
}

export type LoginResult = { token?: string }

export async function loginWithPassword(account: string, password: string): Promise<LoginResult> {
  const base = getApiBase()
  if (!base) {
    throw new Error('未配置 VITE_API_BASE_URL（或 VITE_SC_API_BASE），无法验证登录')
  }

  const username = account.trim()
  const passwordHash = await sha256PasswordHex(password)
  const businessBody: Record<string, unknown> = { username, password: passwordHash }

  const signPayload = await generateRequestSign(LOGIN_SIGN_PATH, businessBody)
  const signedBody = {
    ...businessBody,
    sign: signPayload.sign,
    timestamp: signPayload.timestamp,
    nonce: signPayload.nonce,
    requestId: signPayload.requestId,
  }

  const url = `${base.replace(/\/+$/, '')}/${loginPath()}`
  let res: Response
  let responseText: string
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Type': 'smart_platform',
      },
      credentials: 'include',
      body: JSON.stringify(signedBody),
    })
    responseText = await res.text()
  } catch {
    throw new Error('网络异常，请检查网络或 API 是否可达')
  }

  const body = parseResponseBody(responseText)

  if (res.status === 401 || res.status === 403) {
    throw new Error(formatAuthError(body, res.status === 403 ? '请求被拒绝' : '用户名或密码错误'))
  }

  if (!res.ok) {
    throw new Error(messageFromJsonBody(body) || res.statusText || `HTTP ${res.status}`)
  }

  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>
    if (o.success === false) {
      throw new Error(messageFromJsonBody(body) || '登录失败')
    }
    const code = o.code
    if (typeof code === 'number' && code !== 0 && code !== 200) {
      throw new Error(messageFromJsonBody(body) || '登录失败')
    }
    const token =
      typeof o.token === 'string'
        ? o.token
        : typeof o.accessToken === 'string'
          ? o.accessToken
          : typeof o.access_token === 'string'
            ? o.access_token
            : undefined
    return token ? { token } : {}
  }

  return {}
}
