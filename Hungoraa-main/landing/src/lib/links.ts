/**
 * In-page anchors (#about, #restaurants …) only exist on the home page. On any other page they
 * have to point back at it, e.g. "#about" → "/#about". The download section is on both.
 */
export function pageHref(href: string, onHome: boolean) {
  if (onHome || !href.startsWith('#') || href === '#download') return href
  return href === '#top' ? '/' : `/${href}`
}
