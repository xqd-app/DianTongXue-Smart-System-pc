/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 智慧中台 API 根（与 Web 一致），常含 /api，如 https://oa.diantongxue.com/api 或同源 /api。
   * SC 列表：GET ${VITE_API_BASE_URL}/scquery/enterprises
   */
  readonly VITE_API_BASE_URL?: string
  /**
   * 列表每页条数（默认 100，最大 500），对应 enterprises 的 pageSize。
   */
  readonly VITE_SCQUERY_PAGE_SIZE?: string
  /**
   * 站点根（不含 /api），如 https://oa.diantongxue.com；请求 ${VITE_SC_API_BASE}/api/scquery/...
   * 与 VITE_API_BASE_URL 二选一即可，优先使用 VITE_API_BASE_URL。
   */
  readonly VITE_SC_API_BASE?: string
  /**
   * 完整 SC 前缀（不含 /enterprises），如 /api/scquery 或 https://域名/api/scquery。
   */
  readonly VITE_SCQUERY_API_BASE?: string
  /**
   * 登录接口路径（相对 VITE_API_BASE_URL），默认 auth/login → POST /api/auth/login
   */
  readonly VITE_LOGIN_PATH?: string
  /** 请求签名密钥，须与服务器 SIGN_SECRET 一致 */
  readonly VITE_SIGN_SECRET?: string
  /** 响应体 AES 密钥，须与服务器一致；仅当接口返回 encrypted 包时需要 */
  readonly VITE_RESPONSE_ENCRYPTION_KEY?: string
  /**
   * 为 true/1/yes 时跳过登录页，直接进入首页（仅建议本地 .env）
   */
  readonly VITE_SKIP_LOGIN?: string
  /** 跳过登录时顶栏展示名，默认「访客」 */
  readonly VITE_SKIP_LOGIN_DISPLAY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
