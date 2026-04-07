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
}

function dash(s: string): string {
  const t = s.trim()
  if (!t || t === '-') return '—'
  return t
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

const SPEC: Array<{ label: string; mono?: boolean; featured?: boolean; get: (row: RowLite, db: LicenseDetailDb) => string }> = [
  { label: '许可证编号', mono: true, featured: true, get: (r, d) => d.xkzbh ?? r.licenseNo },
  { label: '生产者名称', get: (r, d) => d.jyzmc ?? r.companyName },
  { label: '社会信用代码', mono: true, get: (r, d) => d.shxydm ?? r.creditCode },
  { label: '法定代表人', get: (r, d) => d.fddbrFzr ?? r.legalRep },
  { label: '生产地址', get: (r, d) => d.jycs ?? r.productionAddress },
  { label: '住所', get: (r, d) => d.zs ?? r.residence },
  { label: '食品类别', get: (r, d) => d.sccplbmc ?? r.foodCategory },
  {
    label: '有效期',
    mono: true,
    get: (r, d) => {
      const a = d.yxqq?.trim()
      const b = d.yxqz?.trim()
      if (a && b) return `${a} 至 ${b}`
      return r.validPeriodRaw
    },
  },
  { label: '初次领证日期', mono: true, get: (_r, d) => d.cclzrq ?? '' },
  { label: '签发时间', mono: true, get: (r, d) => d.qfsj ?? r.issueTime },
  { label: '发证机关', get: (r, d) => d.fzjgmc ?? r.authority },
  { label: '受理机关', get: (_r, d) => d.sljgmc ?? '' },
  { label: '日常监督管理机构', get: (_r, d) => d.rcjgjgmc ?? '' },
  { label: '品种明细说明', get: (_r, d) => d.pdVo ?? '' },
  { label: '申请类型', mono: true, get: (_r, d) => d.sqlx ?? '' },
  { label: '申请事项代码', mono: true, get: (_r, d) => d.sqsxdm ?? '' },
  { label: '申请 ID', mono: true, get: (_r, d) => d.sqid ?? '' },
  { label: '食品类别编码', mono: true, get: (_r, d) => d.sccplbbm ?? '' },
  { label: '有效项', get: (_r, d) => d.yxx ?? '' },
  { label: '证件号码', mono: true, get: (_r, d) => d.zjhm ?? '' },
  { label: '住所种类', mono: true, get: (_r, d) => d.zszl ?? '' },
  { label: 'param02', mono: true, get: (_r, d) => d.param02 ?? '' },
  { label: 'contactAt', mono: true, get: (_r, d) => d.contactAt ?? '' },
  { label: 'contactPhone', mono: true, get: (_r, d) => d.contactPhone ?? '' },
  { label: 'contactStatus（库）', get: (_r, d) => d.contactStatusRaw ?? '' },
  { label: 'notes（库）', get: (_r, d) => d.notes ?? '' },
  { label: 'updated_at', mono: true, get: (_r, d) => d.updatedAt ?? '' },
  { label: 'id', mono: true, get: (_r, d) => d.apiId ?? '' },
  { label: 'images', mono: true, get: (_r, d) => d.images ?? '' },

  { label: '企业名称', get: (r, d) => d.jyzmc ?? r.companyName },
  { label: '参保人数', get: (_r, d) => d.insuredCount ?? '' },
  { label: '曾用名', get: (_r, d) => d.formerName ?? '' },
  { label: '成立日期', get: (_r, d) => d.establishDate ?? '' },
  { label: '电话', mono: true, get: (_r, d) => d.enterprisePhone ?? '' },
  { label: '更多电话', get: (_r, d) => d.morePhones ?? '' },
  { label: '更多邮箱', get: (_r, d) => d.moreEmails ?? '' },
  { label: '工商注册号', mono: true, get: (_r, d) => d.businessRegNo ?? '' },
  { label: '核准日期', get: (_r, d) => d.approvalDate ?? '' },
  { label: '经营范围', get: (_r, d) => d.businessScope ?? '' },
  { label: '经营状态', get: (_r, d) => d.businessStatus ?? '' },
  { label: '纳税人识别号', mono: true, get: (_r, d) => d.taxId ?? '' },
  { label: '匹配状态', get: (_r, d) => d.matchStatus ?? '' },
  { label: '企业类型', get: (_r, d) => d.enterpriseType ?? '' },
  { label: '实缴资本', get: (_r, d) => d.paidInCapital ?? '' },
  { label: '所属省份', get: (_r, d) => d.province ?? '' },
  { label: '所属城市', get: (_r, d) => d.city ?? '' },
  { label: '所属区县', get: (_r, d) => d.district ?? '' },
  { label: '所属行业', get: (_r, d) => d.industry ?? '' },
  { label: '注册资本', get: (_r, d) => d.regCapital ?? '' },
  { label: '组织机构代码', mono: true, get: (_r, d) => d.orgCode ?? '' },
  { label: '注册地址', get: (_r, d) => d.regAddress ?? '' },
  { label: '最新年报地址', get: (_r, d) => d.annualReportAddress ?? '' },
  { label: '网址', get: (_r, d) => d.website ?? '' },
  { label: '营业期限', get: (_r, d) => d.bizTerm ?? '' },
  { label: '邮箱', get: (_r, d) => d.email ?? '' },
  { label: '公示手机', mono: true, get: (r, d) => d.enterprisePhone ?? r.publicPhone },
  {
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

export function buildLicenseDetailLines(row: RowLite & { db?: LicenseDetailDb }): DetailLine[] {
  const db = row.db ?? {}
  const full = Object.keys(db).length > 0
  const lines: DetailLine[] = []
  for (const s of SPEC) {
    if (!full && !COMPACT_DETAIL_LABELS.has(s.label)) continue
    const raw = s.get(row, db)
    const value = dash(raw)
    lines.push({ label: s.label, value, mono: s.mono, featured: s.featured })
  }
  if (row.phone.trim()) {
    lines.push({ label: '本页联系电话（可编辑）', value: dash(row.phone), mono: true })
  }
  if (row.remark.trim()) {
    lines.push({ label: '本页备注（可编辑）', value: dash(row.remark) })
  }
  return lines
}

export function detailHaystack(db: LicenseDetailDb | undefined): string {
  if (!db) return ''
  return Object.values(db)
    .filter((v) => typeof v === 'string')
    .join(' ')
}
