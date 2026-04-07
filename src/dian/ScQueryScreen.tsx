import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { buildLicenseDetailLines, detailHaystack } from './licenseDetailModel'
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

export type { LicenseRow } from './scLicenseTypes'

const SC_SEARCH_DEBOUNCE_MS = 320
/** 与中台分页一致：每页条数（滚动触底自动加载下一页） */
const SC_LIST_PAGE_SIZE = 20

const MAX_NOTE_IMAGES = 8
const MAX_IMAGE_BYTES = Math.floor(2.5 * 1024 * 1024)

function formatNoteSavedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null)
  if (file.size > MAX_IMAGE_BYTES) return Promise.resolve(null)
  return new Promise((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
    r.onerror = () => resolve(null)
    r.readAsDataURL(file)
  })
}

type ScQueryScreenProps = {
  onBack: () => void
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
  onView,
  onEdit,
  onContactStatusChange,
}: {
  row: LicenseRow
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
        if (el.closest('a.dian-sc-lic-phone-tel, button.dian-sc-lic-phone, .dian-sc-lic-contact-wrap')) return
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

function ScField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="dian-sc-field">
      <span className="dian-sc-field-label">{label}</span>
      <span className={mono ? 'dian-sc-field-value dian-sc-field-mono' : 'dian-sc-field-value'}>{value}</span>
    </div>
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

type ScPhoneFilter = 'all' | 'has' | 'none'
type ScRemarkFilter = 'all' | 'has' | 'none'
type ScContactFilter = 'all' | '已联系' | '未联系'

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

function ScEnterpriseEditSheet({
  open,
  companyName,
  noteText,
  onNoteTextChange,
  images,
  setImages,
  history,
  onSave,
  onCancel,
  saving,
}: {
  open: boolean
  companyName: string
  noteText: string
  onNoteTextChange: (v: string) => void
  images: string[]
  setImages: Dispatch<SetStateAction<string[]>>
  history: EnterpriseNoteEntry[]
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files)
    const urls: string[] = []
    for (const f of arr) {
      if (urls.length >= MAX_NOTE_IMAGES) break
      const url = await fileToDataUrl(f)
      if (url) urls.push(url)
    }
    if (!urls.length) return
    setImages((prev) => [...prev, ...urls].slice(0, MAX_NOTE_IMAGES))
  }

  const onPasteImages = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items?.length) return
    const urls: string[] = []
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        e.preventDefault()
        const f = it.getAsFile()
        if (f) {
          const url = await fileToDataUrl(f)
          if (url) urls.push(url)
        }
      }
    }
    if (!urls.length) return
    setImages((prev) => [...prev, ...urls].slice(0, MAX_NOTE_IMAGES))
  }

  if (!open) return null

  return (
    <div className="dian-sc-edit-root" role="presentation">
      <button type="button" className="dian-sc-edit-backdrop" aria-label="关闭" onClick={onCancel} />
      <div
        className="dian-sc-edit-panel dian-sc-edit-panel--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dian-sc-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dian-sc-edit-handle" aria-hidden />
        <h2 id="dian-sc-edit-title" className="dian-sc-edit-title">
          编辑
        </h2>
        <p className="dian-sc-edit-sub">{companyName}</p>

        <label className="dian-sc-edit-label" htmlFor="dian-sc-edit-note">
          本次跟进内容
        </label>
        <textarea
          id="dian-sc-edit-note"
          className="dian-sc-edit-textarea dian-sc-edit-textarea--tall"
          placeholder="填写文字；支持 Ctrl+V 粘贴图片"
          rows={5}
          value={noteText}
          onChange={(e) => onNoteTextChange(e.target.value)}
          onPaste={onPasteImages}
        />

        <div className="dian-sc-edit-img-toolbar">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="dian-sc-edit-file"
            onChange={(e) => {
              const fl = e.target.files
              if (fl?.length) void addFiles(fl)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="dian-sc-edit-img-btn"
            onClick={() => fileRef.current?.click()}
            disabled={images.length >= MAX_NOTE_IMAGES}
          >
            添加图片（{images.length}/{MAX_NOTE_IMAGES}）
          </button>
        </div>

        {images.length > 0 ? (
          <div className="dian-sc-edit-img-grid">
            {images.map((src, idx) => (
              <div key={`${idx}-${src.slice(0, 24)}`} className="dian-sc-edit-img-cell">
                <img src={src} alt="" className="dian-sc-edit-img-thumb" />
                <button
                  type="button"
                  className="dian-sc-edit-img-remove"
                  aria-label="移除图片"
                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {history.length > 0 ? (
          <div className="dian-sc-edit-history">
            <div className="dian-sc-edit-history-title">历史记录</div>
            <ul className="dian-sc-edit-history-list">
              {history.map((e) => (
                <li key={e.id} className="dian-sc-edit-history-item">
                  <div className="dian-sc-edit-history-time">{formatNoteSavedAt(e.savedAt)}</div>
                  <div className="dian-sc-edit-history-text">{e.text || (e.images.length ? '（图片）' : '—')}</div>
                  {e.images.length > 0 ? (
                    <div className="dian-sc-edit-history-imgs">
                      {e.images.slice(0, 4).map((src, i) => (
                        <img key={i} src={src} alt="" className="dian-sc-edit-history-thumb" />
                      ))}
                      {e.images.length > 4 ? <span className="dian-sc-edit-history-more">+{e.images.length - 4}</span> : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="dian-sc-edit-actions">
          <button type="button" className="dian-sc-edit-btn dian-sc-edit-btn-cancel" onClick={onCancel} disabled={saving}>
            取消
          </button>
          <button type="button" className="dian-sc-edit-btn dian-sc-edit-btn-save" onClick={onSave} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScLicenseDetailSheet({
  row,
  open,
  onClose,
  onEditContact,
  noteHistory,
}: {
  row: LicenseRow | null
  open: boolean
  onClose: () => void
  onEditContact?: () => void
  noteHistory: EnterpriseNoteEntry[]
}) {
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const detailLines = useMemo(() => (row ? buildLicenseDetailLines(row) : []), [row])

  if (!open || !row) return null

  const varieties = row.varietyRows ?? []

  return (
    <div className="dian-sc-detail-root" role="presentation">
      <button type="button" className="dian-sc-detail-backdrop" aria-label="关闭" onClick={onClose} />
      <div
        className="dian-sc-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dian-sc-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dian-sc-detail-handle" aria-hidden />
        <header className="dian-sc-detail-head">
          <h2 id="dian-sc-detail-title" className="dian-sc-detail-title">
            许可证详情
          </h2>
          <p className="dian-sc-detail-entity">{row.companyName}</p>
        </header>
        <div className="dian-sc-detail-scroll">
          <div className="dian-sc-detail-fields">
            {detailLines.map((line, idx) => {
              const inner = (
                <ScField label={line.label} value={line.value} mono={line.mono} />
              )
              if (line.featured) {
                return (
                  <div key={`${line.label}-${idx}`} className="dian-sc-detail-field-featured">
                    {inner}
                  </div>
                )
              }
              return (
                <div key={`${line.label}-${idx}`} className="dian-sc-detail-field-wrap">
                  {inner}
                </div>
              )
            })}
          </div>

          {varieties.length > 0 ? (
            <div className="dian-sc-detail-varieties">
              <h3 className="dian-sc-detail-section-title">食品生产许可品种明细表</h3>
              <div className="dian-sc-varieties-scroll">
                <table className="dian-sc-varieties-table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>食品、食品添加剂类别</th>
                      <th>类别编号</th>
                      <th>类别名称</th>
                      <th>品种明细</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varieties.map((v) => (
                      <tr key={v.seq}>
                        <td>{v.seq}</td>
                        <td>{v.foodCategory}</td>
                        <td>{v.categoryCode}</td>
                        <td>{v.categoryName}</td>
                        <td>{v.varietyDetail}</td>
                        <td>{v.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {noteHistory.length > 0 ? (
            <div className="dian-sc-detail-notes">
              <h3 className="dian-sc-detail-section-title">跟进记录</h3>
              <ul className="dian-sc-detail-notes-list">
                {noteHistory.slice(0, 30).map((e) => (
                  <li key={e.id} className="dian-sc-detail-notes-item">
                    <div className="dian-sc-detail-notes-time">{formatNoteSavedAt(e.savedAt)}</div>
                    <div className="dian-sc-detail-notes-body">
                      {e.text ? <p className="dian-sc-detail-notes-text">{e.text}</p> : null}
                      {e.images.length > 0 ? (
                        <div className="dian-sc-detail-notes-imgs">
                          {e.images.map((src, i) => (
                            <a key={i} href={src} target="_blank" rel="noreferrer" className="dian-sc-detail-notes-img-a">
                              <img src={src} alt="" className="dian-sc-detail-notes-img" />
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {!e.text && e.images.length === 0 ? <p className="dian-sc-detail-notes-text">—</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="dian-sc-detail-footer">
          {onEditContact ? (
            <button type="button" className="dian-sc-detail-edit-link" onClick={onEditContact}>
              编辑
            </button>
          ) : null}
          <button type="button" className="dian-sc-detail-close" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ScQueryScreen({ onBack }: ScQueryScreenProps) {
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
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [viewLicenseNo, setViewLicenseNo] = useState<string | null>(null)
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

  const editingRow = editLicenseNo ? rows.find((r) => r.licenseNo === editLicenseNo) : undefined
  const viewingRow = viewLicenseNo ? rows.find((r) => r.licenseNo === viewLicenseNo) : undefined

  const setRowContactStatus = useCallback(async (row: LicenseRow, next: '已联系' | '未联系') => {
    const code: 0 | 1 = next === '已联系' ? 1 : 0
    if (hasEnterpriseId(row.enterpriseId)) {
      await saveEnterpriseContactStatusRemote(row.enterpriseId.trim(), code)
    }
    setRows((prev) => prev.map((r) => (r.licenseNo === row.licenseNo ? { ...r, contactStatus: next } : r)))
  }, [])

  const openView = useCallback((licenseNo: string) => {
    setViewLicenseNo(licenseNo)
  }, [])

  const closeView = useCallback(() => {
    setViewLicenseNo(null)
  }, [])

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
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
    if (!viewLicenseNo) return
    const row = rows.find((r) => r.licenseNo === viewLicenseNo)
    if (row) void refreshNoteHistory(row)
  }, [viewLicenseNo, rows, refreshNoteHistory])

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
    return bySearch.filter((row) => rowMatchesScFilters(row, scFilter))
  }, [rows, rowsFromApi, debouncedQuery, scFilter])

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
    return n
  }, [filterFood, filterAuthority, filterPhone, filterContact, filterRemark])

  const searchPending = query.trim() !== '' && query.trim() !== debouncedQuery.trim()

  const clearSearchOnDoubleClick = useCallback(() => {
    setQuery('')
    searchInputRef.current?.focus()
  }, [])

  return (
    <div className="dian-subpage">
      <div className="dian-subpage-sticky">
        <header className="dian-subpage-top">
          <button type="button" className="dian-subpage-back" onClick={onBack} aria-label="返回">
            <span className="dian-subpage-back-icon" aria-hidden>
              ‹
            </span>
          </button>
          <div
            className="dian-sc-search"
            role="search"
            onDoubleClick={clearSearchOnDoubleClick}
            title="双击清空搜索"
          >
            <span className="dian-sc-search-icon">
              <SearchIcon />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              className="dian-sc-search-input"
              placeholder="企业名称、许可证编号、发证机关等"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </header>

        <div className="dian-sc-filter-bar" role="toolbar" aria-label="列表筛选">
          {listDataSource ? (
            <p className="dian-sc-filter-datasource" role="status">
              数据源：{listDataSource}
            </p>
          ) : null}
          <div className={`dian-sc-filter-panel${filterPanelOpen ? ' dian-sc-filter-panel--open' : ''}`}>
            <button
              type="button"
              className="dian-sc-filter-toggle"
              aria-expanded={filterPanelOpen}
              aria-controls="dian-sc-filter-grid"
              id="dian-sc-filter-toggle"
              onClick={() => setFilterPanelOpen((v) => !v)}
            >
              <span className="dian-sc-filter-head-ico" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
                </svg>
              </span>
              <span className="dian-sc-filter-head-text">
                <span className="dian-sc-filter-head-row">
                  <span className="dian-sc-filter-head-title">筛选条件</span>
                  {filterActiveCount > 0 ? (
                    <span className="dian-sc-filter-badge" aria-label={`已选 ${filterActiveCount} 项`}>
                      {filterActiveCount}
                    </span>
                  ) : null}
                </span>
                <span className="dian-sc-filter-head-hint">{filterPanelOpen ? '轻触收起' : '轻触展开'}</span>
              </span>
              <span className="dian-sc-filter-chevron" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            <div
              className="dian-sc-filter-animate"
              aria-hidden={!filterPanelOpen}
              inert={filterPanelOpen ? undefined : true}
            >
              <div id="dian-sc-filter-grid" className="dian-sc-filter-grid">
              <label className="dian-sc-filter-field" htmlFor="dian-sc-f-food">
                <span className="dian-sc-filter-label">产品类别</span>
                <select
                  id="dian-sc-f-food"
                  className="dian-sc-filter-select"
                  value={filterFood}
                  onChange={(e) => {
                    setFilterFood(e.target.value)
                    setPage(1)
                  }}
                  title={filterFood || '选择产品类别'}
                >
                  <option value="">全部类别</option>
                  {foodOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dian-sc-filter-field" htmlFor="dian-sc-f-auth">
                <span className="dian-sc-filter-label">发证机关</span>
                <select
                  id="dian-sc-f-auth"
                  className="dian-sc-filter-select"
                  value={filterAuthority}
                  onChange={(e) => {
                    setFilterAuthority(e.target.value)
                    setPage(1)
                  }}
                  title={filterAuthority || '选择发证机关'}
                >
                  <option value="">全部机关</option>
                  {authorityOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dian-sc-filter-field" htmlFor="dian-sc-f-phone">
                <span className="dian-sc-filter-label">手机号码</span>
                <select
                  id="dian-sc-f-phone"
                  className="dian-sc-filter-select"
                  value={filterPhone}
                  onChange={(e) => {
                    setFilterPhone(e.target.value as ScPhoneFilter)
                    setPage(1)
                  }}
                >
                  <option value="all">全部</option>
                  <option value="has">有手机</option>
                  <option value="none">无手机</option>
                </select>
              </label>
              <label className="dian-sc-filter-field" htmlFor="dian-sc-f-contact">
                <span className="dian-sc-filter-label">联系记录</span>
                <select
                  id="dian-sc-f-contact"
                  className="dian-sc-filter-select"
                  value={filterContact}
                  onChange={(e) => {
                    setFilterContact(e.target.value as ScContactFilter)
                    setPage(1)
                  }}
                >
                  <option value="all">全部</option>
                  <option value="已联系">已联系</option>
                  <option value="未联系">未联系</option>
                </select>
              </label>
              <label className="dian-sc-filter-field dian-sc-filter-field--full" htmlFor="dian-sc-f-remark">
                <span className="dian-sc-filter-label">备注</span>
                <select
                  id="dian-sc-f-remark"
                  className="dian-sc-filter-select"
                  value={filterRemark}
                  onChange={(e) => {
                    setFilterRemark(e.target.value as ScRemarkFilter)
                    setPage(1)
                  }}
                >
                  <option value="all">全部</option>
                  <option value="has">已备注</option>
                  <option value="none">未备注</option>
                </select>
              </label>
              </div>
            </div>
          </div>
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
            <p className="dian-sc-empty-desc">可尝试调整上方筛选条件或更换搜索关键词。</p>
          </div>
        ) : (
          <>
            <div className="dian-sc-list">
              {filtered.map((row, i) => (
                <ScLicenseEnterpriseCard
                  key={`${row.licenseNo}-${i}`}
                  row={row}
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

      <ScLicenseDetailSheet
        row={viewingRow ?? null}
        open={Boolean(viewLicenseNo && viewingRow)}
        onClose={closeView}
        noteHistory={viewingRow ? noteHistoryMap[noteStorageKey(viewingRow)] ?? [] : []}
        onEditContact={
          viewLicenseNo
            ? () => {
                const id = viewLicenseNo
                closeView()
                openEdit(id)
              }
            : undefined
        }
      />

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
