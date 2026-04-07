/**
 * 与智慧中台 dev/src/utils/requestSigner.ts 一致：参与验签的 path 须与 Express req.path 相同（如 /api/auth/login）。
 */

import { sha256HexUtf8 } from './sha256Hex'

const DEFAULT_SECRET = 'dtxmms-sign-secret-key-change-in-production-2024'

function signSecret(): string {
  const s = import.meta.env.VITE_SIGN_SECRET?.trim()
  return s || DEFAULT_SECRET
}

function generateNonce(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateRequestId(): string {
  return `${Date.now()}-${generateNonce(8)}`
}

function serializeParams(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params).sort()
  const sortedParams: Record<string, string> = {}

  for (const key of sortedKeys) {
    const value = params[key]
    if (value === null || value === undefined) {
      sortedParams[key] = ''
    } else if (typeof value === 'object') {
      sortedParams[key] = JSON.stringify(value)
    } else {
      sortedParams[key] = String(value)
    }
  }

  return Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
}

export type RequestSignPayload = {
  sign: string
  timestamp: number
  nonce: string
  requestId: string
}

/**
 * @param endpoint 与服务器 validateRequest(req.path) 一致，登录为 /api/auth/login
 * @param body 不含 sign、timestamp、nonce、requestId 的业务字段
 */
export async function generateRequestSign(
  endpoint: string,
  body: Record<string, unknown> = {},
  config?: Partial<{ timestamp: number; nonce: string; requestId: string }>,
): Promise<RequestSignPayload> {
  const timestamp = config?.timestamp ?? Date.now()
  const nonce = config?.nonce ?? generateNonce()
  const requestId = config?.requestId ?? generateRequestId()

  const params: Record<string, unknown> = {
    ...body,
    endpoint,
  }
  const serializedParams = serializeParams(params)
  const signString = [endpoint, String(timestamp), nonce, requestId, serializedParams, signSecret()].join('|')
  const sign = await sha256HexUtf8(signString)

  return { sign, timestamp, nonce, requestId }
}
