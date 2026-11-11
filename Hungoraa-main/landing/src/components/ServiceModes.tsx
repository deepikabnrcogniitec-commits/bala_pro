import { useStaggerReveal, useRevealSelf } from '../hooks/useReveal'
import { IconArrowRight, IconCalendar, IconCheck, IconClock, IconFork, IconPin, IconTag } from './Icons'
import takeawayBox from '../assets/takeaway-box.jpg'
import takeawayBag from '../assets/takeaway-bag.jpg'
import './ServiceModes.css'

const U = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?w=${w}&q=74&auto=format&fit=crop&crop=entropy`

const modes = [
  {
    key: 'dine',
    icon: IconFork,
    eyebrow: 'Dine in',
    title: 'Book the table, skip the wait.',
    body: 'Pick a restaurant, lock your table for 5 minutes and walk in to a seat that is already yours. Split the bill at the end in one tap.',
    points: [
      { icon: IconCalendar, text: 'Reserve any time slot' },
      { icon: IconTag, text: 'Best offer applied automatically' },
      { icon: IconCheck, text: 'Split the bill your way' },
    ],
    cta: 'Reserve a table',
    main: { src: U('photo-1517248135467-4c7edcad34c4'), alt: 'A warmly lit restaurant dining room with tables laid out' },
    inset: { src: U('photo-1414235077428-338989a2e8c0', 420), alt: 'A plated starter on a candle-lit table' },
  },
  {
    key: 'take',
    icon: IconPin,
    eyebrow: 'Take away',
    title: 'Order ahead, grab and go.',
    body: 'Choose your dishes in the app, pay once and pick them up hot when they are ready — no queue at the counter, no guessing.',
    points: [
      { icon: IconClock, text: 'Ready when you arrive' },
      { icon: IconTag, text: 'Same offers as dine in' },
      { icon: IconCheck, text: 'Pay in the app, just collect' },
    ],
    cta: 'Order for pickup',
    main: { src: takeawayBox, alt: 'A burger and fries packed in a kraft takeaway box' },
    inset: { src: takeawayBag, alt: 'A paper takeaway bag with a food container ready for pickup' },
  },
]

export default function ServiceModes() {
  const headRef = useRevealSelf<HTMLDivElement>()
  const gridRef = useStaggerReveal<HTMLDivElement>({ stagger: 0.14 })

  return (
    <section id="ways" className="section band modes">
      <div className="display-head" ref={headRef}>
        <span className="display-tag">How Do You Want to Dine?</span>
        <h2 className="display-title">
          Sit down, or
          <span className="display-title-accent">take it with you.</span>
        </h2>
        <span className="display-rule" aria-hidden="true" />
        <p className="display-lead">
          Whether you want a table for the evening or dinner in a bag, it all happens in one app.
        </p>
      </div>

      <div className="modes__grid" ref={gridRef}>
        {modes.map(({ key, icon: Icon, eyebrow, title, body, points, cta, main, inset }) => (
          <article key={key} className={`mode mode--${key}`}>
            <div className="mode__media">
              <img
                className="mode__img"
                src={main.src}
                alt={main.alt}
                loading="lazy"
                decoding="async"
                width={900}
                height={600}
              />
              <img
                className="mode__inset"
                src={inset.src}
                alt={inset.alt}
                loading="lazy"
                decoding="async"
                width={210}
                height={210}
              />
              <span className="mode__badge mono">
                <Icon size={15} />
                {eyebrow}
              </span>
            </div>

            <div className="mode__body">
              <h3>{title}</h3>
              <p>{body}</p>
              <ul className="mode__points">
                {points.map(({ icon: PIcon, text }) => (
                  <li key={text}>
                    <PIcon size={16} />
                    {text}
                  </li>
                ))}
              </ul>
              <a href="#download" className="mode__cta">
                {cta} <IconArrowRight size={15} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
