import type { EnterpriseNoteEntry } from './scEnterpriseNoteTypes'

const LS_KEY = 'dtx_sc_enterprise_notes_v1'

function readAll(): Record<string, EnterpriseNoteEntry[]> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object') return {}
    return p as Record<string, EnterpriseNoteEntry[]>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, EnterpriseNoteEntry[]>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    /* 配额满等 */
  }
}

export function loadLocalNoteHistory(licenseNo: string): EnterpriseNoteEntry[] {
  const all = readAll()
  const list = all[licenseNo]
  return Array.isArray(list) ? [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt)) : []
}

export function appendLocalNoteHistory(licenseNo: string, entry: EnterpriseNoteEntry) {
  const all = readAll()
  const prev = Array.isArray(all[licenseNo]) ? all[licenseNo] : []
  all[licenseNo] = [entry, ...prev]
  writeAll(all)
}

export function replaceLocalNoteHistory(licenseNo: string, items: EnterpriseNoteEntry[]) {
  const all = readAll()
  all[licenseNo] = [...items].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  writeAll(all)
}
