import type { FoodVarietyRow, LicenseDetailDb } from './licenseDetailModel'

export type LicenseRow = {
  /** 中台表主键（TEXT），与 :id 路径段一致；node-pg 多为字符串 */
  enterpriseId?: string
  contactStatus: string
  companyName: string
  companyShort: string
  brandAccent: string
  bizTag: string
  licenseNo: string
  issueDate: string
  validPeriod: string
  authority: string
  phone: string
  remark: string
  creditCode: string
  legalRep: string
  productionAddress: string
  residence: string
  foodCategory: string
  validPeriodRaw: string
  issueTime: string
  publicPhone: string
  db?: LicenseDetailDb
  varietyRows?: FoodVarietyRow[]
}
