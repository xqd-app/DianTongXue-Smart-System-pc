import type { LicenseRow } from './scLicenseTypes'

const PREFIX = 'dian-sc-detail-row:'

export function persistScDetailRowSession(licenseNo: string, row: LicenseRow) {
  try {
    sessionStorage.setItem(PREFIX + licenseNo, JSON.stringify(row))
  } catch {
    /* ignore */
  }
}

export function loadScDetailRowSession(licenseNo: string): LicenseRow | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + licenseNo)
    if (!raw) return null
    return JSON.parse(raw) as LicenseRow
  } catch {
    return null
  }
}
