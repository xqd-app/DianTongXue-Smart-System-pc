import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { detailHaystack } from './licenseDetailModel'
import { MOCK_LICENSE_ROWS } from './mockLicenseRows'
import type { LicenseRow } from './scLicenseTypes'
import {
  buildEnterpriseQueryFromUi,
  fetchScEnterpriseList,
  fetchScQueryAuthorities,
  fetchScQueryCategories,
  getScQueryApiBaseUrl,
} from './scQueryApi'
import type { EnterpriseNoteEntry } from './scEnterpriseNoteTypes'
import {
  fetchEnterpriseNoteHistory,
  hasEnterpriseId,
  noteStorageKey,
  persistNoteEntryLocal,
  saveEnterpriseContactStatusRemote,
  saveEnterpriseNotesRemote,
} from './scEnterpriseNoteApi'
import { safeRandomUuid } from '../utils/safeRandomId'
import { persistScDetailRowSession } from './scDetailRowSession'
import { ScEnterpriseEditSheet } from './scEnterpriseEditSheet'
import ScQuerySearchFilters, {
  type ScContactFilter,
  type ScFavoriteFilter,
  type ScPhoneFilter,
  type ScRemarkFilter,
} from './scQuerySearchFilters'
import {
  FavoriteStarIcon,
  isLicenseInFavorites,
  toggleLicenseFavorite,
  useScFavoriteSet,
} from './scEnterpriseFavorites'
import { ScrollToTopFab } from './ScrollToTopFab'
import './dian-app.css'

export type { LicenseRow } from './scLicenseTypes'

const SC_SEARCH_DEBOUNCE_MS = 320
/** 与中台分页一致：每页条数（滚动触底自动加载下一页） */
const SC_LIST_PAGE_SIZE = 20
/** 列表进详情等路由跳转前最短展示加载层（与业务页进 SC 查询一致） */
const SC_ROUTE_ENTRY_MIN_MS = 160

const SC_FLOAT_BALL_STORAGE_KEY = 'dian-sc-float-ball-pos-v1'
const SC_FLOAT_SHEET_STORAGE_KEY = 'dian-sc-float-sheet-pos-v1'
const SC_FLOAT_SHEET_SIZE_KEY = 'dian-sc-float-sheet-size-v1'
const SC_FLOAT_SHEET_WH_KEY = 'dian-sc-float-sheet-wh-v1'
const SC_FLOAT_BALL_SIZE = 56
const SC_FLOAT_TABBAR_RESERVE = 72
const SC_FLOAT_BALL_DOUBLE_TAP_MS = 380

/** 搜索浮层尺寸档位：0 较小 · 1 中等 · 2 较大（顶部栏双击循环切换） */
const SC_FLOAT_SHEET_SIZE_PRESETS = [
  { wMax: 340, wMargin: 24, hRatio: 0.46, hCap: 400 },
  { wMax: 400, wMargin: 20, hRatio: 0.62, hCap: 540 },
  { wMax: 10000, wMargin: 14, hRatio: 0.82, hCap: 680 },
] as const

const SC_FLOAT_SHEET_SIZE_COUNT = SC_FLOAT_SHEET_SIZE_PRESETS.length

/** 离开 /sc-query（含进详情再返回）后恢复列表滚动位置 */
const SC_QUERY_SCROLL_STORAGE_KEY = 'dian-sc-query-scroll-y-v1'
const SC_QUERY_SCROLL_STORAGE_KEY_LOCAL = 'dian-sc-query-scroll-y-local-v1'
/** 从列表点进详情时写入；返回列表后滚到该证号卡片再清除（避免用「视口顶部附近」误滚到首条） */
const SC_QUERY_RETURN_FOCUS_LICENSE_KEY = 'dian-sc-query-return-focus-license-v1'
/** 离开 /sc-query 后恢复筛选、分页与当前列表数据 */
const SC_QUERY_VIEW_STORAGE_KEY = 'dian-sc-query-view-v1'
const SC_QUERY_VIEW_STORAGE_KEY_LOCAL = 'dian-sc-query-view-local-v1'

type ScQueryViewSnapshot = {
  query: string
  debouncedQuery: string
  rows: LicenseRow[]
  filterFood: string
  filterAuthority: string
  filterPhone: ScPhoneFilter
  filterContact: ScContactFilter
  filterRemark: ScRemarkFilter
  filterFavorite: ScFavoriteFilter
  page: number
  listTotal: number
  listDataSource: string | null
  rowsFromApi: boolean
  usedApi: boolean
  topLicenseNo?: string
  topOffsetWithinHost?: number
}

