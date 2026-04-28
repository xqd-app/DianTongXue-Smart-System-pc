import { useCallback, useRef } from 'react'

const MIN_HORIZONTAL_PX = 56
/** 水平位移需明显大于垂直位移，避免与纵向滚动冲突 */
const HORIZONTAL_VS_VERTICAL = 1.12

export function useSwipeToExit(options: {
  onExit: () => void
  disabled?: boolean
  /** touchstart 落在这些区域内的滑动不触发（如横向 Tab、表格） */
  excludeFromSelector?: string
}) {
  const { onExit, disabled, excludeFromSelector } = options
  const startRef = useRef<{
    id: number
    x: number
    y: number
    target: EventTarget | null
  } | null>(null)

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return
      const t = e.touches[0]
      if (!t) return
      startRef.current = {
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        target: e.target,
      }
    },
    [disabled],
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) {
        startRef.current = null
        return
      }
      const s = startRef.current
      startRef.current = null
      if (!s) return

      let p: React.Touch | null = null
      for (let i = 0; i < e.changedTouches.length; i++) {
        const c = e.changedTouches.item(i)
        if (c && c.identifier === s.id) {
          p = c
          break
        }
      }
      if (!p) return

      if (excludeFromSelector && s.target instanceof Element) {
        try {
          if (s.target.closest(excludeFromSelector)) return
        } catch {
          /* ignore invalid selector */
        }
      }

      const dx = p.clientX - s.x
      const dy = p.clientY - s.y
      if (Math.abs(dx) < MIN_HORIZONTAL_PX) return
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_VS_VERTICAL) return
      onExit()
    },
    [disabled, excludeFromSelector, onExit],
  )

  const onTouchCancel = useCallback(() => {
    startRef.current = null
  }, [])

  return { onTouchStart, onTouchEnd, onTouchCancel }
}
