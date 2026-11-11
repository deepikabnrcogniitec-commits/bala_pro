type IconProps = { size?: number; className?: string }

const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function IconCalendar({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </svg>
  )
}

export function IconReceipt({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 3h12v18l-2.5-1.6L13 21l-1-1.6-1 1.6-2.5-1.6L6 21V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  )
}

export function IconTag({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 12.5 11.5 3H19a2 2 0 0 1 2 2v7.5L12.5 21a2 2 0 0 1-2.8 0L3 13.8a2 2 0 0 1 0-2.8Z" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </svg>
  )
}

export function IconWallet({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
      <path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6a2 2 0 0 1 0-4" />
      <circle cx="16.5" cy="14" r="1.4" />
    </svg>
  )
}

export function IconStar({ size, className }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <path d="M12 2.5l2.9 6.1 6.6.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.6-.7L12 2.5Z" />
    </svg>
  )
}

export function IconArrowRight({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </svg>
  )
}

export function IconChevron({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function IconBolt({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  )
}

export function IconShield({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function IconFork({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7 2v8M5 2v6a2 2 0 0 0 4 0V2M7 10v12" />
      <path d="M17 2c-2 0-3 2-3 5s1 4 3 5v10" />
    </svg>
  )
}

export function IconApple({ size, className }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" viewBox="0 0 24 24" className={className}>
      <path d="M16.7 12.4c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.3 2.6 1.3-.1 1.8-.9 3.4-.9s2 .9 3.4.8c1.4 0 2.3-1.3 3.1-2.5.7-1 1.1-2 1.4-3-1.9-.7-3-2.6-3-3.7Z" />
      <path d="M14.7 4.3c.7-.9 1.2-2.1 1-3.3-1.1 0-2.4.7-3.1 1.6-.7.8-1.2 2-1 3.2 1.2.1 2.4-.6 3.1-1.5Z" />
    </svg>
  )
}

export function IconPlay({ size, className }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" viewBox="0 0 24 24" className={className}>
      <path d="M4.5 2.7c0-.6.6-1 1.2-.7l14.6 9.3c.5.3.5 1 0 1.4L5.7 22c-.6.3-1.2-.1-1.2-.7V2.7Z" />
    </svg>
  )
}

export function IconScale({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 3v18M8 21h8" />
      <path d="M5 7h5M14 7h5" />
      <path d="M5 7 2.5 12a2.5 2.5 0 0 0 5 0L5 7ZM19 7l-2.5 5a2.5 2.5 0 0 0 5 0L19 7Z" />
    </svg>
  )
}

export function IconUsers({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M14.5 14.8c.6-.2 1.2-.3 1.9-.3 2.6 0 4.6 1.9 4.9 4.6" />
    </svg>
  )
}

export function IconHandshake({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 11h4l3.5-3 2.7 2.4a1.6 1.6 0 0 1-2.1 2.4L8 11" />
      <path d="M22 11h-4l-4-3.5-2.2 2M7 9 3 12.5 7 17l2-1.5M17 9l4 3.5-4 4.5-2-1.5" />
      <path d="M9.5 12.5 12 15l2.5-2" />
    </svg>
  )
}

export function IconSparkle({ size, className }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" className={className}>
      <path d="M11 2.5c.4 3 1.4 5 3 6.5s3.5 2.6 6.5 3c-3 .4-5 1.4-6.5 3s-2.6 3.5-3 6.5c-.4-3-1.4-5-3-6.5s-3.5-2.6-6.5-3c3-.4 5-1.4 6.5-3s2.6-3.5 3-6.5Z" />
    </svg>
  )
}

export function IconHeart({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 20.5s-7.5-4.7-9.8-9.3C.6 7.8 2.3 4.5 5.6 3.8c1.9-.4 3.8.4 4.9 2 1.1-1.6 3-2.4 4.9-2 3.3.7 5 4 3.4 7.4-2.3 4.6-9.8 9.3-9.8 9.3Z" />
    </svg>
  )
}

export function IconAward({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M9 13.2 7.3 21l4.7-2.6 4.7 2.6-1.7-7.8" />
    </svg>
  )
}

export function IconEye({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function IconCompass({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="m15 9-2 5-4.5 1.5L10.5 11 15 9Z" />
    </svg>
  )
}

export function IconQuote({ size, className }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none" className={className}>
      <path d="M9.5 8C6.5 8 4 10.5 4 13.7c0 2.9 2.1 5 4.8 5 .5 0 1-.1 1.4-.3-.7 2-2.3 3.4-4.6 3.8v2.3c4.4-.6 7.4-3.9 7.4-8.4V13c0-2.8-1.5-5-3.5-5Zm10 0c-3 0-5.5 2.5-5.5 5.7 0 2.9 2.1 5 4.8 5 .5 0 1-.1 1.4-.3-.7 2-2.3 3.4-4.6 3.8v2.3c4.4-.6 7.4-3.9 7.4-8.4V13c0-2.8-1.5-5-3.5-5Z" />
    </svg>
  )
}

export function IconCheck({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  )
}

export function IconClock({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

export function IconSplit({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 4h6l10 16M20 4h-6" />
      <path d="M14 20h6v-6" />
    </svg>
  )
}

export function IconPin({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 21s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.6" />
    </svg>
  )
}

export function IconMail({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

export function IconPlus({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconMinus({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12h14" />
    </svg>
  )
}

export function IconQr({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
    </svg>
  )
}

// Brand marks — solid fills (official glyph shapes), sized like the line icons.
const brand = (size = 24) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' })

export function IconInstagram({ size, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  )
}

export function IconFacebook({ size, className }: IconProps) {
  return (
    <svg {...brand(size)} className={className}>
      <path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.6c0-.87.25-1.46 1.5-1.46H16.6V4.46A21 21 0 0 0 14.3 4.3c-2.3 0-3.8 1.4-3.8 3.95v2.25H8v3h2.5V21h3Z" />
    </svg>
  )
}

export function IconYoutube({ size, className }: IconProps) {
  return (
    <svg {...brand(size)} className={className}>
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
    </svg>
  )
}

export function IconX({ size, className }: IconProps) {
  return (
    <svg {...brand(size)} className={className}>
      <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
    </svg>
  )
}
