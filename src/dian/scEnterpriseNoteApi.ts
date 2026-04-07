/**
 * 与中台 test-server 对齐：
 * - GET/POST /scquery/enterprises/:id/notes（Body: { notes, images }）
 * - POST /scquery/enterprises/:id/contact-status（Body: { contactStatus: 0|1 }）
 * - POST /scquery/enterprises/:id/contact-phone（Body: { phone }）
 * - 可选拉历史图：GET /scquery/note-history/:enterpriseId/:historyId 或
 *   GET /scquery/enterprises/:id/notes/history/:historyId → { images: string[] }
 *
 * :id 与库主键一致，类型为 TEXT，前端一律按 string 路径段处理。
 */

import type { EnterpriseNoteEntry } from './scEnterpriseNoteTypes'
import { appendLocalNoteHistory, loadLocalNoteHistory, replaceLocalNoteHistory } from './scEnterpriseNoteStorage'
import { getScQueryPrefixUrl } from './scQueryApi'
import type { LicenseRow } from './scLicenseTypes'

export function hasEnterpriseId(id: string | undefined | null): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

export function noteStorageKey(row: Pick<LicenseRow, 'enterpriseId' | 'licenseNo'>): string {
  if (hasEnterpriseId(row.enterpriseId)) return row.enterpriseId.trim()
  return row.licenseNo
}

function enterprisesNotesUrl(prefix: string, enterpriseId: string): string {
  return `${prefix.replace(/\/+$/, '')}/enterprises/${encodeURIComponent(enterpriseId)}/notes`
}

function parseHistoryItem(it: Record<string, unknown>): EnterpriseNoteEntry | null {
  const id = it.id != null ? String(it.id) : ''
  const savedAt =
    typeof it.savedAt === 'string'
      ? it.savedAt
      : typeof it.createdAt === 'string'
        ? it.createdAt
        : ''
  const text = typeof it.notes === 'string' ? it.notes : typeof it.text === 'string' ? it.text : ''
  let images: string[] = []
  if (Array.isArray(it.images)) {
    images = it.images.filter((x): x is string => typeof x === 'string')
  }
  const imageCount = typeof it.imageCount === 'number' ? it.imageCount : undefined
  if (!id || !savedAt) return null
  return { id, savedAt, text, images, imageCount }
}

function parseNotesGetBody(body: unknown): EnterpriseNoteEntry[] {
  if (!body || typeof body !== 'object') return []
  const o = body as Record<string, unknown>
  const hist = Array.isArray(o.history) ? o.history : []
  if (hist.length > 0) {
    const out: EnterpriseNoteEntry[] = []
    for (const item of hist) {
      if (item && typeof item === 'object') {
        const e = parseHistoryItem(item as Record<string, unknown>)
        if (e) out.push(e)
      }
    }
    return out.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  }
  const notes = typeof o.notes === 'string' ? o.notes : ''
  const images = Array.isArray(o.images) ? o.images.filter((x): x is string => typeof x === 'string') : []
  if (!notes.trim() && images.length === 0) return []
  const savedAt =
    typeof o.contactAt === 'string' && o.contactAt.trim()
      ? o.contactAt
      : typeof o.updatedAt === 'string' && o.updatedAt.trim()
        ? o.updatedAt
        : new Date().toISOString()
  return [{ id: 'server-current', savedAt, text: notes, images, imageCount: images.length }]
}

/** 历史条目有 imageCount 但无 images 时尝试拉取 */
export async function fetchNoteHistoryDetailImages(enterpriseId: string, historyId: string): Promise<string[]> {
  const prefix = getScQueryPrefixUrl()
  if (!prefix) return []
  const p = prefix.replace(/\/+$/, '')
  const encE = encodeURIComponent(enterpriseId)
  const encH = encodeURIComponent(historyId)
  const candidates = [`${p}/note-history/${encE}/${encH}`, `${p}/enterprises/${encE}/notes/history/${encH}`]
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) continue
      const body: unknown = await res.json()
      if (body && typeof body === 'object') {
        const imgs = (body as Record<string, unknown>).images
        if (Array.isArray(imgs)) return imgs.filter((x): x is string => typeof x === 'string')
      }
    } catch {
      /* next */
    }
  }
  return []
}

async function hydrateHistoryImages(enterpriseId: string, entries: EnterpriseNoteEntry[]): Promise<EnterpriseNoteEntry[]> {
  const tasks = entries.map(async (e) => {
    const n = e.imageCount ?? 0
    if (n <= 0 || e.images.length > 0) return e
    const imgs = await fetchNoteHistoryDetailImages(enterpriseId, e.id)
    return { ...e, images: imgs }
  })
  return Promise.all(tasks)
}

/** 合并：本地 + GET enterprises/:id/notes */
export async function fetchEnterpriseNoteHistory(
  enterpriseId: string | undefined,
  licenseNo: string,
): Promise<EnterpriseNoteEntry[]> {
  const storageKey = hasEnterpriseId(enterpriseId) ? enterpriseId.trim() : licenseNo
  const local = loadLocalNoteHistory(storageKey)
  const prefix = getScQueryPrefixUrl()
  if (!prefix || !hasEnterpriseId(enterpriseId)) return local

  const id = enterpriseId.trim()
  try {
    const res = await fetch(enterprisesNotesUrl(prefix, id), {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return local
    const body: unknown = await res.json()
    let remote = parseNotesGetBody(body)
    remote = await hydrateHistoryImages(id, remote)
    if (remote.length === 0) return local
    const byId = new Map<string, EnterpriseNoteEntry>()
    for (const e of local) byId.set(e.id, e)
    for (const e of remote) byId.set(e.id, e)
    const merged = [...byId.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    replaceLocalNoteHistory(storageKey, merged)
    return merged
  } catch {
    return local
  }
}

export type SaveEnterpriseNotesBody = {
  notes: string
  images: string[]
}

/** POST enterprises/:id/notes */
export async function saveEnterpriseNotesRemote(enterpriseId: string, body: SaveEnterpriseNotesBody): Promise<boolean> {
  const prefix = getScQueryPrefixUrl()
  if (!prefix) return false
  try {
    const res = await fetch(enterprisesNotesUrl(prefix, enterpriseId.trim()), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: body.notes, images: body.images }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function persistNoteEntryLocal(storageKey: string, entry: EnterpriseNoteEntry) {
  appendLocalNoteHistory(storageKey, entry)
}

/** POST enterprises/:id/contact-status，0 未联系 / 1 已联系 */
export async function saveEnterpriseContactStatusRemote(enterpriseId: string, contactStatus: 0 | 1): Promise<boolean> {
  const prefix = getScQueryPrefixUrl()
  if (!prefix) return false
  const url = `${prefix.replace(/\/+$/, '')}/enterprises/${encodeURIComponent(enterpriseId.trim())}/contact-status`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactStatus }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** POST enterprises/:id/contact-phone */
export async function saveEnterpriseContactPhoneRemote(enterpriseId: string, phone: string): Promise<boolean> {
  const prefix = getScQueryPrefixUrl()
  if (!prefix) return false
  const url = `${prefix.replace(/\/+$/, '')}/enterprises/${encodeURIComponent(enterpriseId.trim())}/contact-phone`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    return res.ok
  } catch {
    return false
  }
}
