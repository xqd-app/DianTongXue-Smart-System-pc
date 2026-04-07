import { useEffect, useMemo, useState } from 'react'

export const SC_FAVORITES_LS_KEY = 'dian_sc_favorites_license_v1'

const listeners = new Set<() => void>()

function notifyFavoritesChanged() {
  listeners.forEach((fn) => fn())
}

export function subscribeScFavorites(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function loadFavoriteLicenseNos(): Set<string> {
  try {
    const raw = localStorage.getItem(SC_FAVORITES_LS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim()))
  } catch {
    return new Set()
  }
}

function persistFavoriteLicenseNos(next: Set<string>) {
  try {
    localStorage.setItem(SC_FAVORITES_LS_KEY, JSON.stringify([...next]))
  } catch {
    /* ignore */
  }
  notifyFavoritesChanged()
}

/** @returns 收藏后 true，取消后 false */
export function toggleLicenseFavorite(licenseNo: string): boolean {
  const key = licenseNo.trim()
  if (!key) return false
  const s = loadFavoriteLicenseNos()
  const next = new Set(s)
  if (next.has(key)) {
    next.delete(key)
    persistFavoriteLicenseNos(next)
    return false
  }
  next.add(key)
  persistFavoriteLicenseNos(next)
  return true
}

export function isLicenseFavorite(licenseNo: string): boolean {
  return loadFavoriteLicenseNos().has(licenseNo.trim())
}

/** 是否与本地收藏中的许可证号一致（忽略空格、大小写） */
export function isLicenseInFavorites(set: Set<string>, raw: string): boolean {
  const t = raw.replace(/\s/g, '').trim()
  if (!t) return false
  if (set.has(t)) return true
  const u = t.toUpperCase()
  for (const k of set) {
    if (k.replace(/\s/g, '').toUpperCase() === u) return true
  }
  return false
}

/** 列表/详情订阅收藏集变化（含本页 toggle、其它页、多标签 storage） */
export function useScFavoriteSet(): Set<string> {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const unsub = subscribeScFavorites(() => setTick((t) => t + 1))
    const onStorage = (e: StorageEvent) => {
      if (e.key === SC_FAVORITES_LS_KEY) setTick((t) => t + 1)
    }
    window.addEventListener('storage', onStorage)
    return () => {
      unsub()
      window.removeEventListener('storage', onStorage)
    }
  }, [])
  return useMemo(() => loadFavoriteLicenseNos(), [tick])
}

export function FavoriteStarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
