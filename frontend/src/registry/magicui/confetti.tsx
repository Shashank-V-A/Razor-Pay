"use client"

import {
  forwardRef,
  useCallback,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react"
import confetti, { type Options as ConfettiOptions } from "canvas-confetti"

export type ConfettiButtonOptions = ConfettiOptions & {
  /** When true, each burst uses a random angle (magicui demo style). */
  randomAngle?: boolean
}

function resolveAngle(options?: ConfettiButtonOptions): number {
  if (options?.randomAngle) return Math.random() * 360
  return typeof options?.angle === "number" ? options.angle : 90
}

export interface ConfettiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  options?: ConfettiButtonOptions
  children?: ReactNode
}

/** Fire confetti from a normalized viewport origin (0–1). */
export function fireConfettiAt(
  origin: { x: number; y: number },
  options?: ConfettiOptions,
): void {
  if (typeof window === "undefined") return
  confetti({
    spread: 70,
    startVelocity: 45,
    particleCount: 80,
    zIndex: 9999,
    disableForReducedMotion: true,
    ...options,
    origin,
  })
}

/** Full-page winner celebration — bursts across the viewport. */
export function fireWinnerConfetti(options?: ConfettiOptions): void {
  if (typeof window === "undefined") return

  const duration = 2800
  const end = Date.now() + duration
  const colors = ["#2563eb", "#16a34a", "#eab308", "#ec4899", "#8b5cf6"]

  confetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.55, x: 0.5 },
    colors,
    zIndex: 9999,
    disableForReducedMotion: true,
    ...options,
  })

  const frame = () => {
    confetti({
      particleCount: 4,
      angle: Math.random() * 360,
      spread: 80,
      origin: { x: Math.random(), y: Math.random() * 0.45 },
      colors,
      zIndex: 9999,
      disableForReducedMotion: true,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

export const ConfettiButton = forwardRef<HTMLButtonElement, ConfettiButtonProps>(
  function ConfettiButton({ options, children, onClick, className = "", ...props }, ref) {
    const handleClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = (rect.left + rect.width / 2) / window.innerWidth
        const y = (rect.top + rect.height / 2) / window.innerHeight
        fireConfettiAt(
          { x, y },
          {
            angle: resolveAngle(options),
            ...options,
          },
        )
        onClick?.(event)
      },
      [onClick, options],
    )

    return (
      <button
        ref={ref}
        type="button"
        className={`pv-btn pv-btn--primary ${className}`.trim()}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    )
  },
)

ConfettiButton.displayName = "ConfettiButton"
