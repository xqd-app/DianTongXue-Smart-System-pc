/** 企业跟进记录单条（本地或与后端 JSON 对齐） */
export type EnterpriseNoteEntry = {
  id: string
  savedAt: string
  text: string
  /** data URL 或服务器返回的 https URL */
  images: string[]
  /** 服务端历史条目标记有图但未内联返回时，可再请求详情拉取 */
  imageCount?: number
}
