import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useRevealSelf } from '../hooks/useReveal'
import { IconApple, IconCheck, IconPin, IconPlay, IconQr, IconStar, IconTag } from './Icons'
import './AppDownload.css'

export default function AppDownload() {
  const ref = useRevealSelf<HTMLDivElement>()
  const sceneRef = useRef<HTMLDivElement>(null)
  const rigRef = useRef<HTMLDivElement>(null)

  // mouse-driven tilt of the whole 3D rig; eases back to rest on leave
  useEffect(() => {
    const scene = sceneRef.current
    const rig = rigRef.current
    if (!scene || !rig || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(hover: hover)').matches) return

    const rotY = gsap.quickTo(rig, 'rotationY', { duration: 0.9, ease: 'power3.out' })
    const rotX = gsap.quickTo(rig, 'rotationX', { duration: 0.9, ease: 'power3.out' })
    const panel = scene.closest('.download__panel') as HTMLElement | null
    const target = panel ?? scene

    const move = (e: MouseEvent) => {
      const r = target.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width - 0.5
      const ny = (e.clientY - r.top) / r.height - 0.5
      rotY(-18 + nx * 26)
      rotX(10 - ny * 18)
    }
    const leave = () => {
      rotY(-18)
      rotX(10)
    }
    gsap.set(rig, { rotationY: -18, rotationX: 10 })
    target.addEventListener('mousemove', move)
    target.addEventListener('mouseleave', leave)
    return () => {
      target.removeEventListener('mousemove', move)
      target.removeEventListener('mouseleave', leave)
    }
  }, [])

  return (
    <section id="download" className="section band download">
      <div className="download__panel panel--raised panel ticks" ref={ref}>
        <div className="download__glow" />
        <div className="download__grid" aria-hidden="true" />
        <div className="download__copy">
          <span className="eyebrow">Get the app</span>
          <h2>
            Your table is one <span className="accent">tap</span> away.
          </h2>
          <p>
            On iOS and Android. Scan the code or grab it from your store to start reserving, unlocking
            offers, and settling bills in seconds.
          </p>
          <div className="download__badges">
            <a href="#" className="download__badge">
              <IconApple size={20} />
              <span>Download on the <strong>App Store</strong></span>
            </a>
            <a href="#" className="download__badge">
              <IconPlay size={18} />
              <span>Get it on <strong>Google Play</strong></span>
            </a>
          </div>
        </div>

        <div className="download__scene" ref={sceneRef} aria-hidden="true">
          <div className="download__floor" />
          <div className="download__float">
            <div className="download__rig" ref={rigRef}>
              {/* phone: back slab + front face give it real thickness when tilted */}
              <div className="phone">
                <div className="phone__back" />
                <div className="phone__side" />
                <div className="phone__face">
                  <div className="phone__island" />
                  <div className="phone__screen">
                    <div className="scr__top">
                      <span className="scr__brand">Hungora</span>
                      <span className="scr__loc">
                        <IconPin size={11} /> Chennai
                      </span>
                    </div>
                    <div className="scr__hero">
                      <span className="scr__tag">Tonight</span>
                      <strong>The Brass Table</strong>
                      <span className="scr__meta">
                        <IconStar size={10} /> 4.8 · Modern Indian
                      </span>
                    </div>
                    <div className="scr__slots">
                      <span>7:00</span>
                      <span className="is-on">8:00</span>
                      <span>8:30</span>
                      <span>9:00</span>
                    </div>
                    <div className="scr__row">
                      <span>Guests</span>
                      <strong>2 people</strong>
                    </div>
                    <div className="scr__row scr__row--save">
                      <span>Best price applied</span>
                      <strong>−25%</strong>
                    </div>
                    <div className="scr__cta">Reserve table</div>
                  </div>
                  <div className="phone__glare" />
                </div>
              </div>

              {/* floating cards at different depths */}
              <div className="chip chip--confirm">
                <span className="chip__icon chip__icon--ok">
                  <IconCheck size={14} />
                </span>
                <span>
                  <strong>Table confirmed</strong>
                  <small>Tonight · 8:00 PM</small>
                </span>
              </div>
              <div className="chip chip--offer">
                <span className="chip__icon">
                  <IconTag size={14} />
                </span>
                <span>
                  <strong>25% off</strong>
                  <small>Auto-applied</small>
                </span>
              </div>
              <div className="chip chip--qr">
                <IconQr size={64} />
                <small>Scan to download</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
