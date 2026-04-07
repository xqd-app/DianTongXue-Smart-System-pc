/**
 * SHA-256 → 小写 hex。优先 Web Crypto；非安全上下文（如 http://局域网 IP）无 crypto.subtle 时用 crypto-js。
 */
import CryptoJS from 'crypto-js'

export async function sha256HexUtf8(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (subtle && typeof subtle.digest === 'function') {
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex)
}
