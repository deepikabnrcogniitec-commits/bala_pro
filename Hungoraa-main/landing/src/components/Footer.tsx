import { IconArrowRight, IconFacebook, IconInstagram, IconX, IconYoutube } from './Icons'
import { pageHref } from '../lib/links'
import './Footer.css'

const logo = '/logolanding.jpeg'

const columns = [
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '#about' },
      { label: 'Contact', href: '/contact' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Features', href: '/features' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { label: 'Partner with us', href: '/partner' },
      { label: 'Owner dashboard', href: '#' },
      { label: 'Help & support', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of service', href: '/legal/terms-and-conditions.pdf', external: true },
      { label: 'Privacy policy', href: '/legal/privacy-policy.pdf', external: true },
      { label: 'Cookie policy', href: '/legal/cookie-policy.pdf', external: true },
    ],
  },
]

const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com/hungoraofficial/', Icon: IconInstagram },
  { label: 'Facebook', href: 'https://www.facebook.com/HungoraOfficial', Icon: IconFacebook },
  { label: 'YouTube', href: 'https://www.youtube.com/@HungoraOfficial', Icon: IconYoutube },
  { label: 'X (Twitter)', href: 'https://x.com/OfficialHungora', Icon: IconX },
]

// Legal docs are static PDFs in public/legal — open in a new tab (browser's PDF viewer).
const pdfLink = { target: '_blank', rel: 'noopener noreferrer' }

export default function Footer({ onHome = true }: { onHome?: boolean }) {
  return (
    <footer id="contact" className="footer">
      <div className="footer__cta section">
        <h2>
          Ready to skip the wait? <span className="accent">Download Hungora.</span>
        </h2>
        <a href="#download" className="btn btn-primary">
          Get the app <IconArrowRight size={16} />
        </a>
      </div>

      <div className="footer__main">
        <div className="footer__inner">
          <div className="footer__brand">
            <a href={pageHref('#top', onHome)} className="footer__logo">
              <img src={logo} alt="Hungora" />
            </a>
            <p className="footer__tagline">The smartest way to dine</p>
            <ul className="footer__socials">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Hungora on ${label}`} title={label}>
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__columns">
            {columns.map((c) => (
              <div key={c.title}>
                <h4 className="mono">{c.title}</h4>
                <ul>
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {'external' in l ? (
                        <a href={l.href} {...pdfLink}>
                          {l.label}
                        </a>
                      ) : (
                        <a href={pageHref(l.href, onHome)}>{l.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="footer__inner">
          <p className="footer__legal">
            By accessing or continuing to use this platform, you agree to abide by our{' '}
            <a href="/legal/terms-and-conditions.pdf" {...pdfLink}>Terms of Service</a>,{' '}
            <a href="/legal/cookie-policy.pdf" {...pdfLink}>Cookie Policy</a>,{' '}
            <a href="/legal/privacy-policy.pdf" {...pdfLink}>Privacy Policy</a>, and Content Guidelines. All third-party trademarks, logos, and brand assets
            displayed are the property of their respective owners.
          </p>
          <span className="mono">
            © 2025–{new Date().getFullYear()} Hungora™ (Hungora Technologies Private Ltd.). All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  )
}
