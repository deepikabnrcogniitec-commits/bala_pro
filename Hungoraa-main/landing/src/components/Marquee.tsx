import './Marquee.css'

const items = [
  'Ember & Oak',
  'Basilico',
  'Umami House',
  'Spice Route',
  'Coastal Table',
  'The Green Fork',
  'Saffron Room',
  'Copper Pot',
  'Nolita',
  'Bay Leaf',
]

export default function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {[0, 1].map((dup) => (
          <div className="marquee__group" key={dup}>
            {items.map((it) => (
              <span className="marquee__item" key={it}>
                <span className="marquee__dot" />
                {it}
              </span>
            ))}
            <span className="marquee__item marquee__item--tag">Now booking</span>
          </div>
        ))}
      </div>
    </div>
  )
}
