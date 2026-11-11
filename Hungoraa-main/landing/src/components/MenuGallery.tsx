import { useEffect, useRef } from 'react'
import { useRevealSelf } from '../hooks/useReveal'
import { IconArrowRight } from './Icons'
import './MenuGallery.css'

type Dish = { img: string; name: string; cuisine: string; price: string }

const U = (id: string) => `https://images.unsplash.com/${id}?w=640&q=72&auto=format&fit=crop&crop=entropy`

const dishes: Dish[] = [
  { img: 'photo-1741376509166-cbd74b608f5a', name: 'Idli & filter coffee', cuisine: 'Tamil Nadu', price: '₹110' },
  { img: 'photo-1668236543090-82eba5ee5976', name: 'Ghee roast dosa', cuisine: 'Karnataka', price: '₹150' },
  { img: 'photo-1756757077703-26dc3ba7e853', name: 'Medu vada', cuisine: 'Tamil Nadu', price: '₹80' },
  { img: 'photo-1691171047312-d809eccef46d', name: 'Hyderabadi dum biryani', cuisine: 'Hyderabad', price: '₹380' },
  { img: 'photo-1625398407796-82650a8c135f', name: 'Banana leaf meals', cuisine: 'Tamil Nadu', price: '₹220' },
  { img: 'photo-1743517894265-c86ab035adef', name: 'Paper masala dosa', cuisine: 'Karnataka', price: '₹160' },
  { img: 'photo-1736239092023-ba677fd6751c', name: 'Kerala sadya', cuisine: 'Kerala', price: '₹350' },
  { img: 'photo-1657196118354-f25f29fe636d', name: 'Kuzhi paniyaram', cuisine: 'Chettinad', price: '₹120' },
  { img: 'photo-1742281257687-092746ad6021', name: 'South Indian thali', cuisine: 'Tamil Nadu', price: '₹260' },
  { img: 'photo-1683533678059-63c6a0e9e3ef', name: 'Masala vada', cuisine: 'Tamil Nadu', price: '₹90' },
  { img: 'photo-1691171047462-66025ecd5efc', name: 'Paneer dum biryani', cuisine: 'Hyderabad', price: '₹320' },
  { img: 'photo-1633383718081-22ac93e3db65', name: 'Curd rice', cuisine: 'Tamil Nadu', price: '₹110' },
  { img: 'photo-1542367592-8849eb950fd8', name: 'Andhra meals', cuisine: 'Andhra', price: '₹320' },
  { img: 'photo-1736239092482-e57ef9b26f15', name: 'Uttapam', cuisine: 'Tamil Nadu', price: '₹140' },
  { img: 'photo-1743615467363-250466982515', name: 'Rava dosa', cuisine: 'Karnataka', price: '₹150' },
  { img: 'photo-1691170979035-27e5ec943205', name: 'Mutton masala', cuisine: 'South Indian', price: '₹460' },
  { img: 'photo-1736239093796-68c998a84b96', name: 'Podi idli', cuisine: 'Tamil Nadu', price: '₹90' },
  { img: 'photo-1630383249896-424e482df921', name: 'Idli vada combo', cuisine: 'Tamil Nadu', price: '₹120' },
  { img: 'photo-1787024231387-edccb8c44700', name: 'Tiffin platter', cuisine: 'Tamil Nadu', price: '₹180' },
  { img: 'photo-1680359873197-c3eb21ec05c0', name: 'Mini idli sambar', cuisine: 'Tamil Nadu', price: '₹100' },
]

const DRIFT = 46 // px/s the row slides left → right on its own
const SCROLL_PULL = 1.35 // extra px the row moves per px the page scrolls
const MAX_SCALE = 1.3 // card in the middle of the screen
const MIN_SCALE = 0.74// card at the very edge

/**
 * One row that glides left → right. Every card is scaled by its distance from the centre of the
 * screen — zoom in as it arrives in the middle, zoom out as it leaves — and page scroll shoves it.
 */
