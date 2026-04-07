/**
 * 与智慧中台 dev/src/utils/passwordEncryption.ts 的 encryptPassword 一致：SHA256 → 小写 hex（64 位）
 */

import { sha256HexUtf8 } from './sha256Hex'

export async function sha256PasswordHex(password: string): Promise<string> {
  if (!password) return ''
  return sha256HexUtf8(password)
}
