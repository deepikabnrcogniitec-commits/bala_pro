import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useStaggerReveal } from '../hooks/useReveal'
import { IconCalendar, IconCompass, IconSparkle } from './Icons'
import './HowItWorks.css'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  {
    icon: IconCompass,
    step: '01',
    title: 'Discover',
    meta: 'Curated & filtered',
    points: [
      {
        label: 'Explore curated dining',
        text: 'Effortlessly browse through a handpicked selection of top-tier restaurants, hidden gems, and local favorites tailored to your exact cravings and mood.',
      },
      {
        label: 'Smart filtering',
        text: 'Find dining spots based on ambiance, cuisine type, specific dietary preferences, and exclusive offers.',
      },
    ],
  },
  {
    icon: IconCalendar,
    step: '02',
    title: 'Reserve / Dine-in',
    meta: 'A few taps',
    points: [
      {
        label: 'Instant table booking',
        text: 'Secure your preferred table in just a few taps without the hassle of waiting in long lines or making phone calls.',
      },
      {
        label: 'Seamless scheduling',
        text: 'Choose your exact dining time, select your seating preference, and customize your reservation to match any special occasion.',
      },
    ],
  },
  {
    icon: IconSparkle,
    step: '03',
    title: 'Enjoy',
    meta: 'Best price, locked',
    points: [
      {
        label: 'Elevated experience',
        text: 'Step into your chosen restaurant with your table ready and waiting for an unforgettable meal.',
      },
      {
        label: 'Built-in benefits',
        text: 'Restaurant, platform and bank-funded discounts are calculated automatically — locking in your best, lowest price instantly.',
      },
      {
        label: 'Genuine value',
        text: 'Savor delicious food and create great moments while unlocking exclusive savings and flat-fee benefits.',
      },
    ],
  },
]

export default function HowItWorks() {
  const rootRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const stepsRef = useStaggerReveal<HTMLDivElement>({ stagger: 0.14 })

  useEffect(() => {
    const el = lineRef.current
    if (!el) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scaleY: 0 },
        {
          scaleY: 1,
          transformOrigin: 'top center',
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, start: 'top 62%', end: 'bottom 78%', scrub: 0.6 },
        },
      )
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <section id="how-it-works" className="section band how" ref={rootRef}>
      <div className="display-head">
        <span className="display-tag">How it works</span>
        <h2 className="display-title">
          Discover, reserve, enjoy —
          <span className="display-title-accent">three simple steps.</span>
        </h2>
        <span className="display-rule" aria-hidden="true" />
        <p className="display-lead">No long queues. No phone calls. Your best price, locked in automatically.</p>
      </div>

      <div className="how__timeline">
        <div className="how__rail" aria-hidden="true">
          <div className="how__rail-fill" ref={lineRef} />
        </div>

        <div className="how__steps" ref={stepsRef}>
          {steps.map(({ icon: Icon, step, title, meta, points }) => (
            <div className="how__step" key={step}>
              <div className="how__node" aria-hidden="true">
                <span className="how__node-num mono">{step}</span>
              </div>
              <div className="how__card panel ticks spotlight" onMouseMove={spotlight}>
                <div className="how__card-top">
                  <span className="how__card-icon">
                    <Icon size={20} />
                  </span>
                  <span className="how__card-meta mono">{meta}</span>
                </div>
                <h3>{title}</h3>
                <ul className="how__points">
                  {points.map(({ label, text }) => (
                    <li key={label}>
                      <strong>{label}</strong>
                      <p>{text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function spotlight(e: React.MouseEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}
