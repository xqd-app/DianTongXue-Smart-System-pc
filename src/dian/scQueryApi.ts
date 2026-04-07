import type { FoodVarietyRow, LicenseDetailDb } from './licenseDetailModel'
import type { LicenseRow } from './scLicenseTypes'

/** 与中台 Web 一致：GET /api/scquery/enterprises 的 Query（可选） */
export type ScEnterpriseListQuery = {
  searchText?: string
  categories?: string
  authority?: string
  phoneFilter?: 'all' | 'hasPhone' | 'noPhone'
  contactStatus?: 'all' | 'contacted' | 'uncontacted'
  noteStatus?: 'all' | 'hasNote' | 'noNote'
  page?: number
  pageSize?: number
}

function pickStr(r: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = r[k]
    if (v == null) continue
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  }
  return ''
}

/**
 * SC 模块前缀（不含 /enterprises）。
 * 优先 VITE_API_BASE_URL（智慧中台 Web 同款，常为 https://域名/api 或 /api）
 * → 请求 ${该值}/scquery/enterprises
 */
export function getScQueryPrefixUrl(): string | null {
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (apiBase) {
    const t = apiBase.replace(/\/+$/, '')
    const p = `${t}/scquery`
    return p.startsWith('http') || p.startsWith('/') ? p : `/${p}`
  }
  const legacy = import.meta.env.VITE_SCQUERY_API_BASE?.trim()
  if (legacy) {
    const t = legacy.replace(/\/+$/, '')
    return t.startsWith('http') || t.startsWith('/') ? t : `/${t}`
  }
  const root = import.meta.env.VITE_SC_API_BASE?.trim()
  if (root) {
    return `${root.replace(/\/+$/, '')}/api/scquery`
  }
  return null
}

/** 是否启用网络列表（与 mock 二选一） */
export function getScQueryApiBaseUrl(): string | null {
  return getScQueryPrefixUrl()
}

function enterprisesListUrl(): string | null {
  const p = getScQueryPrefixUrl()
  if (!p) return null
  return `${p.replace(/\/+$/, '')}/enterprises`
}

