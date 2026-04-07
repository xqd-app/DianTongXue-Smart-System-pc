/**
 * 与智慧中台 dev/src/utils/responseDecryption.ts 一致（CryptoJS AES-256-CBC）
 */

import CryptoJS from 'crypto-js'

const DEFAULT_KEY = 'dtxmms-response-encryption-key-change-in-production-2024'

function encryptionKey(): string {
  return import.meta.env.VITE_RESPONSE_ENCRYPTION_KEY?.trim() || DEFAULT_KEY
}

export function decryptResponse<T = unknown>(encryptedData: string): T {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey(), {
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  const decryptedString = decrypted.toString(CryptoJS.enc.Utf8)
  if (!decryptedString) {
    try {
      return JSON.parse(encryptedData) as T
    } catch {
      throw new Error('响应解密失败')
    }
  }
  return JSON.parse(decryptedString) as T
}

export function shouldDecryptResponseJson(parsed: unknown): parsed is { encrypted: true; data: string } {
  if (!parsed || typeof parsed !== 'object') return false
  const o = parsed as Record<string, unknown>
  return o.encrypted === true && typeof o.data === 'string'
}
