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
import { HAODING_DETAIL_DB, HAODING_VARIETY_ROWS } from './haodingMock'
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

/** 每条记录对应一页里的一张企业卡片；接口返回多条则自动多卡 */
const MOCK_LICENSE_ROWS: LicenseRow[] = [
  {
    enterpriseId: '9001',
    contactStatus: '已联系',
    companyName: '昆明永荣茶叶有限公司',
    companyShort: '永荣茶叶',
    brandAccent: '永荣',
    bizTag: '食品生产',
    licenseNo: 'SC11453011201218',
    issueDate: '2026年04月01日',
    validPeriod: '2026年04月01日 至 2031年03月31日',
    authority: '西山区市场监督管理局',
    phone: '13888880001',
    remark: '重点跟进',
    creditCode: '91530112MAK2HW0U0T',
    legalRep: '吴培鑫',
    productionAddress: '云南省昆明市西山区团结街道办事处雨花社区大墨雨村326号附1号',
    residence: '-',
    foodCategory: '茶叶及相关制品',
    validPeriodRaw: '2026-04-01 00:00:00 至 2031-03-31 00:00:00',
    issueTime: '2026-04-01 14:03:03',
    publicPhone: '-',
  },
  {
    enterpriseId: '9002',
    contactStatus: '未联系',
    companyName: '云南滇味食品有限公司',
    companyShort: '滇味食品',
    brandAccent: '滇味',
    bizTag: '小微企业',
    licenseNo: 'SC11553010301456',
    issueDate: '2025年11月15日',
    validPeriod: '2025年11月15日 至 2030年11月14日',
    authority: '盘龙区市场监督管理局',
    phone: '',
    remark: '',
    creditCode: '91530103MA6K3NQX2L',
    legalRep: '李建国',
    productionAddress: '云南省昆明市盘龙区茨坝街道青松路食品工业园B区8号',
    residence: '-',
    foodCategory: '调味品；方便食品',
    validPeriodRaw: '2025-11-15 00:00:00 至 2030-11-14 00:00:00',
    issueTime: '2025-11-15 09:30:00',
    publicPhone: '-',
  },
  {
    enterpriseId: '9003',
    contactStatus: '未联系',
    companyName: '大理苍洱农产品加工有限公司',
    companyShort: '苍洱农产',
    brandAccent: '苍洱',
    bizTag: '农产品加工',
    licenseNo: 'SC12953290102388',
    issueDate: '2026年01月08日',
    validPeriod: '2026年01月08日 至 2031年01月07日',
    authority: '大理市市场监督管理局',
    phone: '',
    remark: '',
    creditCode: '91532901MA6P7C2K9M',
    legalRep: '杨雪梅',
    productionAddress: '云南省大理白族自治州大理市凤仪镇丰乐村农产品加工园3号',
    residence: '-',
    foodCategory: '蔬菜制品；水果制品',
    validPeriodRaw: '2026-01-08 00:00:00 至 2031-01-07 00:00:00',
    issueTime: '2026-01-08 10:15:22',
    publicPhone: '-',
  },
  {
    enterpriseId: '9004',
    contactStatus: '未联系',
    companyName: '云南皓鼎轩茶业有限公司',
    companyShort: '皓鼎轩',
    brandAccent: '皓鼎',
    bizTag: '食品生产',
    licenseNo: 'SC11453310300576',
    issueDate: '2026年03月31日',
    validPeriod: '2026年03月31日 至 2031年03月30日',
    authority: '芒市市场监督管理局',
    phone: '18608821197',
    remark: '',
    creditCode: '91533100MA6K72JU6E',
    legalRep: '杨万祺',
    productionAddress: '云南省德宏傣族景颇族自治州芒市三台山允欠818茶园基地',
    residence: '云南省德宏傣族景颇族自治州芒市斑色路120号',
    foodCategory: '茶叶及相关制品',
    validPeriodRaw: '2026-03-31 00:00:00 至 2031-03-30 00:00:00',
    issueTime: '2026-03-31 14:51:22',
    publicPhone: '-',
    db: { ...HAODING_DETAIL_DB },
    varietyRows: [...HAODING_VARIETY_ROWS],
  },
]

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

function LicTitle({ name, accent }: { name: string; accent: string }) {
  if (!accent || !name.includes(accent)) return <>{name}</>
  const i = name.indexOf(accent)
  return (
    <>
      {name.slice(0, i)}
      <span className="dian-sc-lic-name-accent">{accent}</span>
      {name.slice(i + accent.length)}
    </>
  )
}

