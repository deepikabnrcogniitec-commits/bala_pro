import type { MouseEvent } from 'react'
import { useStaggerReveal } from '../hooks/useReveal'
import { IconBolt, IconCalendar, IconReceipt, IconShield, IconTag, IconWallet } from './Icons'
import './Features.css'

const features = [
  {
    icon: IconCalendar,
    title: 'Instant table holds',
    body: 'Reserve a table and we lock it for 5 minutes while payment confirms — you never lose a booking to a slow queue. The whole hold-to-seated flow runs in real time, so you always know exactly where your table stands.',
    tag: '5-minute lock',
    span: 'feature-card--lg',
  },
  {
    icon: IconTag,
    title: 'Smart offer stacking',
    body: 'Restaurant, platform, and bank-funded discounts are calculated automatically so you always land the best price.',
    span: 'feature-card--wide',
  },
  {
    icon: IconReceipt,
    title: 'Split any way',
    body: 'Even split, by item, or custom shares — everyone at the table pays their part in one tap.',
    span: 'feature-card--wide',
  },
  {
    icon: IconWallet,
    title: 'Hungora Wallet',
    body: 'Top up once, pay everywhere. Refunds on cancelled bookings land back instantly.',
  },
  {
    icon: IconBolt,
    title: 'Real-time everything',
    body: 'Live booking status, offer approvals, and payment confirmations the second they happen.',
  },
  {
    icon: IconShield,
    title: 'Bank-grade security',
    body: 'Payments run on Razorpay with end-to-end encryption. Card details never touch our servers.',
  },
]

function spotlight(e: MouseEvent<HTMLDivElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
  e.currentTarget.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
}

export default function Features() {
  const ref = useStaggerReveal<HTMLDivElement>({ stagger: 0.07 })

  return (
    <section id="features" className="section band features">
      <div className="display-head">
        <span className="display-tag">Features</span>
        <h2 className="display-title">
          Everything a table needs,
          <span className="display-title-accent">built in.</span>
        </h2>
        <span className="display-rule" aria-hidden="true" />
        <p className="display-lead">One platform for the entire dine-in journey — from booking to settlement.</p>
      </div>

      <div className="features__grid" ref={ref}>
        {features.map(({ icon: Icon, title, body, tag, span }, i) => (
          <div
            key={title}
            className={`feature-card panel ticks spotlight ${span ?? ''}`}
            onMouseMove={spotlight}
          >
            <span className="feature-card__index mono">{String(i + 1).padStart(2, '0')}</span>
            <span className="feature-card__icon">
              <Icon size={span === 'feature-card--lg' ? 24 : 20} />
            </span>
            {tag && <span className="feature-card__tag mono">{tag}</span>}
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
