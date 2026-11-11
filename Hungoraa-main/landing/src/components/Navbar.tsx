import { useEffect, useState } from 'react'
import Wordmark from './Wordmark'
import { pageHref } from '../lib/links'
import './Navbar.css'

const logo = '/loggggooo.png'

const links = [
  { label: 'About us', href: '#about' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Partner with us', href: '/partner' },
  { label: 'Features', href: '/features' },
  { label: 'Contact', href: '/contact' },
]

/** `onHome` is false on the standalone pages, where #anchors have to point back at the home page. */
export default function Navbar({ onHome = true }: { onHome?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      setScrolled(h.scrollTop > 20)
      const max = h.scrollHeight - h.clientHeight
      setProgress(max > 0 ? h.scrollTop / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <a href={pageHref('#top', onHome)} className="navbar__brand">
          <img src={logo} alt="Hungora" className="navbar__brand-icon" />
          <Wordmark />
        </a>

        <nav className="navbar__links">
          {links.map((l) => (
            <a key={l.href} href={pageHref(l.href, onHome)}>
              <span className="navbar__link-dot" />
              {l.label}
            </a>
          ))}
        </nav>

        <div className="navbar__cta">
          <a href="#download" className="btn btn-primary navbar__cta-btn">
            Get the app
          </a>
        </div>

        <button
          className={`navbar__burger ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span />
          <span />
        </button>
      </div>

      <div className="navbar__progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />

      {open && (
        <div className="navbar__mobile">
          {links.map((l) => (
            <a key={l.href} href={pageHref(l.href, onHome)} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href="#download" className="btn btn-primary" onClick={() => setOpen(false)}>
            Get the app
          </a>
        </div>
      )}
    </header>
  )
}