function LicAbbr({ short, accent }: { short: string; accent: string }) {
  if (!accent || !short.includes(accent)) return <span className="dian-sc-lic-abbr-val">{short}</span>
  const i = short.indexOf(accent)
  return (
    <span className="dian-sc-lic-abbr-val">
      {short.slice(0, i)}
      <span className="dian-sc-lic-name-accent">{accent}</span>
      {short.slice(i + accent.length)}
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
  onToggleFavorite,
  onView,
  onEdit,
  onContactStatusChange,
}: {
  row: LicenseRow
  favorited: boolean
  onToggleFavorite: () => void
  onView: () => void
  onEdit: () => void
  onContactStatusChange: (row: LicenseRow, next: '已联系' | '未联系') => void
}) {
  const foodSeg = foodCategoryFirst(row.foodCategory)
  const logoCells = foodCategoryLogoCells(row.foodCategory)
  const dial = resolveScCardDial(row)
  const phoneSub = dial ? (row.phone.trim() ? row.phone : dial.display) : '暂无联系电话'

  return (
    <article
      className="dian-sc-license-card dian-sc-lic-card--pressable"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        const el = e.target as HTMLElement
        if (
          el.closest(
            'a.dian-sc-lic-phone-tel, button.dian-sc-lic-phone, button.dian-sc-lic-favorite-btn, .dian-sc-lic-contact-wrap',
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
            <LicTitle name={row.companyName} accent={row.brandAccent} />
          </h3>
          <div className="dian-sc-lic-tags">
            <LicContactStatusPicker row={row} onChange={onContactStatusChange} />
            <span className="dian-sc-lic-tag dian-sc-lic-tag-blue">{row.bizTag}</span>
          </div>
        </div>
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
        公司简称：<LicAbbr short={row.companyShort} accent={row.brandAccent} />
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
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<LicenseRow[]>(() =>
    getScQueryApiBaseUrl() ? [] : MOCK_LICENSE_ROWS.map((r) => ({ ...r })),
  )
  const [listLoading, setListLoading] = useState(() => Boolean(getScQueryApiBaseUrl()))
  const [listError, setListError] = useState<string | null>(null)
  const [filterFood, setFilterFood] = useState('')
  const [filterAuthority, setFilterAuthority] = useState('')
  const [filterPhone, setFilterPhone] = useState<ScPhoneFilter>('all')
  const [filterContact, setFilterContact] = useState<ScContactFilter>('all')
  const [filterRemark, setFilterRemark] = useState<ScRemarkFilter>('all')
  const [filterFavorite, setFilterFavorite] = useState<ScFavoriteFilter>('all')
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [floatPanelOpen, setFloatPanelOpen] = useState(false)
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
  const [editLicenseNo, setEditLicenseNo] = useState<string | null>(null)
  const [draftNoteText, setDraftNoteText] = useState('')
  const [draftImages, setDraftImages] = useState<string[]>([])
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteHistoryMap, setNoteHistoryMap] = useState<Record<string, EnterpriseNoteEntry[]>>({})
  const [page, setPage] = useState(1)
  const [listTotal, setListTotal] = useState(0)
  const [listDataSource, setListDataSource] = useState<string | null>(null)
  const [rowsFromApi, setRowsFromApi] = useState(false)
  const [listLoadingMore, setListLoadingMore] = useState(false)
  const [apiCategories, setApiCategories] = useState<string[] | null>(null)
  const [apiAuthorities, setApiAuthorities] = useState<string[] | null>(null)
  const favoriteSet = useScFavoriteSet()

  useEffect(() => {
    const title = 'SC查询'
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

  useLayoutEffect(() => {
    try {
      const raw = sessionStorage.getItem(SC_QUERY_SCROLL_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { y?: unknown }
      const y =
        typeof parsed?.y === 'number' && Number.isFinite(parsed.y) ? Math.max(0, parsed.y) : null
      if (y == null) return
      scrollRestoreYRef.current = y
      window.scrollTo(0, y)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const y = scrollRestoreYRef.current
    if (y == null || deferredScrollRestoreDoneRef.current) return
    if (listLoading) return
    deferredScrollRestoreDoneRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, y)
      })
    })
  }, [listLoading])

  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(
          SC_QUERY_SCROLL_STORAGE_KEY,
          JSON.stringify({ y: window.scrollY }),
        )
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      const y = scrollRestoreYRef.current
      if (y != null) window.scrollTo(0, y)
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
      persistScDetailRowSession(licenseNo, r)
      navigate(`/sc-query/detail/${encodeURIComponent(licenseNo)}`, { state: { row: r } })
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
    if (!q.trim()) {
      setDebouncedQuery('')
      setPage(1)
      return undefined
    }
    const id = window.setTimeout(() => {
      setDebouncedQuery(q)
      setPage(1)
    }, SC_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [query])

  useEffect(() => {
    if (!getScQueryApiBaseUrl()) return undefined
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
    if (!getScQueryApiBaseUrl()) return undefined
    let cancelled = false
    const isFirstPage = page === 1
    if (isFirstPage) {
      setListLoading(true)
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
        搜索到 <span className="dian-sc-query-result-num">{nShow}</span> 条
      </span>,
    )
    if (rowsFromApi && listTotal > 0 && (listTotal !== nShow || nRows < listTotal)) {
      parts.push(
        <span key="total">
          {' '}
          <span className="dian-sc-query-result-meta-secondary">
            （列表共 <span className="dian-sc-query-result-num">{listTotal}</span> 条
            {nRows < listTotal ? (
              <>
                ，已加载 <span className="dian-sc-query-result-num">{nRows}</span> 条
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
    listLoadingMore,
  ])

  return (
    <div className="dian-subpage">
      <div className="dian-sc-query-sticky-head">
        <p className="dian-sc-query-result-meta" role="status" aria-live="polite">
          {queryResultSummary}
        </p>
        <div className="dian-sc-query-inline-filters" aria-label="搜索与筛选">
          <ScQuerySearchFilters {...searchFiltersShared} variant="drawer" idSuffix="-inline" hideBack />
        </div>
      </div>

      <main className="dian-subpage-body" aria-label="查询">
        {listLoading && rows.length === 0 ? (
          <p className="dian-sc-search-pending" role="status" aria-live="polite">
            正在加载与中台 Web 相同的数据源（GET /api/scquery/enterprises）…
          </p>
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
                  已加载 {rows.length} 条，共 {listTotal} 条
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
              <button
                type="button"
                className="dian-sc-float-sheet-close"
                aria-label="关闭"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setFloatPanelOpen(false)}
              >
                ×
              </button>
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
