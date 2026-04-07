/** 许可证 / 企业库字段（与接口字段对应，均为可选） */
export type LicenseDetailDb = Partial<{
  xkzbh: string
  jyzmc: string
  shxydm: string
  fddbrFzr: string
  jycs: string
  zs: string
  sccplbmc: string
  yxqq: string
  yxqz: string
  cclzrq: string
  qfsj: string
  fzjgmc: string
  sljgmc: string
  rcjgjgmc: string
  pdVo: string
  sqlx: string
  sqsxdm: string
  sqid: string
  sccplbbm: string
  yxx: string
  zjhm: string
  zszl: string
  param02: string
  contactAt: string
  contactPhone: string
  contactStatusRaw: string
  notes: string
  updatedAt: string
  apiId: string
  images: string

  insuredCount: string
  formerName: string
  establishDate: string
  enterprisePhone: string
  morePhones: string
  moreEmails: string
  businessRegNo: string
  approvalDate: string
  businessScope: string
  businessStatus: string
  taxId: string
  matchStatus: string
  enterpriseType: string
  paidInCapital: string
  city: string
  district: string
  province: string
  industry: string
  regCapital: string
  orgCode: string
  annualReportAddress: string
  regAddress: string
  website: string
  bizTerm: string
  email: string
}>

export type FoodVarietyRow = {
  seq: number
  foodCategory: string
  categoryCode: string
  categoryName: string
  varietyDetail: string
  remark: string
}

export type DetailLine = {
  label: string
  value: string
  mono?: boolean
  featured?: boolean
  /** 详情页双列布局时占满一行 */
  fullRow?: boolean
}

export type DetailSection = {
  title: string
  lines: DetailLine[]
}

function dash(s: string): string {
  const t = s.trim()
  if (!t || t === '-') return '—'
  return t
}

function formatContactStatusRaw(raw: string): string {
  const t = raw.trim()
  if (t === '0' || t === '2' || t === '') return '未联系'
  if (t === '1') return '已联系'
  return t
}

function pickStrObj(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k]
    if (v != null && String(v).trim()) return String(v).trim()
  }
  return ''
}

/** 从接口 pdVo JSON 字符串解析品种明细（与列表映射 scQueryApi.parseVarietyRows 字段一致） */
export function parseVarietyDetailsFromPdVo(pdVo: string | undefined): FoodVarietyRow[] {
  if (!pdVo?.trim()) return []
  const t = pdVo.trim()
  if (!t.startsWith('{') && !t.startsWith('[')) return []
  let root: unknown
  try {
    root = JSON.parse(t) as unknown
  } catch {
    return []
  }
  if (!root || typeof root !== 'object') return []
  const list = (root as Record<string, unknown>).apprFoproductDetailsList
  if (!Array.isArray(list) || list.length === 0) return []
  const rows: FoodVarietyRow[] = []
  for (let i = 0; i < list.length; i++) {
    const it = list[i]
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const seq = Number(o.seq ?? o.sxh ?? o.index ?? o.sortNo ?? i + 1) || i + 1
    rows.push({
      seq,
      foodCategory: pickStrObj(
        o,
        'splb',
        'foodCategory',
        'foodAdditiveCategory',
        '食品食品添加剂类别',
        'category',
      ),
      categoryCode: pickStrObj(o, 'lbbh', 'categoryCode', '类别编号', 'code', 'categoryNumber'),
      categoryName: pickStrObj(o, 'lbmc', 'categoryName', '类别名称', 'name'),
      varietyDetail: pickStrObj(o, 'pzmx', 'varietyDetail', '品种明细', 'detail', 'varietyName'),
      remark: pickStrObj(o, 'remark', 'bz', '备注') || '—',
    })
  }
  return rows
}

type RowLite = {
  licenseNo: string
  companyName: string
  creditCode: string
  legalRep: string
  productionAddress: string
  residence: string
  foodCategory: string
  validPeriodRaw: string
  issueTime: string
  authority: string
  publicPhone: string
  contactStatus: string
  phone: string
  remark: string
}

const SEC = {
  license: '许可证与生产',
  apply: '申请与编码',
  system: '系统与同步',
  enterprise: '工商登记',
  contact: '联系与跟进',
} as const