function readScQueryViewSnapshot(): ScQueryViewSnapshot | null {
  try {
    const raw =
      localStorage.getItem(SC_QUERY_VIEW_STORAGE_KEY_LOCAL) ??
      sessionStorage.getItem(SC_QUERY_VIEW_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Partial<ScQueryViewSnapshot>
    if (!Array.isArray(o.rows)) return null
    return {
      query: typeof o.query === 'string' ? o.query : '',
      debouncedQuery: typeof o.debouncedQuery === 'string' ? o.debouncedQuery : '',
      rows: o.rows as LicenseRow[],
      filterFood: typeof o.filterFood === 'string' ? o.filterFood : '',
      filterAuthority: typeof o.filterAuthority === 'string' ? o.filterAuthority : '',
      filterPhone: o.filterPhone === 'has' || o.filterPhone === 'none' ? o.filterPhone : 'all',
      filterContact:
        o.filterContact === '已联系' || o.filterContact === '未联系' ? o.filterContact : 'all',
      filterRemark: o.filterRemark === 'has' || o.filterRemark === 'none' ? o.filterRemark : 'all',
      filterFavorite:
        o.filterFavorite === 'only' || o.filterFavorite === 'none' ? o.filterFavorite : 'all',
      page: typeof o.page === 'number' && o.page >= 1 ? Math.floor(o.page) : 1,
      listTotal: typeof o.listTotal === 'number' && o.listTotal >= 0 ? Math.floor(o.listTotal) : 0,
      listDataSource: typeof o.listDataSource === 'string' ? o.listDataSource : null,
      rowsFromApi: Boolean(o.rowsFromApi),
      usedApi: Boolean(o.usedApi),
      topLicenseNo: typeof o.topLicenseNo === 'string' ? o.topLicenseNo : undefined,
      topOffsetWithinHost:
        typeof o.topOffsetWithinHost === 'number' && Number.isFinite(o.topOffsetWithinHost)
          ? o.topOffsetWithinHost
          : undefined,
    }
  } catch {
    return null
  }
}

function readStoredScrollY(): number | null {
  try {
    const raw =
      localStorage.getItem(SC_QUERY_SCROLL_STORAGE_KEY_LOCAL) ??
      sessionStorage.getItem(SC_QUERY_SCROLL_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { y?: unknown }
    const y = typeof parsed?.y === 'number' && Number.isFinite(parsed.y) ? Math.max(0, parsed.y) : null
    return y
  } catch {
    return null
  }
}

function peekReturnFocusMeta(): { licenseNo: string; offsetWithinHost?: number } | null {
  try {
    const raw = sessionStorage.getItem(SC_QUERY_RETURN_FOCUS_LICENSE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { licenseNo?: unknown; offsetWithinHost?: unknown }
    if (typeof o.licenseNo !== 'string') return null
    const offsetWithinHost =
      typeof o.offsetWithinHost === 'number' && Number.isFinite(o.offsetWithinHost)
        ? o.offsetWithinHost
        : undefined
    return { licenseNo: o.licenseNo, offsetWithinHost }
  } catch {
    return null
  }
}

function clearReturnFocusLicenseNo(): void {
  try {
    sessionStorage.removeItem(SC_QUERY_RETURN_FOCUS_LICENSE_KEY)
  } catch {
    /* ignore */
  }
}

function readTopVisibleLicenseNo(): string | null {
  if (typeof document === 'undefined') return null
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.dian-sc-license-card[data-license-no]'))
  if (cards.length === 0) return null
  const topEdge = 86
  let best: { no: string; score: number } | null = null
  for (const el of cards) {
    const no = el.dataset.licenseNo
    if (!no) continue
    const r = el.getBoundingClientRect()
    const score = Math.abs(r.top - topEdge)
    if (best == null || score < best.score) best = { no, score }
  }
  return best?.no ?? null
}

function readTopVisibleAnchor(
  host: HTMLElement | null,
): { licenseNo: string; offsetWithinHost: number } | null {
  if (typeof document === 'undefined' || !host) return null
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.dian-sc-license-card[data-license-no]'))
  if (cards.length === 0) return null
  const hostRect = host.getBoundingClientRect()
  const topEdge = hostRect.top + 86
  let best: { licenseNo: string; score: number; offsetWithinHost: number } | null = null
  for (const el of cards) {
    const licenseNo = el.dataset.licenseNo
    if (!licenseNo) continue
    const rect = el.getBoundingClientRect()
    const score = Math.abs(rect.top - topEdge)
    const offsetWithinHost = rect.top - hostRect.top
    if (best == null || score < best.score) {
      best = { licenseNo, score, offsetWithinHost }
    }
  }
  return best ? { licenseNo: best.licenseNo, offsetWithinHost: best.offsetWithinHost } : null
}

function readCardOffsetWithinHost(host: HTMLElement | null, licenseNo: string): number | null {
  if (typeof document === 'undefined' || !host || !licenseNo) return null
  const card = document.querySelector<HTMLElement>(
    `.dian-sc-license-card[data-license-no="${CSS.escape(licenseNo)}"]`,
  )
  if (!card) return null
  const hostRect = host.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  return cardRect.top - hostRect.top
}

function resolveScScrollHost(rootEl: HTMLElement | null): HTMLElement | null {
  if (rootEl && rootEl.parentElement) {
    const host = rootEl.parentElement.closest('.dian-scroll')
    if (host instanceof HTMLElement) return host
  }
  const direct = document.querySelector('.dian-shell .dian-scroll')
  return direct instanceof HTMLElement ? direct : null
}

/** 搜索框内容是否像完整许可证号（用于提示「是否已收藏」） */
function looksLikeScLicenseNoInput(raw: string): boolean {
  const t = raw.replace(/\s/g, '').trim()
  return t.length >= 14 && /^SC[A-Z0-9]+$/i.test(t)
}

function clampBallPos(p: { left: number; bottom: number }): { left: number; bottom: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360
  const vh = typeof window !== 'undefined' ? window.innerHeight : 640
  const margin = 12
  const maxLeft = Math.max(margin, vw - SC_FLOAT_BALL_SIZE - margin)
  const maxBottom = Math.max(margin, vh - SC_FLOAT_BALL_SIZE - margin - SC_FLOAT_TABBAR_RESERVE)
  return {
    left: Math.min(Math.max(margin, p.left), maxLeft),
    bottom: Math.min(Math.max(margin, p.bottom), maxBottom),
  }
}

function sheetDimBounds() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360
  const vh = typeof window !== 'undefined' ? window.innerHeight : 640
  const maxH = Math.max(200, vh - SC_FLOAT_TABBAR_RESERVE - 20)
  return {
    minW: 260,
    maxW: Math.max(260, vw - 12),
    minH: 200,
    maxH,
  }
}

function clampSheetDim(dim: { w: number; h: number }): { w: number; h: number } {
  const b = sheetDimBounds()
  return {
    w: Math.min(Math.max(dim.w, b.minW), b.maxW),
    h: Math.min(Math.max(dim.h, b.minH), b.maxH),
  }
}

function sheetDimensions(sizeIdx: number) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360
  const vh = typeof window !== 'undefined' ? window.innerHeight : 640
  const i =
    ((sizeIdx % SC_FLOAT_SHEET_SIZE_COUNT) + SC_FLOAT_SHEET_SIZE_COUNT) % SC_FLOAT_SHEET_SIZE_COUNT
  const spec = SC_FLOAT_SHEET_SIZE_PRESETS[i]
  const w = Math.min(spec.wMax, vw - spec.wMargin)
  const hRaw = Math.min(Math.round(vh * spec.hRatio), spec.hCap)
  const hMaxByViewport = Math.max(200, vh - SC_FLOAT_TABBAR_RESERVE - 20)
  const h = Math.max(200, Math.min(hRaw, hMaxByViewport))
  return clampSheetDim({ w: Math.max(260, w), h })
}

function clampSheetPos(
  p: { left: number; bottom: number },
  dim: { w: number; h: number },
): { left: number; bottom: number } {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 360
  const vh = typeof window !== 'undefined' ? window.innerHeight : 640
  const { w, h } = dim
  const margin = 8
  const minBottom = SC_FLOAT_TABBAR_RESERVE
  const maxBottom = Math.max(minBottom, vh - h - margin)
  const maxLeft = Math.max(margin, vw - w - margin)
  return {
    left: Math.min(Math.max(margin, p.left), maxLeft),
    bottom: Math.min(Math.max(minBottom, p.bottom), maxBottom),
  }
}

function defaultSheetPosForBall(
  ball: { left: number; bottom: number },
  dim: { w: number; h: number },
): { left: number; bottom: number } {
  const { w } = dim
  const left = ball.left + SC_FLOAT_BALL_SIZE / 2 - w / 2
  const bottom = ball.bottom + SC_FLOAT_BALL_SIZE + 12
  return clampSheetPos({ left, bottom }, dim)
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

function IconPhoneRing({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconShare({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.3 11l7.4-4.2M8.3 13l7.4 4.2" strokeLinecap="round" />
    </svg>
  )
}

function foodCategoryFirst(foodCategory: string) {
  return foodCategory.split(/[；;]/)[0]?.trim() || foodCategory
}

/** 去掉类别里的标点与常见符号，只保留文字与数字字母 */
function stripFoodCategorySymbols(s: string): string {
  return s.replace(
    /[；;，,、。．.\s·:："'“”‘’（）()\[\]【】\-_/\\|<>《》〈〉！？!?\u3000]+/g,
    '',
  )
}

/** Logo：去符号后取前 4 字，按 2×2 网格展示 */
function foodCategoryLogoCells(foodCategory: string): [string, string, string, string] {
  const cleaned = stripFoodCategorySymbols(foodCategory.trim())
  const chars = [...cleaned.slice(0, 4)]
  if (chars.length === 0) return ['食', '品', '', '']
  while (chars.length < 4) chars.push('')
  return [chars[0]!, chars[1]!, chars[2]!, chars[3]!]
}

/** 仅两种展示：已联系 / 未联系（历史「待联系」等归入未联系） */
function normalizeContactStatusDisplay(status: string): '已联系' | '未联系' {
  return status.includes('已') ? '已联系' : '未联系'
}

function licContactTagClassForNormalized(display: '已联系' | '未联系') {
  return display === '已联系'
    ? 'dian-sc-lic-tag dian-sc-lic-tag-green'
    : 'dian-sc-lic-tag dian-sc-lic-tag-amber'
}

function LicContactStatusPicker({
  row,
  onChange,
}: {
  row: LicenseRow
  onChange: (row: LicenseRow, next: '已联系' | '未联系') => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const display = normalizeContactStatusDisplay(row.contactStatus)
  const tagCls = licContactTagClassForNormalized(display)

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current && !wrapRef.current.contains(t)) setOpen(false)
    }
    document.addEventListener('click', onDoc, true)
    return () => document.removeEventListener('click', onDoc, true)
  }, [open])

  return (
    <div className="dian-sc-lic-contact-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`dian-sc-lic-contact-tagbtn ${tagCls}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`联系状态 ${display}，点击切换`}
      >
        {display}
      </button>
      {open ? (
        <ul className="dian-sc-lic-contact-menu" role="listbox" aria-label="选择联系状态">
          <li role="none">
            <button
              type="button"
              className="dian-sc-lic-contact-menu-item dian-sc-lic-contact-menu-item--green"
              role="option"
              aria-selected={display === '已联系'}
              onClick={(e) => {
                e.stopPropagation()
                onChange(row, '已联系')
                setOpen(false)
              }}
            >
              已联系
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              className="dian-sc-lic-contact-menu-item dian-sc-lic-contact-menu-item--amber"
              role="option"
              aria-selected={display === '未联系'}
              onClick={(e) => {
                e.stopPropagation()
                onChange(row, '未联系')
                setOpen(false)
              }}
            >
              未联系
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  )
}

function findHighlightRange(text: string, keyword: string): { start: number; end: number } | null {
  const t = text.trim()
  const k = keyword.trim()
  if (!t || !k) return null
  const start = t.toLowerCase().indexOf(k.toLowerCase())
  if (start < 0) return null
  return { start, end: start + k.length }
}

function LicTitle({ name, highlight }: { name: string; highlight: string }) {
  const range = findHighlightRange(name, highlight)
  if (!range) return <>{name}</>
  return (
    <>
      {name.slice(0, range.start)}
      <span className="dian-sc-lic-name-accent">{name.slice(range.start, range.end)}</span>
      {name.slice(range.end)}
    </>
  )
}

function LicAbbr({ short, highlight }: { short: string; highlight: string }) {
  const range = findHighlightRange(short, highlight)
  if (!range) return <span className="dian-sc-lic-abbr-val">{short}</span>
  return (
    <span className="dian-sc-lic-abbr-val">
      {short.slice(0, range.start)}
      <span className="dian-sc-lic-name-accent">{short.slice(range.start, range.end)}</span>
      {short.slice(range.end)}
    </span>
  )
}

/** 本页电话 → 库字段（电话 / enterprisePhone / contactPhone / 公示 / 更多电话）依次取第一个可拨号 */
function resolveScCardDial(row: LicenseRow): { digits: string; display: string } | null {
  const chunks: string[] = []
  const push = (s: string | undefined) => {
    const t = (s ?? '').trim()
    if (t && t !== '-') chunks.push(t)
  }
  push(row.phone)
  const d = row.db
  if (d) {
    push(d.enterprisePhone)
    push(d.contactPhone)
  }
  push(row.publicPhone)
  if (d?.morePhones?.trim()) {
    for (const p of d.morePhones.split(/[,，;；\s]+/)) {
      const t = p.trim()
      if (t && t !== '-') chunks.push(t)
    }
  }
  const tryLen = (min: number) => {
    for (const raw of chunks) {
      const digits = raw.replace(/\D/g, '')
      if (digits.length >= min) return { digits, display: raw }
    }
    return null
  }
  return tryLen(7) ?? tryLen(5)
}

function rowHasDialablePhone(row: LicenseRow): boolean {
  return resolveScCardDial(row) != null
}

function ScLicenseEnterpriseCard({
  row,
  favorited,
  searchHighlight,
  batchSelectMode,
  batchSelected,
  onToggleBatchSelect,
  onShare,
  onToggleFavorite,
  onView,
  onEdit,
  onContactStatusChange,
}: {
  row: LicenseRow
  favorited: boolean
  searchHighlight: string
  batchSelectMode: boolean
  batchSelected: boolean
  onToggleBatchSelect: () => void
  onShare?: () => void
  onToggleFavorite: () => void
  onView: () => void
  onEdit: () => void
  onContactStatusChange: (row: LicenseRow, next: '已联系' | '未联系') => void
}) {
  const foodSeg = foodCategoryFirst(row.foodCategory)
  const logoCells = foodCategoryLogoCells(row.foodCategory)
  const dial = resolveScCardDial(row)
  const phoneSub = dial ? (row.phone.trim() ? row.phone : dial.display) : '暂无联系电话'
  const shareEnterpriseInfo = async () => {
    const text = [
      `公司名称：${row.companyName}`,
      `电话：${phoneSub}`,
      `法人：${row.legalRep || '-'}`,
      `地址：${row.productionAddress || '-'}`,
      `食品类别：${row.foodCategory || '-'}`,
    ].join('\n')
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: `${row.companyName}（食品许可）`,
          text,
        })
        return
      }
    } catch {
      /* ignore: 用户取消系统分享时不提示 */
      return
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        window.alert('已复制分享内容，可粘贴到微信/QQ发送。')
        return
      }
    } catch {
      /* ignore */
    }
    window.prompt('请复制以下内容进行分享：', text)
  }

  return (
    <article
      className="dian-sc-license-card dian-sc-lic-card--pressable"
      data-license-no={row.licenseNo}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        const el = e.target as HTMLElement
        if (
          el.closest(
            'a.dian-sc-lic-phone-tel, button.dian-sc-lic-phone, button.dian-sc-lic-favorite-btn, .dian-sc-lic-contact-wrap, .dian-sc-lic-top-actions, .dian-sc-lic-select-wrap',
          )
        )
          return
        onView()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView()
        }
      }}
      aria-label={`查看 ${row.companyName} 许可证详情`}
    >
      {batchSelectMode ? (
        <label
          className="dian-sc-lic-select-wrap"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input type="checkbox" checked={batchSelected} onChange={onToggleBatchSelect} />
          <span>选择分享</span>
        </label>
      ) : null}
      <div className="dian-sc-lic-quick-bar">
        <div className="dian-sc-lic-top">
          <div className="dian-sc-lic-logo" aria-hidden title={row.foodCategory}>
            <div className="dian-sc-lic-logo-grid">
              {logoCells.map((ch, idx) => (
                <span key={idx} className="dian-sc-lic-logo-cell">
                  {ch}
                </span>
              ))}
            </div>
          </div>
          <div className="dian-sc-lic-top-body">
            <h3 className="dian-sc-lic-name">
              <LicTitle name={row.companyName} highlight={searchHighlight} />
            </h3>
            <div className="dian-sc-lic-tags">
              <LicContactStatusPicker row={row} onChange={onContactStatusChange} />
              <span className="dian-sc-lic-tag dian-sc-lic-tag-blue">{row.bizTag}</span>
            </div>
          </div>
          <div className="dian-sc-lic-top-actions">
            <button
              type="button"
              className={`dian-sc-lic-favorite-btn${favorited ? ' dian-sc-lic-favorite-btn--on' : ''}`}
              aria-label={favorited ? '取消收藏' : '收藏'}
              aria-pressed={favorited}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite()
              }}
            >
              <FavoriteStarIcon filled={favorited} />
            </button>
            <div className="dian-sc-lic-side-actions">
              {dial ? (
                <a
                  href={`tel:${dial.digits}`}
                  className="dian-sc-lic-phone dian-sc-lic-phone-tel"
                  aria-label={`拨打电话 ${dial.display}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconPhoneRing />
                </a>
              ) : (
                <button
                  type="button"
                  className="dian-sc-lic-phone"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  aria-label="编辑"
                >
                  <IconPhoneRing />
                </button>
              )}
              <button
                type="button"
                className="dian-sc-lic-share-btn"
                aria-label="分享企业信息"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onShare) onShare()
                  else void shareEnterpriseInfo()
                }}
              >
                <IconShare />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="dian-sc-lic-metrics">
        <span className="dian-sc-lic-metric-link" title="法定代表人">
          {row.legalRep}
        </span>
        <span className="dian-sc-lic-metric-sep" aria-hidden>
          |
        </span>
        <span className="dian-sc-lic-metric-txt dian-sc-lic-metric-mono" title={row.licenseNo}>
          {row.licenseNo}
        </span>
        <span className="dian-sc-lic-metric-sep" aria-hidden>
          |
        </span>
        <span className="dian-sc-lic-metric-txt">发证 {row.issueDate}</span>
        <span className="dian-sc-lic-metric-sep" aria-hidden>
          |
        </span>
        <span className="dian-sc-lic-metric-txt">{foodSeg}</span>
      </div>
      <p className="dian-sc-lic-abbr">
        公司简称：<LicAbbr short={row.companyShort} highlight={searchHighlight} />
      </p>
      <div className="dian-sc-lic-grid">
        <div className="dian-sc-lic-cell dian-sc-lic-cell-hot">
          <span className="dian-sc-lic-cell-badge" aria-hidden>
            许可
          </span>
          <div className="dian-sc-lic-cell-title">
            联系记录{' '}
            <span className="dian-sc-lic-cell-accent">{normalizeContactStatusDisplay(row.contactStatus)}</span>
          </div>
          <div className="dian-sc-lic-cell-sub">{phoneSub}</div>
        </div>
        <div className="dian-sc-lic-cell">
          <div className="dian-sc-lic-cell-title">许可信息</div>
          <div className="dian-sc-lic-cell-sub">有效期 {row.validPeriod}</div>
        </div>
        <div className="dian-sc-lic-cell">
          <div className="dian-sc-lic-cell-title">主要信息</div>
          <div className="dian-sc-lic-cell-sub">
            {row.legalRep}、{row.authority}
          </div>
        </div>
      </div>
    </article>
  )
}

function EmptyIllus() {
  return (
    <div className="dian-sc-empty-illus" aria-hidden>
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
        <rect x="12" y="10" width="40" height="44" rx="6" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
        <path d="M20 22h24M20 30h18M20 38h22" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function rowMatchesQuery(row: LicenseRow, q: string): boolean {
  if (!q) return true
  const hay = [
    row.contactStatus,
    row.companyName,
    row.companyShort,
    row.brandAccent,
    row.bizTag,
    row.licenseNo,
    row.issueDate,
    row.validPeriod,
    row.authority,
    row.phone,
    row.remark,
    row.creditCode,
    row.legalRep,
    row.productionAddress,
    row.residence,
    row.foodCategory,
    row.validPeriodRaw,
    row.issueTime,
    row.publicPhone,
  ]
    .join(' ')
    .toLowerCase()
  const ql = q.toLowerCase()
  if (hay.includes(ql)) return true
  if (detailHaystack(row.db).toLowerCase().includes(ql)) return true
  const vh = (row.varietyRows ?? [])
    .map((v) => [v.foodCategory, v.categoryCode, v.categoryName, v.varietyDetail, v.remark].join(' '))
    .join(' ')
    .toLowerCase()
  return vh.includes(ql)
}

function rowMatchesScFilters(
  row: LicenseRow,
  f: {
    foodKey: string
    authority: string
    phone: ScPhoneFilter
    contact: ScContactFilter
    remark: ScRemarkFilter
  },
): boolean {
  if (f.foodKey && foodCategoryFirst(row.foodCategory) !== f.foodKey) return false
  if (f.authority && row.authority !== f.authority) return false
  const hasTel = rowHasDialablePhone(row)
  if (f.phone === 'has' && !hasTel) return false
  if (f.phone === 'none' && hasTel) return false
  if (f.contact !== 'all') {
    const n = normalizeContactStatusDisplay(row.contactStatus)
    if (f.contact === '已联系' && n !== '已联系') return false
    if (f.contact === '未联系' && n !== '未联系') return false
  }
  const hasRemark = Boolean(row.remark.trim())
  if (f.remark === 'has' && !hasRemark) return false
  if (f.remark === 'none' && hasRemark) return false
  return true
}

export default function ScQueryScreen() {
  const apiBaseUrl = getScQueryApiBaseUrl()
  const initialSnapshotRef = useRef<ScQueryViewSnapshot | null>(readScQueryViewSnapshot())
  const initialSnapshot = initialSnapshotRef.current

  const [query, setQuery] = useState(() => initialSnapshot?.query ?? '')
  const [debouncedQuery, setDebouncedQuery] = useState(
    () => initialSnapshot?.debouncedQuery ?? initialSnapshot?.query ?? '',
  )
  const searchInputRef = useRef<HTMLInputElement>(null)
  const inlineTypingFloatingRef = useRef(false)
  const [rows, setRows] = useState<LicenseRow[]>(() => {
    if (initialSnapshot) return initialSnapshot.rows.map((r) => ({ ...r }))
    return apiBaseUrl ? [] : MOCK_LICENSE_ROWS.map((r) => ({ ...r }))
  })
  const [listLoading, setListLoading] = useState(() => Boolean(apiBaseUrl && !initialSnapshot))
  const [listError, setListError] = useState<string | null>(null)
  const [filterFood, setFilterFood] = useState(() => initialSnapshot?.filterFood ?? '')
  const [filterAuthority, setFilterAuthority] = useState(() => initialSnapshot?.filterAuthority ?? '')
  const [filterPhone, setFilterPhone] = useState<ScPhoneFilter>(() => initialSnapshot?.filterPhone ?? 'all')
  const [filterContact, setFilterContact] = useState<ScContactFilter>(
    () => initialSnapshot?.filterContact ?? 'all',
  )
  const [filterRemark, setFilterRemark] = useState<ScRemarkFilter>(() => initialSnapshot?.filterRemark ?? 'all')
  const [filterFavorite, setFilterFavorite] = useState<ScFavoriteFilter>(
    () => initialSnapshot?.filterFavorite ?? 'all',
  )
  const [inlineTypingFloating, setInlineTypingFloating] = useState(false)
  inlineTypingFloatingRef.current = inlineTypingFloating
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [floatPanelOpen, setFloatPanelOpen] = useState(false)
  const [batchSelectMode, setBatchSelectMode] = useState(false)
  const [batchSelectedLicenseNos, setBatchSelectedLicenseNos] = useState<Set<string>>(() => new Set())
  const [ballPos, setBallPos] = useState(() =>
    typeof window !== 'undefined'
      ? clampBallPos({ left: window.innerWidth - SC_FLOAT_BALL_SIZE - 16, bottom: 88 })
      : { left: 280, bottom: 88 },
  )
  const [sheetPos, setSheetPos] = useState<{ left: number; bottom: number } | null>(null)
  const [floatSheetSizeIdx, setFloatSheetSizeIdx] = useState(0)
  /** 拖边调节后的宽高；为 null 时使用档位 preset */
  const [floatSheetCustomDim, setFloatSheetCustomDim] = useState<{
    w: number
    h: number
  } | null>(null)
  const [winSize, setWinSize] = useState(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 360, h: 640 },
  )
  const sheetHandleLastTapRef = useRef(0)
  const sheetDragRef = useRef<{
    pointerId: number
    startLeft: number
    startBottom: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const sheetResizeRef = useRef<{
    pointerId: number
    kind: 'n' | 'e'
    startW: number
    startH: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const navigate = useNavigate()
  const [enteringLicenseDetail, setEnteringLicenseDetail] = useState(false)
  const licenseDetailNavLockRef = useRef(false)
  const [editLicenseNo, setEditLicenseNo] = useState<string | null>(null)
  const [draftNoteText, setDraftNoteText] = useState('')
  const [draftImages, setDraftImages] = useState<string[]>([])
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteHistoryMap, setNoteHistoryMap] = useState<Record<string, EnterpriseNoteEntry[]>>({})
  const [page, setPage] = useState(() => initialSnapshot?.page ?? 1)
  const [listTotal, setListTotal] = useState(() => initialSnapshot?.listTotal ?? 0)
  const [listDataSource, setListDataSource] = useState<string | null>(
    () => initialSnapshot?.listDataSource ?? null,
  )
  const [rowsFromApi, setRowsFromApi] = useState(() => initialSnapshot?.rowsFromApi ?? false)
  const [listLoadingMore, setListLoadingMore] = useState(false)
  const [apiCategories, setApiCategories] = useState<string[] | null>(null)
  const [apiAuthorities, setApiAuthorities] = useState<string[] | null>(null)
  const favoriteSet = useScFavoriteSet()
  const skipInitialApiFetchRef = useRef(Boolean(apiBaseUrl && initialSnapshot?.usedApi))
  const prevQueryRef = useRef(query)
  const pendingTopLicenseNoRef = useRef<string | null>(initialSnapshot?.topLicenseNo ?? null)
  const pendingTopOffsetWithinHostRef = useRef<number | null>(initialSnapshot?.topOffsetWithinHost ?? null)
  const pageRootRef = useRef<HTMLDivElement | null>(null)
  const stickyHeadRef = useRef<HTMLDivElement | null>(null)
  /** 向上滑（scrollTop 增大）时逐步收起吸顶区；向下滑（scrollTop 减小）立即展开（与 lastKnownScrollY 分离，避免与程序化滚屏互相干扰） */
  const scrollPrevForPeekRef = useRef(0)
  const peekHeadHidePxRef = useRef(0)
  const [peekHeadHidePx, setPeekHeadHidePx] = useState(0)
  const [peekHeadMaxPx, setPeekHeadMaxPx] = useState(220)
  /** 已从 session 处理「详情返回滚到卡片」时，勿再按 scrollY 覆盖（Strict 二次 layout 时 peek 仍可读到未删的 key） */
  const skipStoredScrollAfterReturnRef = useRef(false)

  useEffect(() => {
    const title = '滇同学·SC查询'
    const applyTitle = () => {
      document.title = title
      const appMeta = document.querySelector('meta[name="application-name"]')
      appMeta?.setAttribute('content', title)
      const appleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      appleMeta?.setAttribute('content', title)
    }
    applyTitle()
    const retryId = window.setTimeout(() => {
      applyTitle()
    }, 80)
    return () => window.clearTimeout(retryId)
  }, [])

  const scrollRestoreYRef = useRef<number | null>(null)
  const deferredScrollRestoreDoneRef = useRef(false)
  const lastKnownScrollYRef = useRef(0)

  /** 首帧：若即将按证号滚到列表项，先恢复已保存的 scrollTop（深分页时 DOM 可能尚未出现），再交给后续 effect 精确对齐证号 */
  useLayoutEffect(() => {
    const returnFocusMeta = peekReturnFocusMeta()
    const returnFocus = returnFocusMeta?.licenseNo ?? null
    if (returnFocus) {
      pendingTopLicenseNoRef.current = returnFocus
      pendingTopOffsetWithinHostRef.current = returnFocusMeta?.offsetWithinHost ?? null
      const y = readStoredScrollY()
      if (y != null) {
        const host = resolveScScrollHost(pageRootRef.current)
        if (host) host.scrollTop = y
        else window.scrollTo(0, y)
        lastKnownScrollYRef.current = y
      }
      scrollRestoreYRef.current = null
      deferredScrollRestoreDoneRef.current = true
      skipStoredScrollAfterReturnRef.current = true
      return
    }
    if (skipStoredScrollAfterReturnRef.current) return
    const y = readStoredScrollY()
    if (y == null) return
    scrollRestoreYRef.current = y
    lastKnownScrollYRef.current = y
    const host = resolveScScrollHost(pageRootRef.current)
    if (host) host.scrollTop = y
    else window.scrollTo(0, y)
  }, [])

  useLayoutEffect(() => {
    const el = stickyHeadRef.current
    if (!el) return undefined
    const measure = () => {
      const h = el.offsetHeight
      if (h > 0) setPeekHeadMaxPx(Math.max(96, Math.min(420, h)))
    }
    measure()
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [filterPanelOpen, batchSelectMode, listLoading, rows.length])

  useEffect(() => {
    setPeekHeadHidePx((p) => Math.min(p, peekHeadMaxPx))
    peekHeadHidePxRef.current = Math.min(peekHeadHidePxRef.current, peekHeadMaxPx)
  }, [peekHeadMaxPx])

  useEffect(() => {
    if (inlineTypingFloating) {
      peekHeadHidePxRef.current = 0
      setPeekHeadHidePx(0)
      const host = resolveScScrollHost(pageRootRef.current)
      scrollPrevForPeekRef.current = host != null ? host.scrollTop : window.scrollY
    }
  }, [inlineTypingFloating])

  useEffect(() => {
    const host = resolveScScrollHost(pageRootRef.current)
    const getY = () => (host != null ? host.scrollTop : window.scrollY)
    const sync = () => {
      const y = getY()
      lastKnownScrollYRef.current = y

      if (inlineTypingFloatingRef.current) {
        scrollPrevForPeekRef.current = y
        return
      }

      const prevPeekY = scrollPrevForPeekRef.current
      const dy = y - prevPeekY
      scrollPrevForPeekRef.current = y

      const maxP = peekHeadMaxPx
      if (y <= 8) {
        if (peekHeadHidePxRef.current !== 0) {
          peekHeadHidePxRef.current = 0
          setPeekHeadHidePx(0)
        }
        return
      }
      // 向上滑：dy>0，逐步隐藏；向下滑：dy<0，立即显示
      if (dy > 2) {
        const next = Math.min(maxP, peekHeadHidePxRef.current + dy * 0.92)
        if (Math.abs(next - peekHeadHidePxRef.current) > 0.35) {
          peekHeadHidePxRef.current = next
          setPeekHeadHidePx(next)
        }
      } else if (dy < -2) {
        if (peekHeadHidePxRef.current !== 0) {
          peekHeadHidePxRef.current = 0
          setPeekHeadHidePx(0)
        }
      }
    }
    scrollPrevForPeekRef.current = getY()
    sync()
    const target: HTMLElement | Window = host ?? window
    target.addEventListener('scroll', sync, { passive: true } as AddEventListenerOptions)
    return () => target.removeEventListener('scroll', sync as EventListener)
  }, [rows.length, listLoading, peekHeadMaxPx])

  useEffect(() => {
    const y = scrollRestoreYRef.current
    if (y == null || deferredScrollRestoreDoneRef.current) return
    if (listLoading) return
    deferredScrollRestoreDoneRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const host = resolveScScrollHost(pageRootRef.current)
        if (host) host.scrollTop = y
        else window.scrollTo(0, y)
      })
    })
  }, [listLoading])

  useEffect(() => {
    const persistScroll = () => {
      try {
        const host = resolveScScrollHost(pageRootRef.current)
        const y = host ? host.scrollTop : lastKnownScrollYRef.current
        const payload = JSON.stringify({ y })
        sessionStorage.setItem(SC_QUERY_SCROLL_STORAGE_KEY, payload)
        localStorage.setItem(SC_QUERY_SCROLL_STORAGE_KEY_LOCAL, payload)
      } catch {
        /* ignore */
      }
    }
    const onPageHide = () => persistScroll()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      persistScroll()
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  useEffect(() => {
    try {
      const snapshot: ScQueryViewSnapshot = {
        query,
        debouncedQuery,
        rows,
        filterFood,
        filterAuthority,
        filterPhone,
        filterContact,
        filterRemark,
        filterFavorite,
        page,
        listTotal,
        listDataSource,
        rowsFromApi,
        usedApi: Boolean(apiBaseUrl),
        topLicenseNo: (() => {
          const host = resolveScScrollHost(pageRootRef.current)
          return readTopVisibleAnchor(host)?.licenseNo ?? readTopVisibleLicenseNo() ?? undefined
        })(),
        topOffsetWithinHost: (() => {
          const host = resolveScScrollHost(pageRootRef.current)
          return readTopVisibleAnchor(host)?.offsetWithinHost ?? undefined
        })(),
      }
      const payload = JSON.stringify(snapshot)
      sessionStorage.setItem(SC_QUERY_VIEW_STORAGE_KEY, payload)
      localStorage.setItem(SC_QUERY_VIEW_STORAGE_KEY_LOCAL, payload)
    } catch {
      /* ignore */
    }
  }, [
    apiBaseUrl,
    query,
    debouncedQuery,
    rows,
    filterFood,
    filterAuthority,
    filterPhone,
    filterContact,
    filterRemark,
    filterFavorite,
    page,
    listTotal,
    listDataSource,
    rowsFromApi,
  ])

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      const y = scrollRestoreYRef.current
      if (y == null) return
      const host = resolveScScrollHost(pageRootRef.current)
      if (host) host.scrollTop = y
      else window.scrollTo(0, y)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const editingRow = editLicenseNo ? rows.find((r) => r.licenseNo === editLicenseNo) : undefined

  const setRowContactStatus = useCallback(async (row: LicenseRow, next: '已联系' | '未联系') => {
    const code: 0 | 1 = next === '已联系' ? 1 : 0
    if (hasEnterpriseId(row.enterpriseId)) {
      await saveEnterpriseContactStatusRemote(row.enterpriseId.trim(), code)
    }
    setRows((prev) => prev.map((r) => (r.licenseNo === row.licenseNo ? { ...r, contactStatus: next } : r)))
  }, [])

  const openView = useCallback(
    (licenseNo: string) => {
      const r = rows.find((x) => x.licenseNo === licenseNo)
      if (!r) return
      if (licenseDetailNavLockRef.current) return
      licenseDetailNavLockRef.current = true
      try {
        const host = resolveScScrollHost(pageRootRef.current)
        const offsetWithinHost = readCardOffsetWithinHost(host, licenseNo)
        sessionStorage.setItem(
          SC_QUERY_RETURN_FOCUS_LICENSE_KEY,
          JSON.stringify(
            offsetWithinHost == null ? { licenseNo } : { licenseNo, offsetWithinHost },
          ),
        )
      } catch {
        /* ignore */
      }
      try {
        const host = resolveScScrollHost(pageRootRef.current)
        const y = host ? host.scrollTop : window.scrollY
        const payload = JSON.stringify({ y })
        sessionStorage.setItem(SC_QUERY_SCROLL_STORAGE_KEY, payload)
        localStorage.setItem(SC_QUERY_SCROLL_STORAGE_KEY_LOCAL, payload)
      } catch {
        /* ignore */
      }
      persistScDetailRowSession(licenseNo, r)
      setEnteringLicenseDetail(true)
      const t0 = performance.now()
      const doNav = () => {
        void navigate(`/sc-query/detail/${encodeURIComponent(licenseNo)}`, { state: { row: r } })
      }
      const go = () => {
        const wait = Math.max(0, SC_ROUTE_ENTRY_MIN_MS - (performance.now() - t0))
        window.setTimeout(doNav, wait)
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(go)
      })
    },
    [rows, navigate],
  )

  const refreshNoteHistory = useCallback(async (row: LicenseRow) => {
    const list = await fetchEnterpriseNoteHistory(row.enterpriseId, row.licenseNo)
    const key = noteStorageKey(row)
    setNoteHistoryMap((m) => ({ ...m, [key]: list }))
  }, [])

  const openEdit = useCallback((licenseNo: string) => {
    const r = rows.find((x) => x.licenseNo === licenseNo)
    if (!r) return
    setEditLicenseNo(licenseNo)
    setDraftNoteText('')
    setDraftImages([])
    void refreshNoteHistory(r)
  }, [rows, refreshNoteHistory])

  const closeEdit = useCallback(() => {
    setEditLicenseNo(null)
  }, [])

  const saveEnterpriseEdit = useCallback(async () => {
    if (!editLicenseNo || !editingRow) return
    const textT = draftNoteText.trim()
    const hasNote = textT.length > 0 || draftImages.length > 0
    if (!hasNote) {
      setEditLicenseNo(null)
      return
    }
    setNoteSaving(true)
    try {
      const newEntry: EnterpriseNoteEntry = {
        id: safeRandomUuid(),
        savedAt: new Date().toISOString(),
        text: textT,
        images: [...draftImages],
      }
      const nk = noteStorageKey(editingRow)
      persistNoteEntryLocal(nk, newEntry)
      if (hasEnterpriseId(editingRow.enterpriseId)) {
        void saveEnterpriseNotesRemote(editingRow.enterpriseId.trim(), {
          notes: newEntry.text,
          images: newEntry.images,
        })
      }
      setNoteHistoryMap((m) => ({
        ...m,
        [nk]: [newEntry, ...(m[nk] ?? [])],
      }))
      setRows((prev) =>
        prev.map((r) =>
          r.licenseNo === editLicenseNo
            ? {
                ...r,
                remark: textT
                  ? textT.slice(0, 120) + (textT.length > 120 ? '…' : '')
                  : draftImages.length
                    ? '［图片跟进］'
                    : r.remark,
              }
            : r,
        ),
      )
      void refreshNoteHistory(editingRow)
      setEditLicenseNo(null)
      setDraftNoteText('')
      setDraftImages([])
    } finally {
      setNoteSaving(false)
    }
  }, [editLicenseNo, editingRow, draftNoteText, draftImages, refreshNoteHistory])

  useEffect(() => {
    const q = query
    const prevQ = prevQueryRef.current
    prevQueryRef.current = q
    if (!q.trim()) {
      setDebouncedQuery((prev) => (prev ? '' : prev))
      // 仅当用户把搜索词从“有值”清空时才重置分页；恢复快照挂载不触发重置
      if (prevQ.trim() !== '') setPage(1)
      return undefined
    }
    const id = window.setTimeout(() => {
      setDebouncedQuery(q)
      setPage(1)
    }, SC_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [query])

  useEffect(() => {
    if (!apiBaseUrl) return undefined
    let cancelled = false
    fetchScQueryCategories()
      .then((list) => {
        if (!cancelled && list.length > 0) setApiCategories(list)
      })
      .catch(() => {
        if (!cancelled) setApiCategories(null)
      })
    fetchScQueryAuthorities()
      .then((list) => {
        if (!cancelled && list.length > 0) setApiAuthorities(list)
      })
      .catch(() => {
        if (!cancelled) setApiAuthorities(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!apiBaseUrl) return undefined
    if (skipInitialApiFetchRef.current) {
      skipInitialApiFetchRef.current = false
      return undefined
    }
    let cancelled = false
    const isFirstPage = page === 1
    if (isFirstPage) {
      setListLoading(true)
      // 新一轮检索时先清空旧列表，避免输入中看到上一批结果闪现
      setRows([])
    } else {
      setListLoadingMore(true)
    }
    setListError(null)
    const q = buildEnterpriseQueryFromUi({
      searchText: debouncedQuery,
      filterFood,
      filterAuthority,
      filterPhone,
      filterContact,
      filterRemark,
      page,
      pageSize: SC_LIST_PAGE_SIZE,
    })
    fetchScEnterpriseList(q)
      .then(({ rows: next, total, dataSource }) => {
        if (cancelled) return
        setListTotal(total)
        setListDataSource(dataSource ?? null)
        setRows((prev) => {
          if (page === 1) return next
          const seen = new Set(prev.map((r) => r.licenseNo))
          const merged = [...prev]
          for (const r of next) {
            if (!seen.has(r.licenseNo)) {
              seen.add(r.licenseNo)
              merged.push(r)
            }
          }
          return merged
        })
        setRowsFromApi(true)
        setListError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          if (page === 1) {
            setRows([])
            setListTotal(0)
            setListDataSource(null)
          }
          setListError(e instanceof Error ? e.message : '加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) {
          if (isFirstPage) setListLoading(false)
          else setListLoadingMore(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    apiBaseUrl,
    debouncedQuery,
    filterFood,
    filterAuthority,
    filterPhone,
    filterContact,
    filterRemark,
    page,
  ])

  const loadDemoRows = useCallback(() => {
    setRows(MOCK_LICENSE_ROWS.map((r) => ({ ...r })))
    setListError(null)
    setRowsFromApi(false)
    setPage(1)
    setListTotal(MOCK_LICENSE_ROWS.length)
    setListDataSource(null)
  }, [])

  const foodOptions = useMemo(() => {
    if (apiCategories && apiCategories.length > 0) {
      return [...apiCategories].sort((a, b) => a.localeCompare(b, 'zh-CN'))
    }
    const set = new Set(rows.map((r) => foodCategoryFirst(r.foodCategory)).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [apiCategories, rows])

  const authorityOptions = useMemo(() => {
    if (apiAuthorities && apiAuthorities.length > 0) {
      return [...apiAuthorities].sort((a, b) => a.localeCompare(b, 'zh-CN'))
    }
    const set = new Set(rows.map((r) => r.authority).filter(Boolean))
    return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [apiAuthorities, rows])

  const hasMore = rowsFromApi && listTotal > rows.length

  const scFilter = useMemo(
    () => ({
      foodKey: filterFood,
      authority: filterAuthority,
      phone: filterPhone,
      contact: filterContact,
      remark: filterRemark,
    }),
    [filterFood, filterAuthority, filterPhone, filterContact, filterRemark],
  )

  const filtered = useMemo(() => {
    const bySearch = rowsFromApi
      ? rows
      : rows.filter((row) => rowMatchesQuery(row, debouncedQuery.trim()))
    const bySc = bySearch.filter((row) => rowMatchesScFilters(row, scFilter))
    if (filterFavorite === 'only') {
      return bySc.filter((row) => isLicenseInFavorites(favoriteSet, row.licenseNo))
    }
    if (filterFavorite === 'none') {
      return bySc.filter((row) => !isLicenseInFavorites(favoriteSet, row.licenseNo))
    }
    return bySc
  }, [rows, rowsFromApi, debouncedQuery, scFilter, filterFavorite, favoriteSet])

  useEffect(() => {
    if (!batchSelectMode) return
    const visible = new Set(filtered.map((row) => row.licenseNo))
    setBatchSelectedLicenseNos((prev) => {
      let changed = false
      const next = new Set<string>()
      for (const no of prev) {
        if (visible.has(no)) next.add(no)
        else changed = true
      }
      return changed ? next : prev
    })
  }, [batchSelectMode, filtered])

  const buildBatchShareBody = useCallback((rowsToShare: LicenseRow[], title: string) => {
    const list = rowsToShare.slice(0, 30)
    if (list.length === 0) return ''
    const lines = list.map((row, idx) => {
      const dial = resolveScCardDial(row)
      const phone = dial ? dial.display : '暂无联系电话'
      return [
        `${idx + 1}. 公司名称：${row.companyName}`,
        `电话：${phone}`,
        `法人：${row.legalRep || '-'}`,
        `地址：${row.productionAddress || '-'}`,
        `食品类别：${row.foodCategory || '-'}`,
      ].join('\n')
    })
    return `${title}\n${lines.join('\n')}${rowsToShare.length > list.length ? `\n…其余${rowsToShare.length - list.length}条未展开` : ''}`
  }, [])

  /** 复制分享文案到剪贴板，并退出批量选择模式 */
  const copyBatchShareTextAndClose = useCallback(
    async (rowsToShare: LicenseRow[]) => {
      if (rowsToShare.length === 0) {
        window.alert('请先勾选要分享的企业。')
        return
      }
      const title = `SC查询已选企业分享（共${rowsToShare.length}条）`
      const body = buildBatchShareBody(rowsToShare, title)
      if (!body) {
        window.alert('当前没有可分享的企业记录。')
        return
      }
      let copied = false
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(body)
          copied = true
        }
      } catch {
        copied = false
      }
      if (!copied) {
        window.prompt('无法自动复制，请手动全选复制：', body)
      } else {
        window.alert('已复制到剪贴板，可粘贴到微信等应用发送。')
      }
      setBatchSelectMode(false)
      setBatchSelectedLicenseNos(new Set())
    },
    [buildBatchShareBody],
  )

  const onBatchShareTap = useCallback(() => {
    if (!batchSelectMode) {
      setBatchSelectMode(true)
      setBatchSelectedLicenseNos(new Set())
      return
    }
    const selectedRows = filtered.filter((row) => batchSelectedLicenseNos.has(row.licenseNo))
    void copyBatchShareTextAndClose(selectedRows)
  }, [batchSelectMode, filtered, batchSelectedLicenseNos, copyBatchShareTextAndClose])

  const shareFromCard = useCallback(() => {
    const selectedRows = filtered.filter((x) => batchSelectedLicenseNos.has(x.licenseNo))
    if (selectedRows.length > 0) {
      void copyBatchShareTextAndClose(selectedRows)
    }
  }, [batchSelectedLicenseNos, filtered, copyBatchShareTextAndClose])

  const toggleBatchRow = useCallback((licenseNo: string) => {
    setBatchSelectedLicenseNos((prev) => {
      const next = new Set(prev)
      if (next.has(licenseNo)) next.delete(licenseNo)
      else next.add(licenseNo)
      return next
    })
  }, [])

  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null)
  const loadMoreLockRef = useRef(false)

  const tryLoadMore = useCallback(() => {
    if (!rowsFromApi || listLoading || listLoadingMore || !hasMore) return
    if (loadMoreLockRef.current) return
    loadMoreLockRef.current = true
    setPage((p) => p + 1)
  }, [rowsFromApi, listLoading, listLoadingMore, hasMore])

  useEffect(() => {
    if (!listLoading && !listLoadingMore) loadMoreLockRef.current = false
  }, [listLoading, listLoadingMore])

  /** 从详情返回：证号所在卡片若尚未分页进内存，则先恢复 scrollTop 并持续加载更多，避免深位置（如 140+ 条后）误判失败回到顶部 */
  useEffect(() => {
    const licNo = pendingTopLicenseNoRef.current
    if (!licNo) return
    if (listLoading) return

    const host = resolveScScrollHost(pageRootRef.current)
    const applyStoredScrollY = () => {
      const y = readStoredScrollY()
      if (y == null || !host) return
      host.scrollTop = y
      lastKnownScrollYRef.current = y
    }

    const target =
      host?.querySelector<HTMLElement>(`.dian-sc-license-card[data-license-no="${CSS.escape(licNo)}"]`) ??
      document.querySelector<HTMLElement>(`.dian-sc-license-card[data-license-no="${CSS.escape(licNo)}"]`)

    if (target) {
      const savedOffset = pendingTopOffsetWithinHostRef.current
      pendingTopOffsetWithinHostRef.current = null
      pendingTopLicenseNoRef.current = null
      clearReturnFocusLicenseNo()
      requestAnimationFrame(() => {
        const h = resolveScScrollHost(pageRootRef.current)
        const el =
          h?.querySelector<HTMLElement>(`.dian-sc-license-card[data-license-no="${CSS.escape(licNo)}"]`) ??
          document.querySelector<HTMLElement>(`.dian-sc-license-card[data-license-no="${CSS.escape(licNo)}"]`)
        if (!el) return
        if (h && savedOffset != null) {
          const hostRect = h.getBoundingClientRect()
          const targetRect = el.getBoundingClientRect()
          const delta = targetRect.top - hostRect.top - savedOffset
          h.scrollTop = Math.max(0, h.scrollTop + delta)
        } else {
          el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        }
      })
      return
    }

    const inRows = rows.some((r) => r.licenseNo === licNo)
    const inFiltered = filtered.some((r) => r.licenseNo === licNo)

    if (!inRows && rowsFromApi && hasMore) {
      applyStoredScrollY()
      tryLoadMore()
      return
    }

    if (inRows && !inFiltered) {
      applyStoredScrollY()
      clearReturnFocusLicenseNo()
      pendingTopLicenseNoRef.current = null
      pendingTopOffsetWithinHostRef.current = null
      return
    }

    if (inFiltered) {
      applyStoredScrollY()
      return
    }

    applyStoredScrollY()
    clearReturnFocusLicenseNo()
    pendingTopLicenseNoRef.current = null
    pendingTopOffsetWithinHostRef.current = null
  }, [
    listLoading,
    listLoadingMore,
    rows,
    filtered,
    rowsFromApi,
    hasMore,
    tryLoadMore,
    query,
    filterFood,
    filterAuthority,
    filterPhone,
    filterContact,
    filterRemark,
    filterFavorite,
  ])

  useEffect(() => {
    if (!rowsFromApi || !hasMore) return
    const el = loadMoreSentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        tryLoadMore()
      },
      { root: null, rootMargin: '120px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [rowsFromApi, hasMore, tryLoadMore, rows.length, listTotal])

  const filterActiveCount = useMemo(() => {
    let n = 0
    if (filterFood) n++
    if (filterAuthority) n++
    if (filterPhone !== 'all') n++
    if (filterContact !== 'all') n++
    if (filterRemark !== 'all') n++
    if (filterFavorite === 'only' || filterFavorite === 'none') n++
    return n
  }, [filterFood, filterAuthority, filterPhone, filterContact, filterRemark, filterFavorite])

  const resetFiltersToDefault = useCallback(() => {
    setQuery('')
    setDebouncedQuery('')
    setFilterFood('')
    setFilterAuthority('')
    setFilterPhone('all')
    setFilterContact('all')
    setFilterRemark('all')
    setFilterFavorite('all')
    setPage(1)
  }, [])

  const searchPending = query.trim() !== '' && query.trim() !== debouncedQuery.trim()

  const clearSearchOnDoubleClick = useCallback(() => {
    setQuery('')
    searchInputRef.current?.focus()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SC_FLOAT_BALL_STORAGE_KEY)
      if (!raw) return
      const o = JSON.parse(raw) as { left?: number; bottom?: number }
      if (typeof o.left === 'number' && typeof o.bottom === 'number') {
        setBallPos(clampBallPos({ left: o.left, bottom: o.bottom }))
      }
    } catch {
      /* ignore */
    }
  }, [])

  const sheetLayoutRef = useRef({
    idx: 0,
    custom: null as { w: number; h: number } | null,
  })

  useEffect(() => {
    let loadedSize = 0
    try {
      const rawS = localStorage.getItem(SC_FLOAT_SHEET_SIZE_KEY)
      if (rawS != null) {
        const n = Number(JSON.parse(rawS) as unknown)
        if (n === 0 || n === 1 || n === 2) loadedSize = n
      }
    } catch {
      /* ignore */
    }
    setFloatSheetSizeIdx(loadedSize)

    let loadedWh: { w: number; h: number } | null = null
    try {
      const rawWh = localStorage.getItem(SC_FLOAT_SHEET_WH_KEY)
      if (rawWh) {
        const o = JSON.parse(rawWh) as { w?: unknown; h?: unknown }
        if (typeof o.w === 'number' && typeof o.h === 'number') {
          loadedWh = clampSheetDim({ w: o.w, h: o.h })
        }
      }
    } catch {
      /* ignore */
    }
    setFloatSheetCustomDim(loadedWh)

    const dim = loadedWh ?? sheetDimensions(loadedSize)

    try {
      const raw = localStorage.getItem(SC_FLOAT_SHEET_STORAGE_KEY)
      if (!raw) return
      const o = JSON.parse(raw) as { left?: number; bottom?: number }
      if (typeof o.left === 'number' && typeof o.bottom === 'number') {
        setSheetPos(clampSheetPos({ left: o.left, bottom: o.bottom }, dim))
      }
    } catch {
      /* ignore */
    }
  }, [])

  sheetLayoutRef.current = { idx: floatSheetSizeIdx, custom: floatSheetCustomDim }

  useEffect(() => {
    const onResize = () => {
      setWinSize({ w: window.innerWidth, h: window.innerHeight })
      setBallPos((p) => clampBallPos(p))
      const { idx, custom } = sheetLayoutRef.current
      const nextCustom = custom ? clampSheetDim(custom) : null
      if (
        nextCustom &&
        custom &&
        (nextCustom.w !== custom.w || nextCustom.h !== custom.h)
      ) {
        setFloatSheetCustomDim(nextCustom)
      }
      const dim = nextCustom ?? sheetDimensions(idx)
      setSheetPos((p) => (p ? clampSheetPos(p, dim) : p))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const persistSheetPos = useCallback((p: { left: number; bottom: number }) => {
    try {
      localStorage.setItem(SC_FLOAT_SHEET_STORAGE_KEY, JSON.stringify(p))
    } catch {
      /* ignore */
    }
  }, [])

  const persistSheetWh = useCallback((dim: { w: number; h: number }) => {
    try {
      localStorage.setItem(SC_FLOAT_SHEET_WH_KEY, JSON.stringify(clampSheetDim(dim)))
    } catch {
      /* ignore */
    }
  }, [])

  const floatSheetPanelDim = useMemo(() => {
    return floatSheetCustomDim
      ? clampSheetDim(floatSheetCustomDim)
      : sheetDimensions(floatSheetSizeIdx)
  }, [floatSheetCustomDim, floatSheetSizeIdx, winSize.w, winSize.h])

  useLayoutEffect(() => {
    if (!floatPanelOpen || sheetPos != null) return
    setSheetPos(
      clampSheetPos(defaultSheetPosForBall(ballPos, floatSheetPanelDim), floatSheetPanelDim),
    )
  }, [floatPanelOpen, sheetPos, ballPos, floatSheetPanelDim])

  useEffect(() => {
    setSheetPos((p) => (p ? clampSheetPos(p, floatSheetPanelDim) : p))
  }, [floatSheetPanelDim.w, floatSheetPanelDim.h])

  useEffect(() => {
    if (!floatPanelOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFloatPanelOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [floatPanelOpen])

  const onSheetHandlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || sheetPos == null) return
      sheetDragRef.current = {
        pointerId: e.pointerId,
        startLeft: sheetPos.left,
        startBottom: sheetPos.bottom,
        originX: e.clientX,
        originY: e.clientY,
        moved: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [sheetPos],
  )

  const onSheetHandlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const d = sheetDragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      const dx = e.clientX - d.originX
      const dy = d.originY - e.clientY
      if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
      setSheetPos(
        clampSheetPos(
          {
            left: d.startLeft + dx,
            bottom: d.startBottom + dy,
          },
          floatSheetPanelDim,
        ),
      )
    },
    [floatSheetPanelDim],
  )

  const onSheetHandlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const d = sheetDragRef.current
      if (!d || d.pointerId !== e.pointerId) return
      sheetDragRef.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (d.moved) {
        setSheetPos((p) => {
          if (!p) return p
          const c = clampSheetPos(p, floatSheetPanelDim)
          persistSheetPos(c)
          return c
        })
      } else {
        const now = Date.now()
        if (now - sheetHandleLastTapRef.current < SC_FLOAT_BALL_DOUBLE_TAP_MS) {
          sheetHandleLastTapRef.current = 0
          setFloatSheetCustomDim(null)
          try {
            localStorage.removeItem(SC_FLOAT_SHEET_WH_KEY)
          } catch {
            /* ignore */
          }
          setFloatSheetSizeIdx((i) => {
            const next = (i + 1) % SC_FLOAT_SHEET_SIZE_COUNT
            try {
              localStorage.setItem(SC_FLOAT_SHEET_SIZE_KEY, JSON.stringify(next))
            } catch {
              /* ignore */
            }
            return next
          })
        } else {
          sheetHandleLastTapRef.current = now
        }
      }
    },
    [floatSheetPanelDim, persistSheetPos],
  )

  const onSheetResizePointerDown = useCallback(
    (kind: 'n' | 'e', e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.stopPropagation()
      const { w, h } = floatSheetPanelDim
      sheetResizeRef.current = {
        pointerId: e.pointerId,
        kind,
        startW: w,
        startH: h,
        originX: e.clientX,
        originY: e.clientY,
        moved: false,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [floatSheetPanelDim],
  )

  const onSheetResizePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const d = sheetResizeRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.originX
    const dy = e.clientY - d.originY
    if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true
    if (d.kind === 'n') {
      setFloatSheetCustomDim(clampSheetDim({ w: d.startW, h: d.startH - dy }))
    } else {
      setFloatSheetCustomDim(clampSheetDim({ w: d.startW + dx, h: d.startH }))
    }
  }, [])

  const onSheetResizePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const d = sheetResizeRef.current
      if (!d || d.pointerId !== e.pointerId) return
      sheetResizeRef.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (d.moved) {
        const dy = e.clientY - d.originY
        const dx = e.clientX - d.originX
        const finalDim =
          d.kind === 'n'
            ? clampSheetDim({ w: d.startW, h: d.startH - dy })
            : clampSheetDim({ w: d.startW + dx, h: d.startH })
        persistSheetWh(finalDim)
        setFloatSheetCustomDim(finalDim)
        setSheetPos((p) => {
          if (!p) return p
          const c = clampSheetPos(p, finalDim)
          persistSheetPos(c)
          return c
        })
      }
    },
    [persistSheetPos, persistSheetWh],
  )

  const dataSourceLine = useMemo(() => {
    const qStable = debouncedQuery.trim()
    const qInput = query.trim()
    const pending = qInput !== '' && qInput !== qStable
    const favHint =
      filterFavorite === 'only' ? (
        <>
          {' '}
          · 仅显示已收藏（本地 {favoriteSet.size} 条许可证号）
        </>
      ) : filterFavorite === 'none' ? (
        <> · 仅显示未收藏</>
      ) : null
    const licenseCompact = qStable.replace(/\s/g, '').trim()
    const showFavLookup = looksLikeScLicenseNoInput(qStable) && !pending
    const licenseFavLookup = showFavLookup ? (
      <span className="dian-sc-filter-fav-lookup">
        {' '}
        · 证号「{licenseCompact}」本地收藏：
        {isLicenseInFavorites(favoriteSet, licenseCompact) ? '已收藏' : '未收藏'}
      </span>
    ) : null
    if (!rowsFromApi) {
      return (
        <p className="dian-sc-filter-datasource" role="status">
          {qStable ? (
            <>
              本地演示 · 关键词「{qStable}」
              {pending ? (
                <span className="dian-sc-filter-datasource-pending"> · 等待输入停顿后匹配</span>
              ) : null}
            </>
          ) : (
            <>本地演示数据</>
          )}
          {favHint}
          {licenseFavLookup}
        </p>
      )
    }
    return (
      <p className="dian-sc-filter-datasource" role="status">
        {listDataSource ? <>数据源：{listDataSource}</> : <>接口列表</>}
        {qStable ? (
          <> · 列表按关键词「{qStable}」向中台检索</>
        ) : (
          <> · 当前无搜索词（默认分页）</>
        )}
        {pending ? (
          <span className="dian-sc-filter-datasource-pending"> · 输入停顿后提交检索</span>
        ) : null}
        {favHint}
        {licenseFavLookup}
      </p>
    )
  }, [rowsFromApi, listDataSource, debouncedQuery, query, filterFavorite, favoriteSet])

  const searchFiltersShared = useMemo(
    () => ({
      query,
      setQuery,
      searchInputRef,
      clearSearchOnDoubleClick,
      SearchIcon,
      dataSourceLine,
      filterPanelOpen,
      setFilterPanelOpen,
      filterFood,
      setFilterFood,
      filterAuthority,
      setFilterAuthority,
      filterPhone,
      setFilterPhone,
      filterContact,
      setFilterContact,
      filterRemark,
      setFilterRemark,
      filterFavorite,
      setFilterFavorite,
      filterActiveCount,
      foodOptions,
      authorityOptions,
      setPage,
      onResetDefaults: resetFiltersToDefault,
      onBatchShare: onBatchShareTap,
      onSearchFocus: () => setInlineTypingFloating(true),
      onSearchBlur: () => setInlineTypingFloating(false),
    }),
    [
      query,
      clearSearchOnDoubleClick,
      dataSourceLine,
      filterPanelOpen,
      filterFood,
      filterAuthority,
      filterPhone,
      filterContact,
      filterRemark,
      filterFavorite,
      filterActiveCount,
      foodOptions,
      authorityOptions,
      resetFiltersToDefault,
      onBatchShareTap,
    ],
  )

  const queryResultSummary = useMemo(() => {
    if (listLoading && rows.length === 0) {
      return <>正在加载列表…</>
    }
    if (listError && rows.length === 0) {
      return <>暂无列表数据，请检查接口或使用演示数据</>
    }
    const nRows = rows.length
    const nShow = filtered.length
    const parts: ReactNode[] = []
    parts.push(
      <span key="main">
        当前 <span className="dian-sc-query-result-num">{nShow}</span> 条
      </span>,
    )
    if (rowsFromApi && listTotal > 0 && (listTotal !== nShow || nRows < listTotal)) {
      parts.push(
        <span key="total">
          {' '}
          <span className="dian-sc-query-result-meta-secondary">
            （全库 <span className="dian-sc-query-result-num">{listTotal}</span> 条
            {nRows < listTotal ? (
              <>
                · 已加载 <span className="dian-sc-query-result-num">{nRows}</span> 条
              </>
            ) : null}
            ）
          </span>
        </span>,
      )
    }
    if (searchPending) {
      parts.push(<span key="pending"> · 关键词将在输入停顿后生效</span>)
    }
    if (batchSelectMode) {
      parts.push(
        <span key="batch-share">
          {' '}
          · 批量选择中（已选 <span className="dian-sc-query-result-num">{batchSelectedLicenseNos.size}</span> 条）
        </span>,
      )
    }
    if (listLoadingMore) {
      parts.push(<span key="loading-more"> · 正在加载更多…</span>)
    }
    return <>{parts}</>
  }, [
    listLoading,
    listError,
    rows.length,
    filtered.length,
    rowsFromApi,
    listTotal,
    searchPending,
    batchSelectMode,
    batchSelectedLicenseNos.size,
    listLoadingMore,
  ])

  return (
    <div className="dian-subpage" ref={pageRootRef}>
      {enteringLicenseDetail ? (
        <div
          className="dian-nav-route-loading"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="正在打开许可证详情"
        >
          <div className="dian-nav-route-loading-backdrop" aria-hidden />
          <div className="dian-nav-route-loading-card">
            <div className="dian-nav-route-loading-spinner" aria-hidden />
            <p className="dian-nav-route-loading-text">正在打开许可证详情…</p>
          </div>
        </div>
      ) : null}

      <div
        ref={stickyHeadRef}
        className={`dian-sc-query-sticky-head${inlineTypingFloating ? ' dian-sc-query-sticky-head--typing' : ''}${
          peekHeadMaxPx > 48 && peekHeadHidePx > peekHeadMaxPx * 0.88 ? ' dian-sc-query-sticky-head--peek-pass' : ''
        }`}
        style={{
          transform: `translateY(-${peekHeadHidePx}px)`,
          marginBottom: -peekHeadHidePx,
        }}
      >
        <div
          className={`dian-sc-query-inline-filters${inlineTypingFloating ? ' dian-sc-query-inline-filters--typing' : ''}`}
          aria-label="搜索与筛选"
        >
          <ScQuerySearchFilters {...searchFiltersShared} variant="drawer" idSuffix="-inline" hideBack />
        </div>
        <p className="dian-sc-query-result-meta" role="status" aria-live="polite">
          {queryResultSummary}
        </p>
      </div>

      <main className="dian-subpage-body" aria-label="查询">
        {listLoading && rows.length === 0 ? (
          <div className="dian-sc-search-pending dian-sc-search-pending--quiet" aria-hidden />
        ) : listError && rows.length === 0 ? (
          <div className="dian-sc-result-card">
            <EmptyIllus />
            <p className="dian-sc-empty-title">无法拉取列表</p>
            <p className="dian-sc-empty-desc">{listError}</p>
            <p className="dian-sc-empty-desc">
              请检查 VITE_API_BASE_URL（或 VITE_SCQUERY_API_BASE / VITE_SC_API_BASE）是否指向含 /api 的基址，网关路径需与 Express 一致为 /api/scquery/enterprises。
            </p>
            <button type="button" className="dian-sc-api-demo-btn" onClick={loadDemoRows}>
              使用本地演示数据
            </button>
          </div>
        ) : searchPending ? (
          <p className="dian-sc-search-pending" role="status" aria-live="polite">
            输入停顿后将显示匹配结果…
          </p>
        ) : filtered.length === 0 ? (
          <div className="dian-sc-result-card">
            <EmptyIllus />
            <p className="dian-sc-empty-title">暂无匹配记录</p>
            <p className="dian-sc-empty-desc">
              {filterFavorite === 'only'
                ? favoriteSet.size === 0
                  ? '本地尚无收藏。在企业卡片或详情页点击星标即可收藏（数据仅存本机）。'
                  : '当前已加载的列表中没有已收藏企业，可下滑加载更多、放宽筛选或关闭「仅看收藏」。'
                : filterFavorite === 'none'
                  ? '当前已加载的列表中没有符合「未收藏」的企业，或已全部收藏。可放宽筛选或关闭「仅未收藏」。'
                  : '可点击右下角搜索打开筛选；打开后双击顶部栏可切换搜索窗口大小。'}
            </p>
          </div>
        ) : (
          <>
            <div className="dian-sc-list">
              {filtered.map((row, i) => (
                <ScLicenseEnterpriseCard
                  key={`${row.licenseNo}-${i}`}
                  row={row}
                  favorited={isLicenseInFavorites(favoriteSet, row.licenseNo)}
                  searchHighlight={debouncedQuery.trim()}
                  batchSelectMode={batchSelectMode}
                  batchSelected={batchSelectedLicenseNos.has(row.licenseNo)}
                  onToggleBatchSelect={() => toggleBatchRow(row.licenseNo)}
                  onShare={
                    batchSelectMode && batchSelectedLicenseNos.size > 0
                      ? () => shareFromCard()
                      : undefined
                  }
                  onToggleFavorite={() => {
                    toggleLicenseFavorite(row.licenseNo)
                  }}
                  onView={() => openView(row.licenseNo)}
                  onEdit={() => openEdit(row.licenseNo)}
                  onContactStatusChange={setRowContactStatus}
                />
              ))}
            </div>
            {rowsFromApi ? (
              <div className="dian-sc-list-footer">
                <p className="dian-sc-list-meta" role="status">
                  全库 {listTotal} 条 · 已加载 {rows.length} 条
                  {debouncedQuery.trim() ? ` · 检索「${debouncedQuery.trim()}」` : ''}
                  {hasMore && !listLoadingMore ? ' · 下滑加载更多' : null}
                </p>
                {listLoadingMore ? (
                  <p className="dian-sc-list-loading-more" role="status" aria-live="polite">
                    正在加载更多…
                  </p>
                ) : null}
                {listError && rows.length > 0 ? (
                  <p className="dian-sc-list-error" role="alert">
                    {listError}
                  </p>
                ) : null}
                {hasMore ? (
                  <div
                    ref={loadMoreSentinelRef}
                    className="dian-sc-load-sentinel"
                    aria-hidden
                  />
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </main>

      <ScrollToTopFab target="window" />

      {floatPanelOpen && sheetPos ? (
        <div
          className="dian-sc-float-sheet-root"
          role="dialog"
          aria-modal="false"
          aria-label="搜索与筛选：顶部栏可拖动移动，双击切换档位；顶边与右侧可拖动调节窗口大小"
        >
          <div
            className="dian-sc-float-sheet-panel"
            style={{
              left: sheetPos.left,
              bottom: sheetPos.bottom,
              width: floatSheetPanelDim.w,
              height: floatSheetPanelDim.h,
            }}
          >
            <div
              className="dian-sc-float-sheet-resize-n"
              title="拖动调节高度"
              aria-label="拖动上边缘调节窗口高度"
              onPointerDown={(e) => onSheetResizePointerDown('n', e)}
              onPointerMove={onSheetResizePointerMove}
              onPointerUp={onSheetResizePointerUp}
              onPointerCancel={onSheetResizePointerUp}
            />
            <div
              className="dian-sc-float-sheet-chrome"
              title="拖动移动；双击切换档位；顶边与右侧可拖调大小"
              onPointerDown={onSheetHandlePointerDown}
              onPointerMove={onSheetHandlePointerMove}
              onPointerUp={onSheetHandlePointerUp}
              onPointerCancel={onSheetHandlePointerUp}
            >
              <div className="dian-sc-float-sheet-chrome-fill" aria-hidden />
            </div>
            <div className="dian-sc-float-sheet-scroll">
              <ScQuerySearchFilters {...searchFiltersShared} variant="drawer" idSuffix="-fl" hideBack />
            </div>
            <div
              className="dian-sc-float-sheet-resize-e"
              title="拖动调节宽度"
              aria-label="拖动右边缘调节窗口宽度"
              onPointerDown={(e) => onSheetResizePointerDown('e', e)}
              onPointerMove={onSheetResizePointerMove}
              onPointerUp={onSheetResizePointerUp}
              onPointerCancel={onSheetResizePointerUp}
            />
          </div>
        </div>
      ) : null}

      <ScEnterpriseEditSheet
        open={Boolean(editLicenseNo && editingRow)}
        companyName={editingRow?.companyName ?? ''}
        noteText={draftNoteText}
        onNoteTextChange={setDraftNoteText}
        images={draftImages}
        setImages={setDraftImages}
        history={editingRow ? noteHistoryMap[noteStorageKey(editingRow)] ?? [] : []}
        onSave={() => void saveEnterpriseEdit()}
        onCancel={closeEdit}
        saving={noteSaving}
      />
    </div>
  )
}
