import { useState } from 'react'
import { useRevealSelf, useStaggerReveal } from '../hooks/useReveal'
import { IconArrowRight, IconCheck, IconMail, IconPin } from './Icons'
import './Contact.css'

const EMAIL = 'admin@hungora.com'
const ADDRESS = 'House #30, 2nd Cross St, Thazhambur, Chennai, Tamil Nadu 600130'
const MAP_QUERY = encodeURIComponent(`${ADDRESS}, India`)

export default function Contact() {
  const headRef = useRevealSelf<HTMLDivElement>()
  const cardsRef = useStaggerReveal<HTMLDivElement>({ stagger: 0.1 })
  const mapRef = useRevealSelf<HTMLDivElement>()
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${EMAIL}`
    }
  }

  return (
    <section id="contact-us" className="section contact">
      <div className="display-head contact__head" ref={headRef}>
        <span className="display-tag">Contact us</span>
        <h1 className="display-title">
          Connect with the
          <span className="display-title-accent">Hungora team.</span>
        </h1>
        <span className="display-rule" />
        <p className="display-lead">
          Have a question, partnership enquiry, or feedback? We’re here to help &amp; we’d love to hear from you.
        </p>
      </div>

      <div className="contact__grid" ref={cardsRef}>
        <article className="contact__card">
          <span className="contact__icon">
            <IconMail size={26} />
          </span>
          <span className="eyebrow">Email us</span>
          <a className="contact__value" href={`mailto:${EMAIL}`}>
            {EMAIL}
          </a>
          <p className="contact__note">For support, partnerships and press — we reply within one business day.</p>
          <div className="contact__actions">
            <a className="btn btn-primary" href={`mailto:${EMAIL}`}>
              Write to us <IconArrowRight size={16} />
            </a>
            <button type="button" className="btn btn-ghost" onClick={copyEmail}>
              {copied ? (
                <>
                  <IconCheck size={16} /> Copied
                </>
              ) : (
                'Copy email'
              )}
            </button>
          </div>
        </article>

        <article className="contact__card">
          <span className="contact__icon contact__icon--gold">
            <IconPin size={26} />
          </span>
          <span className="eyebrow">Chennai office</span>
          <address className="contact__value contact__address">
            House #30, 2nd Cross St,
            <br />
            Thazhambur, Chennai,
            <br />
            Tamil Nadu 600130
          </address>
          <div className="contact__actions">
            <a
              className="btn btn-ghost"
              href={`https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`}
              target="_blank"
              rel="noreferrer"
            >
              Get directions <IconArrowRight size={16} />
            </a>
          </div>
        </article>
      </div>

      <div className="contact__map" ref={mapRef}>
        <iframe
          title="Hungora Chennai office on the map"
          src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="contact__signoff">
        <span className="contact__brand">
          HUNGORA<sup>™</sup>
        </span>
        <span className="contact__slogan">
          Book Smart. <span className="accent">Dine Better.</span>
        </span>
      </div>
    </section>
  )
}