const SPEC: Array<{
  label: string
  section: string
  mono?: boolean
  featured?: boolean
  fullRow?: boolean
  /** 完整详情模式下值为「—」时不展示（减少噪音） */
  skipIfDash?: boolean
  get: (row: RowLite, db: LicenseDetailDb) => string
}> = [
  { section: SEC.license, label: '许可证编号', mono: true, featured: true, get: (r, d) => d.xkzbh ?? r.licenseNo },
  { section: SEC.license, label: '生产者名称', get: (r, d) => d.jyzmc ?? r.companyName },
  { section: SEC.license, label: '社会信用代码', mono: true, get: (r, d) => d.shxydm ?? r.creditCode },
  { section: SEC.license, label: '法定代表人', get: (r, d) => d.fddbrFzr ?? r.legalRep },
  { section: SEC.license, label: '住所', get: (r, d) => d.zs ?? r.residence },
  { section: SEC.license, label: '生产地址', fullRow: true, get: (r, d) => d.jycs ?? r.productionAddress },
  { section: SEC.license, label: '食品类别', fullRow: true, get: (r, d) => d.sccplbmc ?? r.foodCategory },
  {
    section: SEC.license,
    label: '有效期',
    mono: true,
    fullRow: true,
    get: (r, d) => {
      const a = d.yxqq?.trim()
      const b = d.yxqz?.trim()
      if (a && b) return `${a} 至 ${b}`
      return r.validPeriodRaw
    },
  },
  {
    section: SEC.license,
    label: '初次领证日期',
    mono: true,
    skipIfDash: true,
    get: (_r, d) => d.cclzrq ?? '',
  },
  { section: SEC.license, label: '签发时间', mono: true, get: (r, d) => d.qfsj ?? r.issueTime },
  { section: SEC.license, label: '发证机关', get: (r, d) => d.fzjgmc ?? r.authority },
  { section: SEC.license, label: '受理机关', skipIfDash: true, get: (_r, d) => d.sljgmc ?? '' },
  {
    section: SEC.license,
    label: '日常监督管理机构',
    skipIfDash: true,
    get: (_r, d) => d.rcjgjgmc ?? '',
  },

  { section: SEC.apply, label: '申请类型', mono: true, skipIfDash: true, get: (_r, d) => d.sqlx ?? '' },
  { section: SEC.apply, label: '申请事项代码', mono: true, skipIfDash: true, get: (_r, d) => d.sqsxdm ?? '' },
  { section: SEC.apply, label: '申请 ID', mono: true, skipIfDash: true, get: (_r, d) => d.sqid ?? '' },
  { section: SEC.apply, label: '食品类别编码', mono: true, skipIfDash: true, get: (_r, d) => d.sccplbbm ?? '' },
  { section: SEC.apply, label: '有效项', skipIfDash: true, get: (_r, d) => d.yxx ?? '' },
  { section: SEC.apply, label: '证件号码', mono: true, skipIfDash: true, get: (_r, d) => d.zjhm ?? '' },
  { section: SEC.apply, label: '住所种类', mono: true, skipIfDash: true, get: (_r, d) => d.zszl ?? '' },
  { section: SEC.apply, label: 'param02', mono: true, skipIfDash: true, get: (_r, d) => d.param02 ?? '' },

  {
    section: SEC.system,
    label: 'contactAt',
    mono: true,
    skipIfDash: true,
    get: (_r, d) => d.contactAt ?? '',
  },
  {
    section: SEC.system,
    label: 'contactPhone',
    mono: true,
    skipIfDash: true,
    get: (_r, d) => d.contactPhone ?? '',
  },
  {
    section: SEC.system,
    label: 'contactStatus（库）',
    get: (_r, d) => formatContactStatusRaw(d.contactStatusRaw ?? ''),
  },
  {
    section: SEC.system,
    label: 'notes（库）',
    fullRow: true,
    skipIfDash: true,
    get: (_r, d) => d.notes ?? '',
  },
  {
    section: SEC.system,
    label: 'updated_at',
    mono: true,
    skipIfDash: true,
    get: (_r, d) => d.updatedAt ?? '',
  },
  { section: SEC.system, label: 'id', mono: true, skipIfDash: true, get: (_r, d) => d.apiId ?? '' },

  { section: SEC.enterprise, label: '企业名称', get: (r, d) => d.jyzmc ?? r.companyName },
  { section: SEC.enterprise, label: '参保人数', skipIfDash: true, get: (_r, d) => d.insuredCount ?? '' },
  { section: SEC.enterprise, label: '曾用名', skipIfDash: true, get: (_r, d) => d.formerName ?? '' },
  { section: SEC.enterprise, label: '成立日期', skipIfDash: true, get: (_r, d) => d.establishDate ?? '' },
  { section: SEC.enterprise, label: '电话', mono: true, skipIfDash: true, get: (_r, d) => d.enterprisePhone ?? '' },
  {
    section: SEC.enterprise,
    label: '更多电话',
    fullRow: true,
    skipIfDash: true,
    get: (_r, d) => d.morePhones ?? '',
  },
  {
    section: SEC.enterprise,
    label: '更多邮箱',
    fullRow: true,
    skipIfDash: true,
    get: (_r, d) => d.moreEmails ?? '',
  },
  {
    section: SEC.enterprise,
    label: '工商注册号',
    mono: true,
    skipIfDash: true,
    get: (_r, d) => d.businessRegNo ?? '',
  },
  { section: SEC.enterprise, label: '核准日期', skipIfDash: true, get: (_r, d) => d.approvalDate ?? '' },
  {
    section: SEC.enterprise,
    label: '经营范围',
    fullRow: true,
    skipIfDash: true,
    get: (_r, d) => d.businessScope ?? '',
  },
  { section: SEC.enterprise, label: '经营状态', skipIfDash: true, get: (_r, d) => d.businessStatus ?? '' },
  {
    section: SEC.enterprise,
    label: '纳税人识别号',
    mono: true,
    skipIfDash: true,
    get: (_r, d) => d.taxId ?? '',
  },
  { section: SEC.enterprise, label: '匹配状态', skipIfDash: true, get: (_r, d) => d.matchStatus ?? '' },
  { section: SEC.enterprise, label: '企业类型', skipIfDash: true, get: (_r, d) => d.enterpriseType ?? '' },
  { section: SEC.enterprise, label: '实缴资本', skipIfDash: true, get: (_r, d) => d.paidInCapital ?? '' },
  { section: SEC.enterprise, label: '所属省份', skipIfDash: true, get: (_r, d) => d.province ?? '' },
  { section: SEC.enterprise, label: '所属城市', skipIfDash: true, get: (_r, d) => d.city ?? '' },
  { section: SEC.enterprise, label: '所属区县', skipIfDash: true, get: (_r, d) => d.district ?? '' },
  { section: SEC.enterprise, label: '所属行业', skipIfDash: true, get: (_r, d) => d.industry ?? '' },
  { section: SEC.enterprise, label: '注册资本', skipIfDash: true, get: (_r, d) => d.regCapital ?? '' },
  {
    section: SEC.enterprise,
    label: '组织机构代码',
    mono: true,
    skipIfDash: true,
    get: (_r, d) => d.orgCode ?? '',
  },
  {
    section: SEC.enterprise,
    label: '注册地址',
    fullRow: true,
    skipIfDash: true,
    get: (_r, d) => d.regAddress ?? '',
  },
  {
    section: SEC.enterprise,
    label: '最新年报地址',
    fullRow: true,
    skipIfDash: true,
    get: (_r, d) => d.annualReportAddress ?? '',
  },
  { section: SEC.enterprise, label: '网址', skipIfDash: true, get: (_r, d) => d.website ?? '' },
  { section: SEC.enterprise, label: '营业期限', skipIfDash: true, get: (_r, d) => d.bizTerm ?? '' },
  { section: SEC.enterprise, label: '邮箱', skipIfDash: true, get: (_r, d) => d.email ?? '' },

  { section: SEC.contact, label: '公示手机', mono: true, get: (r, d) => d.enterprisePhone ?? r.publicPhone },
  {
    section: SEC.contact,
    label: '联系状态（本页）',
    get: (r) => (r.contactStatus.includes('已') ? '已联系' : '未联系'),
  },
]

