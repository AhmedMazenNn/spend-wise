import Lottie from 'lottie-react'
import { useRef } from 'react'
import type { LottieRefCurrentProps } from 'lottie-react'

interface LottieIconProps {
  animationData: object
  isActive?: boolean
  size?: number
  className?: string
  /** CSS filter to tint the animation, e.g. 'invert(30%) sepia(1) saturate(4) hue-rotate(320deg)' */
  colorFilter?: string
  loop?: boolean
}

/**
 * Plays the animation on hover (or always when active/loop).
 */
export function LottieIcon({
  animationData,
  isActive = false,
  size = 24,
  className = '',
  colorFilter,
  loop,
}: LottieIconProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)
  const shouldLoop = loop ?? isActive

  return (
    <div
      style={{ width: size, height: size, filter: colorFilter }}
      className={`shrink-0 ${className}`}
      onMouseEnter={() => lottieRef.current?.play()}
      onMouseLeave={() => {
        if (!shouldLoop) lottieRef.current?.stop()
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={shouldLoop}
        autoplay={shouldLoop}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

// ─── Pre-built color filters ───────────────────────────────────────────────
// Usage: <LottieIcon colorFilter={LOTTIE_FILTERS.red} ... />

export const LOTTIE_FILTERS = {
  /** Tints icon to red (for delete/trash actions) */
  red: 'invert(27%) sepia(91%) saturate(6000%) hue-rotate(346deg) brightness(90%) contrast(1.2)',
  /** Tints icon to slate/gray (for edit actions) */
  slate: 'invert(40%) sepia(5%) saturate(500%) hue-rotate(200deg) brightness(85%)',
  /** Tints icon to emerald green (brand color) */
  emerald: 'invert(40%) sepia(80%) saturate(400%) hue-rotate(120deg) brightness(90%)',

  // ─── Sidebar states ───────────────────────────────────────────────────────
  /** #475569 slate-600 — inactive icon in light mode */
  slate600: 'brightness(0) saturate(100%) invert(35%) sepia(17%) saturate(655%) hue-rotate(174deg) brightness(96%)',
  /** #cbd5e1 slate-300 — inactive icon in dark mode */
  slate300: 'brightness(0) saturate(100%) invert(88%) sepia(12%) saturate(277%) hue-rotate(182deg) brightness(101%)',
  /** #ffffff white — active icon */
  white: 'brightness(0) invert(1)',
  /** #059669 emerald-600 — hover icon in light mode */
  emerald600: 'brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(400%) hue-rotate(125deg) brightness(90%)',
}
