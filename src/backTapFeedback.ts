/**
 * 返回、关闭、取消等「退出当前层」操作的统一触觉反馈（支持时短振），
 * 便于与 CSS 按压动效叠加，手感一致。
 */
export function backTapFeedback(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(6)
  } catch {
    /* 部分 WebView 禁用 vibrate */
  }
}

export function withBackTap(action: () => void): void {
  backTapFeedback()
  action()
}
