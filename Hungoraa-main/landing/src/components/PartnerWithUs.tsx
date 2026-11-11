import { useRevealSelf, useStaggerReveal } from '../hooks/useReveal'
import { IconArrowRight, IconCalendar, IconFork, IconReceipt, IconStar, IconTag, IconUsers } from './Icons'
import './PartnerWithUs.css'

/** Where "Become a partner" sends people — swap for the real sign-up form or mailto: link. */
const PARTNER_HREF = '/contact'

const cafe = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1000&q=74&auto=format&fit=crop'

const steps = [
  ['Apply', 'Tell us about your restaurant — it takes a few minutes.'],
  ['Set up', 'Add your menu, tables and the offers you want to run.'],
  ['Go live', 'Guests start booking. You watch it happen in real time.'],
]

const tools = [
  { icon: IconCalendar, title: 'Live bookings', body: 'See every reservation the moment it is confirmed, with guest and table details.' },
  { icon: IconUsers, title: 'Table management', body: 'Set up your floor, seating and slots so the right tables fill at the right times.' },
  { icon: IconFork, title: 'Menu & pricing', body: 'You control your menu and prices. Guests pay the real menu price, nothing inflated.' },
  { icon: IconTag, title: 'Offers you control', body: 'Run your own discounts and see how they perform before you commit to more.' },
  { icon: IconStar, title: 'Reviews', body: 'Read what guests say after they dine and build your reputation on real feedback.' },
  { icon: IconReceipt, title: 'Reports & settlements', body: 'Clear invoices and settlement reports, with a fair, low-commission model.' },
]

export default function PartnerWithUs() {
  const cardRef = useRevealSelf<HTMLDivElement>()
  const toolsRef = useStaggerReveal<HTMLDivElement>({ stagger: 0.07 })

  return (
    <section id="partner" className="section band partner">
      <div className="partner__card" ref={cardRef}>
        <div className="partner__copy">
          <span className="eyebrow partner__eyebrow">Partner with us</span>
          <h2>
            More guests at your tables. <span>Full control of your restaurant.</span>
          </h2>
          <p>
            Join the restaurants already filling their tables through Hungora. A fair, low-commission model, more
            visibility, and you stay in charge of your pricing, brand and guest experience.
          </p>

          <ol className="partner__steps">
            {steps.map(([title, body], i) => (
              <li key={title}>
                <span className="partner__step-num mono">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </div>
              </li>
            ))}
          </ol>

          <a href={PARTNER_HREF} className="btn btn-primary partner__cta">
            Become a partner <IconArrowRight size={16} />
          </a>
        </div>

        <div className="partner__media">
          <img
            src={cafe}
            alt="A busy restaurant floor with guests seated at wooden tables"
            loading="lazy"
            decoding="async"
            width={1000}
            height={1000}
          />
          <span className="partner__chip mono">
            <IconCalendar size={14} /> New booking confirmed
          </span>
        </div>
      </div>

      <div className="partner__tools" ref={toolsRef}>
        {tools.map(({ icon: Icon, title, body }) => (
          <div className="partner__tool panel" key={title}>
            <span className="chip-icon partner__tool-icon">
              <Icon size={20} />
            </span>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