const COMPACT_DETAIL_LABELS = new Set<string>([
  '许可证编号',
  '生产者名称',
  '社会信用代码',
  '法定代表人',
  '生产地址',
  '住所',
  '食品类别',
  '有效期',
  '签发时间',
  '发证机关',
  '公示手机',
  '联系状态（本页）',
])

const SECTION_ORDER = [SEC.license, SEC.apply, SEC.system, SEC.enterprise, SEC.contact]

const COMPACT_SECTION_TITLE = '许可证信息'

export function buildLicenseDetailSections(row: RowLite & { db?: LicenseDetailDb }): DetailSection[] {
  const db = row.db ?? {}
  const full = Object.keys(db).length > 0
  const map = new Map<string, DetailLine[]>()
  const push = (sectionTitle: string, line: DetailLine) => {
    const list = map.get(sectionTitle)
    if (list) list.push(line)
    else map.set(sectionTitle, [line])
  }

  for (const s of SPEC) {
    if (!full && !COMPACT_DETAIL_LABELS.has(s.label)) continue
    const raw = s.get(row, db)
    const value = dash(raw)
    if (full && value === '—' && s.skipIfDash) continue
    const line: DetailLine = {
      label: s.label,
      value,
      mono: s.mono,
      featured: s.featured,
      fullRow: s.fullRow,
    }
    const title = full ? s.section : COMPACT_SECTION_TITLE
    push(title, line)
  }

  if (row.phone.trim()) {
    const title = full ? SEC.contact : COMPACT_SECTION_TITLE
    push(title, { label: '本页联系电话（可编辑）', value: dash(row.phone), mono: true })
  }
  if (row.remark.trim()) {
    const title = full ? SEC.contact : COMPACT_SECTION_TITLE
    push(title, { label: '本页备注（可编辑）', value: dash(row.remark) })
  }

  const out: DetailSection[] = []
  if (full) {
    for (const title of SECTION_ORDER) {
      const lines = map.get(title)
      if (lines?.length) out.push({ title, lines })
    }
  } else {
    const lines = map.get(COMPACT_SECTION_TITLE)
    if (lines?.length) out.push({ title: COMPACT_SECTION_TITLE, lines })
  }
  return out
}

export function detailHaystack(db: LicenseDetailDb | undefined): string {
  if (!db) return ''
  return Object.values(db)
    .filter((v) => typeof v === 'string')
    .join(' ')
}
