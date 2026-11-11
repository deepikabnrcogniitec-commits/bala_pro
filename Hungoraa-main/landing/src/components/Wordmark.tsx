import wordmark from '../assets/hungora-wordmark.png'

/** "HUNGORA" logotype (transparent PNG, logo gold + red). Sized by the parent via .wordmark. */
export default function Wordmark({ className = '' }: { className?: string }) {
  return <img src={wordmark} alt="Hungora" className={`wordmark ${className}`.trim()} />
}
