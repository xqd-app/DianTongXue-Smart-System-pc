/**
 * 非 HTTPS（非安全上下文）下 Web Crypto 的 randomUUID / subtle 可能不可用或抛错，统一走安全回退。
 */
export function safeRandomUuid(): string {
  try {
    if (
      globalThis.isSecureContext === true &&
      globalThis.crypto != null &&
      typeof globalThis.crypto.randomUUID === 'function'
    ) {
      return globalThis.crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `n-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}
