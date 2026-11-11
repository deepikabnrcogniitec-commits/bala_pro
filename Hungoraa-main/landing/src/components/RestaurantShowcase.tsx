import { useRef } from 'react'
import { useRevealSelf } from '../hooks/useReveal'
import { IconArrowRight, IconPin, IconStar, IconTag } from './Icons'
import Marquee from './Marquee'
import './RestaurantShowcase.css'

const U = (id: string) => `https://images.unsplash.com/${id}?w=560&q=72&auto=format&fit=crop`

const restaurants = [
  { name: 'Ember & Oak', cuisine: 'Modern Grill', city: 'Bengaluru', rating: 4.8, offer: '20% off', img: 'photo-1600891964092-4316c288032e' },
  { name: 'Basilico', cuisine: 'Italian', city: 'Mumbai', rating: 4.7, offer: 'Flat ₹300 off', img: 'photo-1565299624946-b28f40a0ae38' },
  { name: 'Umami House', cuisine: 'Japanese', city: 'Bengaluru', rating: 4.9, offer: '1 + 1 starters', img: 'photo-1553621042-f6e147245754' },
  { name: 'Spice Route', cuisine: 'North Indian', city: 'Delhi', rating: 4.6, offer: '15% off', img: 'photo-1631452180519-c014fe946bc7' },
  { name: 'Coastal Table', cuisine: 'Seafood', city: 'Chennai', rating: 4.8, offer: 'Free dessert', img: 'photo-1512058564366-18510be2db19' },
  { name: 'The Green Fork', cuisine: 'Vegan', city: 'Pune', rating: 4.7, offer: '10% off', img: 'photo-1512621776951-a57141f2eefd' },
]

export default function RestaurantShowcase() {
  const trackRef = useRef<HTMLDivElement>(null)
  const headRef = useRevealSelf<HTMLDivElement>()

  const scrollBy = (dir: 1 | -1) => trackRef.current?.scrollBy({ left: dir * 344, behavior: 'smooth' })

  return (
    <section id="restaurants" className="section band restaurants">
      <div className="restaurants__head" ref={headRef}>
        <div className="display-head" style={{ marginBottom: 0 }}>
          <span className="display-tag">Restaurant showcase</span>
          <h2 className="display-title">
            Thousands of tables,
            <span className="display-title-accent">one app.</span>
          </h2>
          <span className="display-rule" aria-hidden="true" />
          <p className="display-lead">Live offers refresh through the day — book while the discount lasts.</p>
        </div>
        <div className="restaurants__arrows">
          <button onClick={() => scrollBy(-1)} aria-label="Scroll left">
            <IconArrowRight size={16} className="restaurants__arrow--left" />
          </button>
          <button onClick={() => scrollBy(1)} aria-label="Scroll right">
            <IconArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="restaurants__marquee">
        <Marquee />
      </div>

      <div className="restaurants__track" ref={trackRef}>
        {restaurants.map((r) => (
          <article className="rcard panel ticks" key={r.name}>
            <div className="rcard__media">
              <img src={U(r.img)} alt={`${r.name} — ${r.cuisine}`} loading="lazy" decoding="async" />
              <span className="rcard__offer mono">
                <IconTag size={12} /> {r.offer}
              </span>
            </div>
            <div className="rcard__body">
              <div className="rcard__row">
                <h3>{r.name}</h3>
                <span className="rcard__rating mono">
                  <IconStar size={12} /> {r.rating}
                </span>
              </div>
              <span className="rcard__cuisine mono">
                <IconPin size={12} /> {r.cuisine} · {r.city}
              </span>
              <a href="#download" className="rcard__cta">
                Reserve a table <IconArrowRight size={13} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
