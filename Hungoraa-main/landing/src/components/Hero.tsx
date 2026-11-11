import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { IconArrowRight } from './Icons'
import { DEFAULT_BANNER, useHeroBanner } from '../hooks/useHeroBanner'
import './Hero.css'

// Looping background video (no audio). Small screens get the lighter 720p encode.
const HERO_POSTER = '/hero-poster.jpg'
const heroVideoSrc = () =>
  window.matchMedia('(max-width: 900px)').matches ? '/hero-loop-720.mp4' : '/hero-loop.mp4'

const TITLE_LINES =['Good Food.', 'Great Moments.', 'Together.']
const TITLE_TOTAL = TITLE_LINES.reduce((n, l) => n + l.length, 0)

/** Types the headline in letter by letter, holds, erases it, and loops. */
function useTypewriter(total: number) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(total)
      return
    }
    let n = 0
    let dir = 1
    let timer: number
    const tick = () => {
      n += dir
      setCount(n)
      let delay = dir === 1 ? 85 : 35
      if (n >= total) {
        dir = -1
        delay = 2600
      } else if (n <= 0) {
        dir = 1
        delay = 700
      }
      timer = window.setTimeout(tick, delay)
    }
    timer = window.setTimeout(tick, 900)
    return () => window.clearTimeout(timer)
  }, [total])

  return count
}

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null)
  const typed = useTypewriter(TITLE_TOTAL)
  const banner = useHeroBanner()
  const [bannerSrc, setBannerSrc] = useState<string | null>(null)
  const [bannerLoaded, setBannerLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc] = useState(heroVideoSrc)
  const [videoReady, setVideoReady] = useState(false)
  // Reduced-motion visitors, or a video that fails to load, fall back to the banner image.
  const [useVideo, setUseVideo] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  // Only spend CPU/battery on the video while the hero is actually on screen.
  useEffect(() => {
    const video = videoRef.current
    const root = rootRef.current
    if (!useVideo || !video || !root) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {})
      else video.pause()
    })
    io.observe(root)
    return () => io.disconnect()
  }, [useVideo])

  // Swap in a new URL (admin changed it since the cached one) with a fresh fade-in.
  useEffect(() => {
    if (banner && banner !== bannerSrc) {
      setBannerSrc(banner)
      setBannerLoaded(false)
    }
  }, [banner]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } })
      tl.from('.hero__subtitle', { opacity: 0, y: 16 }, 0.5)
        .from('.hero__actions > *', { opacity: 0, y: 16, stagger: 0.08 }, '-=0.5')
    }, rootRef)

    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const update = () => {
      raf = 0
      root.style.setProperty('--hp', String(Math.min(window.scrollY, window.innerHeight)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section id="top" className="hero" ref={rootRef}>
      <div className="hero__bg" aria-hidden="true">
        {useVideo ? (
          <video
            ref={videoRef}
            className={`hero__banner${videoReady ? ' is-loaded' : ''}`}
            src={videoSrc}
            poster={HERO_POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onLoadedData={() => setVideoReady(true)}
            onError={() => setUseVideo(false)}
          />
        ) : bannerSrc && (
          <img
            key={bannerSrc}
            className={`hero__banner${bannerLoaded ? ' is-loaded' : ''}`}
            src={bannerSrc}
            alt=""
            loading="eager"
            fetchPriority="high"
            onLoad={() => setBannerLoaded(true)}
            onError={() => bannerSrc !== DEFAULT_BANNER && setBannerSrc(DEFAULT_BANNER)}
          />
        )}
      </div>

      <div className="hero__inner">
        <div className="hero__copy">
          <h1 className="hero__title" aria-label={TITLE_LINES.join(' ')}>
            {TITLE_LINES.map((text, i) => {
              const offset = TITLE_LINES.slice(0, i).reduce((n, l) => n + l.length, 0)
              const shown = Math.min(Math.max(typed - offset, 0), text.length)
              const hasCaret = typed > offset ? typed <= offset + text.length : i === 0
              return (
                <span className="line" key={text} aria-hidden="true">
                  <span className={i === TITLE_LINES.length - 1 ? 'hero__title-accent' : undefined}>
                    {text.slice(0, shown)}
                  </span>
                  {hasCaret && <span className="hero__caret" />}
                  <span className="hero__ghost">{text.slice(shown)}</span>
                </span>
              )
            })}
          </h1>

          <p className="hero__subtitle">
            Discover restaurants, reserve your table,
            <br />
            and enjoy genuine value.
          </p>

          <div className="hero__actions">
            <a href="#download" className="btn hero__btn-outline">
              Get the app <IconArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