function useZoomMarquee(rootRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const root = rootRef.current
    const track = root?.querySelector<HTMLElement>('.menu__track')
    if (!root || !track || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cards = Array.from(track.querySelectorAll<HTMLElement>('.dish'))

    let pos = 0
    let groupW = 1
    let centres: number[] = []
    let viewW = 1
    let lastY = window.scrollY
    let lastT = performance.now()
    let hovered = false
    let raf = 0

    const measure = () => {
      groupW = track.scrollWidth / 2
      viewW = root.clientWidth
      centres = cards.map((c) => c.offsetLeft + c.offsetWidth / 2)
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now
      const y = window.scrollY
      const dy = y - lastY
      lastY = y

      // moving right = the offset shrinks
      pos -= (hovered ? 0 : DRIFT) * dt + dy * SCROLL_PULL
      const wrapped = ((pos % groupW) + groupW) % groupW
      const x = -wrapped
      track.style.transform = `translate3d(${x}px,0,0)`

      const mid = viewW / 2
      cards.forEach((c, i) => {
        const d = Math.min(Math.abs(centres[i] + x - mid) / mid, 1.2)
        const k = Math.max(1 - d, 0)
        const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * k * k * (3 - 2 * k)
        c.style.transform = `scale(${scale.toFixed(3)})`
        c.style.opacity = (0.45 + 0.55 * k).toFixed(2)
        c.style.zIndex = String(Math.round(k * 10))
      })
    }

    const start = () => {
      if (raf) return
      measure()
      lastT = performance.now()
      lastY = window.scrollY
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
    }

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '200px 0px' })
    io.observe(root)

    const enter = () => (hovered = true)
    const leave = () => (hovered = false)
    root.addEventListener('mouseenter', enter)
    root.addEventListener('mouseleave', leave)
    window.addEventListener('resize', measure)
    // images/fonts settle after first paint
    const t = window.setTimeout(measure, 800)

    return () => {
      stop()
      io.disconnect()
      clearTimeout(t)
      root.removeEventListener('mouseenter', enter)
      root.removeEventListener('mouseleave', leave)
      window.removeEventListener('resize', measure)
    }
  }, [rootRef])
}

function Track() {
  return (
    <div className="menu__track">
      {[0, 1].map((dup) => (
        <div className="menu__group" key={dup} aria-hidden={dup === 1}>
          {dishes.map((d) => (
            <figure className="dish" key={d.name}>
              <img
                src={U(d.img)}
                alt={`${d.name} — ${d.cuisine}`}
                loading="lazy"
                decoding="async"
                width={300}
                height={210}
              />
              <figcaption className="dish__label">
                <span className="dish__name">{d.name}</span>
                <span className="dish__meta mono">
                  <span className="dish__cuisine">{d.cuisine}</span>
                  <span className="dish__price">{d.price}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function MenuGallery() {
  const headRef = useRevealSelf<HTMLDivElement>()
  const marqueeRef = useRef<HTMLDivElement>(null)
  useZoomMarquee(marqueeRef)

  return (
    <section id="menu" className="section band menu">
      <div className="display-head menu__head" ref={headRef}>
        <span className="display-tag">On the pass</span>
        <h2 className="display-title">
          Tonight, across
          <span className="display-title-accent">every kitchen.</span>
        </h2>
        <span className="display-rule" aria-hidden="true" />
        <p className="display-lead">
          A live crawl of what partner restaurants are plating right now — reserve any of them in the app.
        </p>
      </div>

      <div className="menu__marquee" ref={marqueeRef}>
        <Track />
        <div className="menu__fade menu__fade--l" />
        <div className="menu__fade menu__fade--r" />
      </div>

      <a href="#download" className="menu__cta">
        See every menu in the app <IconArrowRight size={15} />
      </a>
    </section>
  )
}
