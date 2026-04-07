import { useCallback, useEffect, useState } from 'react'

type Variant = 'standalone' | 'aboveTabbar'
type Align = 'left' | 'right'

type Props =
  | {
      target: 'window'
      variant?: Variant
      align?: Align
      threshold?: number
    }
  | {
      target: 'element'
      scrollEl: HTMLElement | null
      variant?: Variant
      align?: Align
      threshold?: number
    }

const DEFAULT_THRESHOLD = 200

export function ScrollToTopFab(props: Props) {
  const threshold = props.threshold ?? DEFAULT_THRESHOLD
  const variant = props.variant ?? 'standalone'
  const align = props.align ?? 'right'
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (props.target === 'window') {
      const onScroll = () => setVisible(window.scrollY > threshold)
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }
    const el = props.scrollEl
    if (!el) {
      setVisible(false)
      return
    }
    const onScroll = () => setVisible(el.scrollTop > threshold)
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [props.target, props.target === 'element' ? props.scrollEl : undefined, threshold])

  const scrollEl = props.target === 'element' ? props.scrollEl : null
  const onClick = useCallback(() => {
    if (props.target === 'window') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    scrollEl?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [props.target, scrollEl])

  if (!visible) return null

  const cls = [
    'dian-scroll-to-top-fab',
    variant === 'aboveTabbar' ? 'dian-scroll-to-top-fab--above-tabbar' : '',
    align === 'left' ? 'dian-scroll-to-top-fab--align-left' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={cls} onClick={onClick} aria-label="回到顶部">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M12 19V5M12 5l-6 6M12 5l6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
