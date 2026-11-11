import { useStaggerReveal } from '../hooks/useReveal'
import { IconStar } from './Icons'
import './Testimonials.css'

const testimonials = [
  {
    quote: 'We used to wait 15 minutes just to get the check split right. Now the whole table pays in under a minute.',
    name: 'Priya Nair',
    role: 'Regular diner · Bengaluru',
  },
  {
    quote: 'Booked on my commute, table was ready the second we walked in. The hold feature is the whole game.',
    name: 'Rohan Mehta',
    role: 'Product Manager · Pune',
  },
  {
    quote: 'Offers stack automatically so I never miss a discount. It feels like the app is doing the math for me.',
    name: 'Ananya Iyer',
    role: 'Food blogger · Chennai',
  },
]

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

export default function Testimonials() {
  const grid = useStaggerReveal<HTMLDivElement>({ stagger: 0.1 })

  return (
    <section className="section band testimonials">
      <div className="display-head">
        <span className="display-tag">Loved by diners</span>
        <h2 className="display-title">
          Real tables.
          <span className="display-title-accent">Real speed.</span>
        </h2>
        <span className="display-rule" aria-hidden="true" />
      </div>

      <div className="testimonials__grid" ref={grid}>
        {testimonials.map((t) => (
          <figure className="tcard panel ticks" key={t.name}>
            <div className="tcard__stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <IconStar key={i} size={13} />
              ))}
            </div>
            <blockquote>{t.quote}</blockquote>
            <figcaption>
              <span className="tcard__avatar mono">{initials(t.name)}</span>
              <span className="tcard__who">
                <strong>{t.name}</strong>
                <span className="mono">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
