import { useEffect, useRef } from 'react'

type RevealOptions = {
  /** seconds between each child */
  stagger?: number
  /** viewport rootMargin bottom trigger */
  start?: string
  /** unused legacy knobs kept for call-site compatibility */
  y?: number
  duration?: number
}

const io = (cb: (el: Element) => void, rootMargin: string) =>
  new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          cb(e.target)
          obs.unobserve(e.target)
        }
      })
    },
    { rootMargin, threshold: 0.05 },
  )

/** Reveals each direct child of the returned ref as it scrolls into view, with a stagger. */
export function useStaggerReveal<T extends HTMLElement>({ stagger = 0.09, start = '0px 0px -12% 0px' }: RevealOptions = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const kids = Array.from(el.children) as HTMLElement[]
    kids.forEach((k, i) => {
      k.classList.add('reveal')
      k.style.transitionDelay = `${i * stagger}s`
    })
    const obs = io((t) => t.classList.add('is-in'), start)
    kids.forEach((k) => obs.observe(k))
    return () => obs.disconnect()
  }, [stagger, start])

  return ref
}

/** Reveals the returned element itself as it scrolls into view. */
export function useRevealSelf<T extends HTMLElement>({ start = '0px 0px -10% 0px' }: RevealOptions = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.add('reveal')
    const obs = io((t) => t.classList.add('is-in'), start)
    obs.observe(el)
    return () => obs.disconnect()
  }, [start])

  return ref
}
