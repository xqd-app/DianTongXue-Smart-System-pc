import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** 与 Vite base 一致：根路径为 "/"，子路径须以 / 结尾，如 "/mobile/" */
function normalizePublicBase(input: string | undefined): string {
  const fallback = '/mobile/'
  if (input === undefined) return fallback
  let s = input.trim()
  if (s === '') return fallback
  if (!s.startsWith('/')) s = `/${s}`
  if (s === '/') return '/'
  return s.endsWith('/') ? s : `${s}/`
}

// https://vite.dev/config/
// 默认 base=/mobile/：整份 dist 须挂在站点路径 /mobile/（index.html 与 assets/ 同级）。
// 若 dist 放在域名根目录，构建前设置 VITE_BASE_PATH=/
// （否则请求 /mobile/assets/*.js 会 404，Nginx 回退 index.html → MIME type 报错）
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizePublicBase(env.VITE_BASE_PATH)

  const v = env.VITE_SKIP_LOGIN?.trim().toLowerCase()
  const explicitOn = v === 'true' || v === '1' || v === 'yes'
  const explicitOff = v === 'false' || v === '0' || v === 'no'
  // 生产构建绝不通过 define 注入跳过登录（上传服务器须走登录页）
  // 开发模式默认跳过登录，避免依赖 .env.local（工作区路径含中文时，部分版本 Cursor 无法打开该文件）
  const injectSkipLogin =
    mode !== 'production' && (explicitOn || (mode === 'development' && !explicitOff))

  return {
    base,
    ...(injectSkipLogin
      ? { define: { 'import.meta.env.VITE_SKIP_LOGIN': JSON.stringify('true') } }
      : {}),
    plugins: [react()],
    // 微信内置 WebView（尤其旧版 Android）对过新的 ES 语法支持差，整包解析失败会白屏
    build: {
      target: ['es2015', 'chrome87', 'edge88', 'safari14', 'ios14'],
      cssTarget: 'chrome61',
    },
    server: {
      proxy: {
        // 设置 VITE_API_BASE_URL=/api 或 VITE_SCQUERY_API_BASE=/api/scquery 时，将 /api 转发到中台（端口按本机修改）
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
