"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import createGlobe from "cobe"
import Icon from "@frontend/components/Icon"
import type { GlobeLocationGroup } from "@/client/utils/hackathonGlobe"
import { withEarthGlobeShader } from "@/lib/cobeEarthShader"

interface GlobeCdnProps {
  locations?: GlobeLocationGroup[]
  className?: string
  speed?: number
}

function eventHash(hackathonId: string): string {
  return `#event-${hackathonId}`
}

function toMarkers(locations: GlobeLocationGroup[]) {
  return locations.map((loc) => ({
    location: loc.location,
    size: 0.035,
    id: loc.id,
  }))
}

export function GlobeCdn({
  locations = [],
  className = "",
  speed = 0.003,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)
  const [openLocationId, setOpenLocationId] = useState<string | null>(null)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing"
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (e.clientX - pointerInteracting.current.x) / 300,
          theta: (e.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerup", handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenLocationId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return undefined
    const canvas = canvasRef.current
    let animationId = 0
    let phi = 0
    const isMobile = window.matchMedia("(max-width: 768px)").matches

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globeRef.current) return

      globeRef.current = withEarthGlobeShader(() =>
        createGlobe(canvas, {
          devicePixelRatio: Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2),
          width,
          height: width,
          phi: 0,
          theta: 0.2,
          dark: 1,
          diffuse: 1.4,
          mapSamples: isMobile ? 8000 : 16000,
          mapBrightness: 3.2,
          mapBaseBrightness: 0.32,
          baseColor: [0.22, 0.56, 0.28],
          markerColor: [0.1, 0.35, 0.85],
          glowColor: [0.18, 0.40, 0.78],
          markerElevation: 0.04,
          markers: toMarkers(locations),
          opacity: 1,
        }),
      )

      function animate() {
        if (!globeRef.current) return
        if (!isPausedRef.current) phi += speed
        globeRef.current.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        })
        animationId = requestAnimationFrame(animate)
      }
      animate()
      canvas.style.opacity = "1"
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      const ro = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          ro.disconnect()
          init()
        }
      })
      ro.observe(canvas)
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      if (globeRef.current) {
        globeRef.current.destroy()
        globeRef.current = null
      }
    }
  }, [speed])

  useEffect(() => {
    globeRef.current?.update({ markers: toMarkers(locations) })
  }, [locations])

  const toggleLocation = (locationId: string) => {
    setOpenLocationId((current) => (current === locationId ? null : locationId))
  }

  return (
    <div ref={rootRef} className={`pv-globe ${className}`.trim()}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="pv-globe__canvas"
        aria-label="Interactive globe showing hackathon locations"
      />
      {locations.map((loc) => {
        const isOpen = openLocationId === loc.id
        const count = loc.hackathons.length
        const dx = loc.labelDx ?? 0
        const dy = loc.labelDy ?? 0
        const offset = Math.abs(dx) > 4 || Math.abs(dy) > 4
        const leaderX = dx
        const leaderY = -14 + dy
        const leaderLen = Math.hypot(leaderX, leaderY)
        const leaderAng = (Math.atan2(leaderY, leaderX) * 180) / Math.PI
        return (
          <div
            key={loc.id}
            className={`pv-globe__marker-label${offset ? ' is-spread' : ''}${isOpen ? ' is-open' : ''}`}
            style={{
              positionAnchor: `--cobe-${loc.id}`,
              opacity: `var(--cobe-visible-${loc.id}, 0)`,
              ['--label-dx' as string]: String(dx),
              ['--label-dy' as string]: String(dy),
              ['--leader-len' as string]: `${leaderLen}px`,
              ['--leader-ang' as string]: `${leaderAng}deg`,
            } as React.CSSProperties}
          >
            <div className="pv-globe__marker-pin" aria-hidden>
              <span className="pv-globe__marker-dot" />
            </div>
            {offset ? <span className="pv-globe__leader" aria-hidden /> : null}
            <div className="pv-globe__dropdown-wrap">
              <button
                type="button"
                className={`pv-globe__location-trigger ${isOpen ? "is-open" : ""}`.trim()}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLocation(loc.id)
                }}
              >
                <span className="pv-globe__marker-city">{loc.label}</span>
                <span className="pv-globe__marker-count">{count}</span>
                <Icon name="chevronDown" size={12} />
              </button>
              {isOpen ? (
                <div className="pv-globe__dropdown" role="listbox" aria-label={`Hackathons in ${loc.label}`}>
                  <p className="pv-globe__dropdown-head">
                    {count} hackathon{count === 1 ? "" : "s"} in {loc.label}
                  </p>
                  <ul className="pv-globe__dropdown-list">
                    {loc.hackathons.map((h) => (
                      <li key={h.id}>
                        <a
                          href={eventHash(h.id)}
                          className="pv-globe__dropdown-item"
                          onClick={() => setOpenLocationId(null)}
                        >
                          <span>{h.name}</span>
                          <Icon name="arrowRight" size={12} />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a href="#events" className="pv-globe__dropdown-footer" onClick={() => setOpenLocationId(null)}>
                    View all in Open events
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
