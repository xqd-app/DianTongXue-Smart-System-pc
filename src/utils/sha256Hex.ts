/**
 * SHA-256 → 小写 hex。
 * 用可选链判断 digest，避免 `crypto.subtle` 为 undefined 时求值 `crypto.subtle.digest` 抛错；失败则走 crypto-js（HTTP / 旧 WebView 等）。
 */
import CryptoJS from 'crypto-js'

export async function sha256HexUtf8(text: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    try {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    } catch {
      /* 非安全上下文、内嵌 WebView 限制等 */
    }
  }
  return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex)
}
