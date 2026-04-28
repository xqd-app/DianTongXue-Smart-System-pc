import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

export type DetailScrollTabItem = { key: string; title: string }

/** 独立页分区 Tab 增高后可略调大，便于滚动区与 Tab 对齐估算 */
const TAB_BAR_HEIGHT_PX = 52
const SCROLL_THROTTLE_MS = 100

function throttleScroll(handler: () => void, wait: number) {
  let last = 0
  let trailing: ReturnType<typeof setTimeout> | null = null
  return () => {
    const now = Date.now()
    const run = () => {
      last = Date.now()
      handler()
    }
    if (now - last >= wait) {
      if (trailing) {
        clearTimeout(trailing)
        trailing = null
      }
      run()
      return
    }
    if (!trailing) {
      trailing = setTimeout(() => {
        trailing = null
        run()
      }, wait - (now - last))
    }
  }
}

/** Tab 可在滚动区外（如工具栏下），优先从同卡片 .dian-sc-detail-panel 内查找 */
function findDetailStickyTabBar(scrollContainer: HTMLElement): HTMLElement | null {
  const panel = scrollContainer.closest('.dian-sc-detail-panel')
  return (
    (panel?.querySelector('.dian-sc-detail-sticky-tabs') as HTMLElement | null) ??
    (scrollContainer.querySelector('.dian-sc-detail-sticky-tabs') as HTMLElement | null)
  )
}

function measureStickyTabBarHeight(container: HTMLElement, fallback: number): number {
  const tabBar = findDetailStickyTabBar(container)
  if (!tabBar) return fallback
  const rect = tabBar.getBoundingClientRect()
  const mb = parseFloat(getComputedStyle(tabBar).marginBottom) || 0
  const h = Math.ceil(rect.height + mb)
  return h > 0 ? h : fallback
}

function tabBarAlignViewportY(container: HTMLElement, tabBarHeightFallback: number): number {
  const tabBar = findDetailStickyTabBar(container)
  if (tabBar) {
    const tr = tabBar.getBoundingClientRect()
    const mb = parseFloat(getComputedStyle(tabBar).marginBottom) || 0
    return tr.bottom + mb
  }
  const cRect = container.getBoundingClientRect()
  const th = measureStickyTabBarHeight(container, tabBarHeightFallback)
  return cRect.top + th
}

/** 将目标滚到分区 Tab 条下方（Tab 可在滚动区外） */
export function scrollDetailToAnchor(
  container: HTMLElement,
  target: HTMLElement,
  tabBarHeightFallback: number,
): void {
  const tRect = target.getBoundingClientRect()
  const alignY = tabBarAlignViewportY(container, tabBarHeightFallback)
  const nextTop = container.scrollTop + (tRect.top - alignY)
  const top = Math.max(0, nextTop)
  container.scrollTo({
    top,
    behavior: 'smooth',
  })
  /* 部分 WebView 对子元素 smooth 支持差，下一帧再写一次确保到位 */
  window.requestAnimationFrame(() => {
    if (Math.abs(container.scrollTop - top) > 2) {
      container.scrollTop = top
    }
  })
}

export function useDetailScrollTabs(
  scrollEl: HTMLElement | null,
  items: DetailScrollTabItem[],
  tabBarHeightPx: number = TAB_BAR_HEIGHT_PX,
): {
  activeKey: string
  setActiveKey: (k: string) => void
  onTabChange: (key: string) => void
  tabBarHeightPx: number
  suppressNextScrollSyncRef: MutableRefObject<number>
} {
  const [activeKey, setActiveKey] = useState(() => items[0]?.key ?? '')
  const suppressNextScrollSyncRef = useRef(0)

  useEffect(() => {
    if (items.length && !items.some((x) => x.key === activeKey)) {
      setActiveKey(items[0].key)
    }
  }, [items, activeKey])

  const detectActive = useCallback(() => {
    if (!scrollEl || items.length === 0) return
    if (Date.now() < suppressNextScrollSyncRef.current) return

    const lineY = tabBarAlignViewportY(scrollEl, tabBarHeightPx)
    let current = items[0].key
    for (const it of items) {
      const el = document.getElementById(`dian-sc-detail-anchor-${it.key}`)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top <= lineY) current = it.key
      else break
    }
    setActiveKey((prev) => (prev === current ? prev : current))
  }, [scrollEl, items, tabBarHeightPx])

  useEffect(() => {
    if (!scrollEl || items.length < 2) return undefined
    const throttled = throttleScroll(detectActive, SCROLL_THROTTLE_MS)
    scrollEl.addEventListener('scroll', throttled, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(throttled) : null
    ro?.observe(scrollEl)
    const tabBar = findDetailStickyTabBar(scrollEl)
    if (tabBar) ro?.observe(tabBar)
    window.addEventListener('resize', throttled)
    throttled()
    return () => {
      scrollEl.removeEventListener('scroll', throttled)
      window.removeEventListener('resize', throttled)
      ro?.disconnect()
    }
  }, [scrollEl, items.length, detectActive])

  const onTabChange = useCallback(
    (key: string) => {
      const container = scrollEl
      if (!container) return
      const el = document.getElementById(`dian-sc-detail-anchor-${key}`)
      if (!el) return
      suppressNextScrollSyncRef.current = Date.now() + 480
      setActiveKey(key)
      scrollDetailToAnchor(container, el, tabBarHeightPx)
    },
    [scrollEl, tabBarHeightPx],
  )

  return {
    activeKey: items.length ? activeKey : '',
    setActiveKey,
    onTabChange,
    tabBarHeightPx,
    suppressNextScrollSyncRef,
  }
}