function appendQuery(url: string, q: ScEnterpriseListQuery): string {
  const params = new URLSearchParams()
  if (q.searchText != null && q.searchText !== '') params.set('searchText', q.searchText)
  if (q.categories != null && q.categories !== '') params.set('categories', q.categories)
  if (q.authority != null && q.authority !== '') params.set('authority', q.authority)
  if (q.phoneFilter && q.phoneFilter !== 'all') params.set('phoneFilter', q.phoneFilter)
  if (q.contactStatus && q.contactStatus !== 'all') params.set('contactStatus', q.contactStatus)
  if (q.noteStatus && q.noteStatus !== 'all') params.set('noteStatus', q.noteStatus)
  params.set('page', String(q.page ?? 1))
  params.set('pageSize', String(q.pageSize ?? defaultPageSize()))
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

function defaultPageSize(): number {
  const n = Number(import.meta.env.VITE_SCQUERY_PAGE_SIZE)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 100
}

function unwrapEnterpriseList(body: unknown): {
  list: unknown[]
  total: number
  page: number
  pageSize: number
  dataSource?: string
} {
  if (!body || typeof body !== 'object') {
    return { list: [], total: 0, page: 1, pageSize: defaultPageSize() }
  }
  const o = body as Record<string, unknown>
  const data = o.data
  const list = Array.isArray(data) ? data : []
  const total = typeof o.total === 'number' ? o.total : Number(o.total) || list.length
  const page = typeof o.page === 'number' ? o.page : Number(o.page) || 1
  const pageSize = typeof o.pageSize === 'number' ? o.pageSize : Number(o.pageSize) || defaultPageSize()
  const dataSource = typeof o.dataSource === 'string' ? o.dataSource : undefined
  return { list, total, page, pageSize, dataSource }
}

function fmtCnDay(isoLike: string): string {
  const m = isoLike.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return isoLike.trim()
  return `${m[1]}年${m[2]}月${m[3]}日`
}

function guessCompanyShort(name: string): string {
  const t = name.replace(/股份有限公司|有限责任公司|有限公司|公司/g, '').trim()
  return (t.slice(0, 4) || name.slice(0, 4)).trim() || name.slice(0, 4)
}

function guessBrandAccent(short: string): string {
  return short.slice(0, 2) || short
}

function mapContactStatus(raw: unknown): string {
  if (typeof raw === 'number') {
    if (raw === 1) return '已联系'
    return '未联系'
  }
  const t = String(raw ?? '').trim()
  if (t === '1' || t === '已联系') return '已联系'
  if (t === '0' || t === '2' || t === '未联系' || t === '待联系' || t === '') return '未联系'
  if (t.includes('已')) return '已联系'
  return '未联系'
}

function recordToDetailDb(r: Record<string, unknown>): LicenseDetailDb {
  const out: LicenseDetailDb = {}
  const set = (key: keyof LicenseDetailDb, v: unknown) => {
    if (v == null) return
    if (typeof v === 'string' && v.trim()) {
      out[key] = v.trim()
      return
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      out[key] = String(v)
    }
  }

  const pdVoRaw = r.pdVo
  if (pdVoRaw != null && typeof pdVoRaw === 'object') {
    try {
      out.pdVo = JSON.stringify(pdVoRaw)
    } catch {
      out.pdVo = String(pdVoRaw)
    }
  } else if (typeof pdVoRaw === 'string') {
    set('pdVo', pdVoRaw)
  }

  set('contactStatusRaw', r.contactStatus)

  const alias: [string, keyof LicenseDetailDb][] = [
    ['updated_at', 'updatedAt'],
    ['id', 'apiId'],
    ['电话', 'enterprisePhone'],
    ['参保人数', 'insuredCount'],
    ['曾用名', 'formerName'],
    ['成立日期', 'establishDate'],
    ['更多电话', 'morePhones'],
    ['更多邮箱', 'moreEmails'],
    ['工商注册号', 'businessRegNo'],
    ['核准日期', 'approvalDate'],
    ['经营范围', 'businessScope'],
    ['经营状态', 'businessStatus'],
    ['纳税人识别号', 'taxId'],
    ['匹配状态', 'matchStatus'],
    ['企业类型', 'enterpriseType'],
    ['企业名称', 'jyzmc'],
    ['实缴资本', 'paidInCapital'],
    ['所属城市', 'city'],
    ['所属区县', 'district'],
    ['所属省份', 'province'],
    ['所属行业', 'industry'],
    ['统一社会信用代码', 'shxydm'],
    ['网址', 'website'],
    ['营业期限', 'bizTerm'],
    ['邮箱', 'email'],
    ['注册地址', 'regAddress'],
    ['注册资本', 'regCapital'],
    ['组织机构代码', 'orgCode'],
    ['最新年报地址', 'annualReportAddress'],
  ]
  for (const [apiKey, dbKey] of alias) {
    if (r[apiKey] != null) set(dbKey, r[apiKey])
  }

  const directKeys: (keyof LicenseDetailDb)[] = [
    'xkzbh',
    'jyzmc',
    'shxydm',
    'fddbrFzr',
    'jycs',
    'zs',
    'sccplbmc',
    'yxqq',
    'yxqz',
    'cclzrq',
    'qfsj',
    'fzjgmc',
    'sljgmc',
    'rcjgjgmc',
    'sqlx',
    'sqsxdm',
    'sqid',
    'sccplbbm',
    'yxx',
    'zjhm',
    'zszl',
    'param02',
    'contactAt',
    'contactPhone',
    'notes',
    'insuredCount',
    'formerName',
    'establishDate',
    'enterprisePhone',
    'morePhones',
    'moreEmails',
    'businessRegNo',
    'approvalDate',
    'businessScope',
    'businessStatus',
    'taxId',
    'matchStatus',
    'enterpriseType',
    'paidInCapital',
    'city',
    'district',
    'province',
    'industry',
    'regCapital',
    'orgCode',
    'annualReportAddress',
    'regAddress',
    'website',
    'bizTerm',
    'email',
  ]
  for (const k of directKeys) {
    const key = k as string
    if (r[key] != null) set(k, r[key])
  }

  if (Array.isArray(r.images)) {
    out.images = JSON.stringify(r.images)
  } else if (typeof r.images === 'string') {
    out.images = r.images
  }

  return out
}

function parseVarietyRows(r: Record<string, unknown>): FoodVarietyRow[] | undefined {
  let raw: unknown = r.scpzmx ?? r.varietyRows ?? r.varietyList ?? r.pzmxList
  const pdVo = r.pdVo
  if (
    !raw &&
    pdVo &&
    typeof pdVo === 'object' &&
    !Array.isArray(pdVo) &&
    Array.isArray((pdVo as Record<string, unknown>).apprFoproductDetailsList)
  ) {
    raw = (pdVo as Record<string, unknown>).apprFoproductDetailsList
  }
  if (!raw && typeof pdVo === 'string' && pdVo.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(pdVo) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const list = (parsed as Record<string, unknown>).apprFoproductDetailsList
        if (Array.isArray(list)) raw = list
      }
    } catch {
      /* ignore */
    }
  }
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const rows: FoodVarietyRow[] = []
  for (let i = 0; i < raw.length; i++) {
    const it = raw[i]
    if (!it || typeof it !== 'object') continue
    const o = it as Record<string, unknown>
    const seq = Number(o.seq ?? o.sxh ?? o.index ?? o.sortNo ?? i + 1) || i + 1
    rows.push({
      seq,
      foodCategory: pickStr(
        o,
        'foodCategory',
        'splb',
        'foodAdditiveCategory',
        '食品食品添加剂类别',
        'category',
      ),
      categoryCode: pickStr(o, 'categoryCode', 'lbbh', '类别编号', 'code', 'categoryNumber'),
      categoryName: pickStr(o, 'categoryName', 'lbmc', '类别名称', 'name'),
      varietyDetail: pickStr(o, 'varietyDetail', 'pzmx', '品种明细', 'detail', 'varietyName'),
      remark: pickStr(o, 'remark', 'bz', '备注') || '—',
    })
  }
  return rows.length ? rows : undefined
}

