import { useEffect, useState } from 'react'

export const DEFAULT_BANNER = '/bannerimage.png'
const CACHE_KEY = 'hungora.landingHeroImageUrl'
const FETCH_TIMEOUT_MS = 2500

/**
 * Our own uploads are stored as absolute URLs (often with a localhost or http:// origin).
 * The landing page is served from the same domain, so load them by path instead.
 */
function toSameOrigin(url: string) {
  const m = url.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/i)
  return m ? m[1] : url
}

function readCache(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY)
  } catch {
    return null
  }
}

function writeCache(url: string) {
  try {
    localStorage.setItem(CACHE_KEY, url)
  } catch {
    /* storage blocked — fine, we just refetch next time */
  }
}

/**
 * The hero banner URL, as set in Admin → Settings → Landing Page Image.
 * Returns null until it is known, so the default never flashes in before a custom image.
 * Repeat visitors get the last known URL instantly from localStorage.
 */
export function useHeroBanner() {
  const [src, setSrc] = useState<string | null>(() => {
    const cached = readCache()
    return cached === null ? null : cached || DEFAULT_BANNER
  })

  useEffect(() => {
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)

    fetch('/api/settings/public', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body) => {
        const url = toSameOrigin(String(body?.data?.settings?.landingHeroImageUrl ?? '').trim())
        writeCache(url)
        setSrc(url || DEFAULT_BANNER)
      })
      .catch(() => setSrc((prev) => prev ?? DEFAULT_BANNER))
      .finally(() => window.clearTimeout(timer))

    return () => {
      window.clearTimeout(timer)
      ctrl.abort()
    }
  }, [])

  return src
}
