import type { LicenseRow } from './scLicenseTypes'

const PREFIX = 'dian-sc-detail-row:'

export function persistScDetailRowSession(licenseNo: string, row: LicenseRow) {
  const raw = JSON.stringify(row)
  const key = PREFIX + licenseNo
  try {
    sessionStorage.setItem(key, raw)
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(key, raw)
  } catch {
    /* ignore */
  }
}

export function loadScDetailRowSession(licenseNo: string): LicenseRow | null {
  const key = PREFIX + licenseNo
  try {
    const raw = sessionStorage.getItem(key)
    if (raw) return JSON.parse(raw) as LicenseRow
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as LicenseRow
  } catch {
    /* ignore */
  }
  return null
}