export function mapScQueryRecordToLicenseRow(raw: unknown): LicenseRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const licenseNo = pickStr(r, 'xkzbh', 'licenseNo', 'scbh')
  const companyName = pickStr(r, 'jyzmc', 'companyName', '企业名称', 'qymc')
  if (!licenseNo || !companyName) return null

  let enterpriseId: string | undefined
  const idRaw = r.id ?? r.enterpriseId
  if (idRaw != null && idRaw !== '') {
    const s = typeof idRaw === 'number' && Number.isFinite(idRaw) ? String(idRaw) : String(idRaw).trim()
    if (s.length > 0) enterpriseId = s
  }

  const yxqq = pickStr(r, 'yxqq')
  const yxqz = pickStr(r, 'yxqz')
  const validPeriodRaw =
    yxqq && yxqz ? `${yxqq} 至 ${yxqz}` : pickStr(r, 'validPeriodRaw', 'validPeriod', 'yxq')

  const issueTime = pickStr(r, 'qfsj', 'issueTime', 'cclzrq')
  const issueDate = pickStr(r, 'cclzrq')
    ? fmtCnDay(pickStr(r, 'cclzrq'))
    : fmtCnDay(issueTime.split(/\s/)[0] || issueTime)

  const validPeriod =
    yxqq && yxqz ? `${fmtCnDay(yxqq)} 至 ${fmtCnDay(yxqz)}` : pickStr(r, 'validPeriod', 'yxqText')

  const phone = pickStr(r, 'phone', 'mobile', 'shouji', 'contactPhone', 'enterprisePhone', '电话', 'sjhm')
  const remark = pickStr(r, 'remark', 'notes', 'bz', '备注')

  const companyShort = guessCompanyShort(companyName)
  const brandAccent = guessBrandAccent(companyShort)
  const foodCat = pickStr(r, 'sccplbmc', 'foodCategory', '食品类别')
  const bizTag = foodCat ? (foodCat.split(/[；;]/)[0]?.trim() || '食品生产') : '食品生产'

  const db = recordToDetailDb(r)
  const varietyRows = parseVarietyRows(r)

  return {
    ...(enterpriseId != null ? { enterpriseId } : {}),
    contactStatus: mapContactStatus(r.contactStatus ?? r.contactStatusRaw),
    companyName,
    companyShort,
    brandAccent,
    bizTag,
    licenseNo,
    issueDate: issueDate || issueTime.slice(0, 10),
    validPeriod: validPeriod || validPeriodRaw,
    authority: pickStr(r, 'fzjgmc', 'sljgmc', 'authority', '发证机关'),
    phone,
    remark,
    creditCode: pickStr(r, 'shxydm', 'creditCode', 'tyshxydm', '统一社会信用代码'),
    legalRep: pickStr(r, 'fddbrFzr', 'legalRep', '法定代表人'),
    productionAddress: pickStr(r, 'jycs', 'productionAddress', '生产地址'),
    residence: pickStr(r, 'zs', 'residence', '住所', '注册地址') || '-',
    foodCategory: foodCat || '—',
    validPeriodRaw: validPeriodRaw || '—',
    issueTime: issueTime || '—',
    publicPhone: pickStr(r, 'publicPhone', 'gsPhone', '公示电话', 'mobile', 'shouji') || '-',
    db: Object.keys(db).length > 0 ? db : undefined,
    varietyRows,
  }
}

