/** 中台/库表常把空值写成字面值；展示与映射时应视为无值 */
export function isNullishLiteralString(s: string): boolean {
  const t = s.trim().toLowerCase()
  return t === 'null' || t === 'undefined' || t === 'none' || t === 'nan' || t === '(null)'
}

export function normalizeApiDisplayString(s: string): string {
  if (isNullishLiteralString(s)) return ''
  return s.trim()
}
