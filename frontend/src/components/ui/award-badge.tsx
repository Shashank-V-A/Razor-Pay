'use client'

import React, { type MouseEvent, useEffect, useId, useRef, useState } from 'react'

type AwardBadgeType = 'verified'

interface AwardBadgeProps {
  type?: AwardBadgeType
  link?: string
  className?: string
}

const identityMatrix =
  '1, 0, 0, 0, ' +
  '0, 1, 0, 0, ' +
  '0, 0, 1, 0, ' +
  '0, 0, 0, 1'

const maxRotate = 0.25
const minRotate = -0.25
const maxScale = 1
const minScale = 0.97

const backgroundColor = '#f3e3ac'
const badgeTextColor = '#111111'
const badgeBorderColor = '#a68b3c'

const title: Record<AwardBadgeType, string> = {
  verified: 'Funded & Verified',
}

const LOCK_ICON_PATH =
  'M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3H9z'

export const AwardBadge = ({ type = 'verified', link, className }: AwardBadgeProps) => {
  const uid = useId().replace(/:/g, '')
  const blurId = `pvAwardBlur-${uid}`
  const maskId = `pvAwardMask-${uid}`
  const ref = useRef<HTMLElement>(null)
  const [firstOverlayPosition, setFirstOverlayPosition] = useState<number>(0)
  const [matrix, setMatrix] = useState<string>(identityMatrix)
  const [currentMatrix, setCurrentMatrix] = useState<string>(identityMatrix)
  const [disableInOutOverlayAnimation, setDisableInOutOverlayAnimation] = useState<boolean>(true)
  const [disableOverlayAnimation, setDisableOverlayAnimation] = useState<boolean>(false)
  const [isTimeoutFinished, setIsTimeoutFinished] = useState<boolean>(false)
  const enterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimeout1 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimeout2 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimeout3 = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getDimensions = () => {
    const rect = ref.current?.getBoundingClientRect()
    const left = rect?.left || 0
    const right = rect?.right || 0
    const top = rect?.top || 0
    const bottom = rect?.bottom || 0

    return { left, right, top, bottom }
  }

  const getMatrix = (clientX: number, clientY: number) => {
    const { left, right, top, bottom } = getDimensions()
    const xCenter = (left + right) / 2
    const yCenter = (top + bottom) / 2

    const scale = [
      maxScale - ((maxScale - minScale) * Math.abs(xCenter - clientX)) / (xCenter - left),
      maxScale - ((maxScale - minScale) * Math.abs(yCenter - clientY)) / (yCenter - top),
      maxScale -
        ((maxScale - minScale) * (Math.abs(xCenter - clientX) + Math.abs(yCenter - clientY))) /
          (xCenter - left + yCenter - top),
    ]

    const rotate = {
      x1: 0.25 * ((yCenter - clientY) / yCenter - (xCenter - clientX) / xCenter),
      x2: maxRotate - ((maxRotate - minRotate) * Math.abs(right - clientX)) / (right - left),
      x3: 0,
      y0: 0,
      y2: maxRotate - ((maxRotate - minRotate) * (top - clientY)) / (top - bottom),
      y3: 0,
      z0: -(maxRotate - ((maxRotate - minRotate) * Math.abs(right - clientX)) / (right - left)),
      z1: 0.2 - (0.2 + 0.6) * ((top - clientY) / (top - bottom)),
      z3: 0,
    }
    return (
      `${scale[0]}, ${rotate.y0}, ${rotate.z0}, 0, ` +
      `${rotate.x1}, ${scale[1]}, ${rotate.z1}, 0, ` +
      `${rotate.x2}, ${rotate.y2}, ${scale[2]}, 0, ` +
      `${rotate.x3}, ${rotate.y3}, ${rotate.z3}, 1`
    )
  }

  const getOppositeMatrix = (_matrix: string, clientY: number, onMouseEnter?: boolean) => {
    const { top, bottom } = getDimensions()
    const oppositeY = bottom - clientY + top
    const weakening = onMouseEnter ? 0.7 : 4
    const multiplier = onMouseEnter ? -1 : 1

    return _matrix
      .split(', ')
      .map((item, index) => {
        if (index === 2 || index === 4 || index === 8) {
          return (-parseFloat(item) * multiplier) / weakening
        }
        if (index === 0 || index === 5 || index === 10) {
          return '1'
        }
        if (index === 6) {
          return (
            (multiplier * (maxRotate - ((maxRotate - minRotate) * (top - oppositeY)) / (top - bottom))) /
            weakening
          )
        }
        if (index === 9) {
          return (maxRotate - ((maxRotate - minRotate) * (top - oppositeY)) / (top - bottom)) / weakening
        }
        return item
      })
      .join(', ')
  }

  const onMouseEnter = (e: MouseEvent<HTMLElement>) => {
    if (leaveTimeout1.current) clearTimeout(leaveTimeout1.current)
    if (leaveTimeout2.current) clearTimeout(leaveTimeout2.current)
    if (leaveTimeout3.current) clearTimeout(leaveTimeout3.current)
    setDisableOverlayAnimation(true)

    const { left, right, top, bottom } = getDimensions()
    const xCenter = (left + right) / 2
    const yCenter = (top + bottom) / 2

    setDisableInOutOverlayAnimation(false)
    enterTimeout.current = setTimeout(() => setDisableInOutOverlayAnimation(true), 350)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFirstOverlayPosition((Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5)
      })
    })

    const nextMatrix = getMatrix(e.clientX, e.clientY)
    const oppositeMatrix = getOppositeMatrix(nextMatrix, e.clientY, true)

    setMatrix(oppositeMatrix)
    setIsTimeoutFinished(false)
    setTimeout(() => {
      setIsTimeoutFinished(true)
    }, 200)
  }

  const onMouseMove = (e: MouseEvent<HTMLElement>) => {
    const { left, right, top, bottom } = getDimensions()
    const xCenter = (left + right) / 2
    const yCenter = (top + bottom) / 2

    setTimeout(
      () => setFirstOverlayPosition((Math.abs(xCenter - e.clientX) + Math.abs(yCenter - e.clientY)) / 1.5),
      150,
    )

    if (isTimeoutFinished) {
      setCurrentMatrix(getMatrix(e.clientX, e.clientY))
    }
  }

  const onMouseLeave = (e: MouseEvent<HTMLElement>) => {
    const oppositeMatrix = getOppositeMatrix(matrix, e.clientY)

    if (enterTimeout.current) clearTimeout(enterTimeout.current)

    setCurrentMatrix(oppositeMatrix)
    setTimeout(() => setCurrentMatrix(identityMatrix), 200)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDisableInOutOverlayAnimation(false)
        leaveTimeout1.current = setTimeout(() => setFirstOverlayPosition(-firstOverlayPosition / 4), 150)
        leaveTimeout2.current = setTimeout(() => setFirstOverlayPosition(0), 300)
        leaveTimeout3.current = setTimeout(() => {
          setDisableOverlayAnimation(false)
          setDisableInOutOverlayAnimation(true)
        }, 500)
      })
    })
  }

  useEffect(() => {
    if (isTimeoutFinished) {
      setMatrix(currentMatrix)
    }
  }, [currentMatrix, isTimeoutFinished])

  const overlayAnimations = [...Array(10).keys()]
    .map(
      (e) => `
    @keyframes pvAwardOverlay${e + 1} {
      0% {
        transform: rotate(${e * 10}deg);
      }
      50% {
        transform: rotate(${(e + 1) * 10}deg);
      }
      100% {
        transform: rotate(${e * 10}deg);
      }
    }
    `,
    )
    .join(' ')

  const sharedProps = {
    className: ['pv-award-badge', className].filter(Boolean).join(' '),
    onMouseMove,
    onMouseLeave,
    onMouseEnter,
  }

  const content = (
    <>
      <style>{overlayAnimations}</style>
      <div
        style={{
          transform: `perspective(700px) matrix3d(${matrix})`,
          transformOrigin: 'center center',
          transition: 'transform 200ms ease-out',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 54" className="pv-award-badge__svg" aria-hidden>
          <defs>
            <filter id={blurId}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <mask id={maskId}>
              <rect width="260" height="54" fill="white" rx="10" />
            </mask>
          </defs>
          <rect width="260" height="54" rx="10" fill={backgroundColor} />
          <rect x="4" y="4" width="252" height="46" rx="8" fill="transparent" stroke={badgeBorderColor} strokeWidth="1" />
          <text
            fontFamily="Helvetica-Bold, Helvetica, Arial, sans-serif"
            fontSize="9"
            fontWeight="bold"
            fill={badgeTextColor}
            x="53"
            y="20"
            letterSpacing="0.08em"
          >
            PRIZE VAULT
          </text>
          <text
            fontFamily="Helvetica-Bold, Helvetica, Arial, sans-serif"
            fontSize="14"
            fontWeight="bold"
            fill={badgeTextColor}
            x="52"
            y="40"
          >
            {title[type]}
          </text>
          <g transform="translate(10, 12)">
            <path fill={badgeTextColor} d={LOCK_ICON_PATH} />
          </g>
          <g style={{ mixBlendMode: 'overlay' }} mask={`url(#${maskId})`}>
            {[
              'hsl(358, 100%, 62%)',
              'hsl(30, 100%, 50%)',
              'hsl(60, 100%, 50%)',
              'hsl(96, 100%, 50%)',
              'hsl(233, 85%, 47%)',
              'hsl(271, 85%, 47%)',
              'hsl(300, 20%, 35%)',
              'transparent',
              'transparent',
              'white',
            ].map((fill, index) => (
              <g
                key={index}
                style={{
                  transform: `rotate(${firstOverlayPosition + index * 10}deg)`,
                  transformOrigin: 'center center',
                  transition: !disableInOutOverlayAnimation ? 'transform 200ms ease-out' : 'none',
                  animation: disableOverlayAnimation ? 'none' : `pvAwardOverlay${index + 1} 5s infinite`,
                  willChange: 'transform',
                }}
              >
                <polygon points="0,0 260,54 260,0 0,54" fill={fill} filter={`url(#${blurId})`} opacity="0.5" />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </>
  )

  if (link) {
    return (
      <a
        {...sharedProps}
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={link}
        target="_blank"
        rel="noreferrer"
        aria-label="Prize pool funded and verified by PrizeVault"
      >
        {content}
      </a>
    )
  }

  return (
    <div
      {...sharedProps}
      ref={ref as React.RefObject<HTMLDivElement>}
      role="img"
      aria-label="Prize pool funded and verified by PrizeVault"
    >
      {content}
    </div>
  )
}