async function parseJsonError(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    if (body && typeof body === 'object' && 'error' in body) {
      const e = (body as { error?: string; details?: string }).error
      const d = (body as { details?: string }).details
      if (e) return d ? `${e}（${d}）` : e
    }
  } catch {
    /* ignore */
  }
  return `列表请求失败 ${res.status}`
}

/** GET /api/scquery/enterprises，与 Web SCQuery 一致 */
export async function fetchScEnterpriseList(
  q: ScEnterpriseListQuery = {},
): Promise<{
  rows: LicenseRow[]
  total: number
  page: number
  pageSize: number
  dataSource?: string
}> {
  const base = enterprisesListUrl()
  if (!base) {
    throw new Error('未配置 VITE_API_BASE_URL、VITE_SCQUERY_API_BASE 或 VITE_SC_API_BASE')
  }
  const url = appendQuery(base, q)

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(await parseJsonError(res))
  }

  const body: unknown = await res.json()
  const { list, total, page, pageSize, dataSource } = unwrapEnterpriseList(body)
  const rows: LicenseRow[] = []
  for (const item of list) {
    const row = mapScQueryRecordToLicenseRow(item)
    if (row) rows.push(row)
  }
  return { rows, total, page, pageSize, dataSource }
}

/** 兼容旧名：等价于 fetchScEnterpriseList({}) */
export async function fetchScLicenseRowsFromApi(): Promise<LicenseRow[]> {
  const { rows } = await fetchScEnterpriseList({})
  return rows
}

/** GET /api/scquery/categories → string[] */
export async function fetchScQueryCategories(): Promise<string[]> {
  const p = getScQueryPrefixUrl()
  if (!p) throw new Error('未配置 API')
  const res = await fetch(`${p.replace(/\/+$/, '')}/categories`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`categories ${res.status}`)
  const body: unknown = await res.json()
  return Array.isArray(body) ? (body as string[]).filter((x) => typeof x === 'string') : []
}

/** GET /api/scquery/authorities → string[] */
export async function fetchScQueryAuthorities(): Promise<string[]> {
  const p = getScQueryPrefixUrl()
  if (!p) throw new Error('未配置 API')
  const res = await fetch(`${p.replace(/\/+$/, '')}/authorities`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`authorities ${res.status}`)
  const body: unknown = await res.json()
  return Array.isArray(body) ? (body as string[]).filter((x) => typeof x === 'string') : []
}

/** 把页面上的筛选枚举映射为接口 Query */
export function buildEnterpriseQueryFromUi(opts: {
  searchText: string
  filterFood: string
  filterAuthority: string
  filterPhone: 'all' | 'has' | 'none'
  filterContact: 'all' | '已联系' | '未联系'
  filterRemark: 'all' | 'has' | 'none'
  page?: number
  pageSize?: number
}): ScEnterpriseListQuery {
  const phoneFilter: ScEnterpriseListQuery['phoneFilter'] =
    opts.filterPhone === 'has' ? 'hasPhone' : opts.filterPhone === 'none' ? 'noPhone' : 'all'

  let contactStatus: ScEnterpriseListQuery['contactStatus'] = 'all'
  if (opts.filterContact === '已联系') contactStatus = 'contacted'
  else if (opts.filterContact === '未联系') contactStatus = 'uncontacted'

  const noteStatus: ScEnterpriseListQuery['noteStatus'] =
    opts.filterRemark === 'has' ? 'hasNote' : opts.filterRemark === 'none' ? 'noNote' : 'all'

  return {
    searchText: opts.searchText.trim() || undefined,
    categories: opts.filterFood.trim() || undefined,
    authority: opts.filterAuthority.trim() || undefined,
    phoneFilter,
    contactStatus,
    noteStatus,
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? defaultPageSize(),
  }
}
