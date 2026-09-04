import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'

/** G-addresses are 56 chars; show enough of both ends to be verifiable by eye. */
export function truncateAddress(address?: string | null, lead = 6, tail = 6): string {
  if (!address) return ''
  const value = String(address)
  if (value.length <= lead + tail + 3) return value
  return `${value.slice(0, lead)}...${value.slice(-tail)}`
}

export interface AddressChipProps {
  address?: string | null
  lead?: number
  tail?: number
  /** Render the whole address instead of a truncated form. */
  full?: boolean
  /** Used in the copy button's accessible label, e.g. "escrow address". */
  label?: string
  className?: string
}

/**
 * Monospace address/hash with a copy button.
 * Falls back to a hidden textarea + execCommand when the Clipboard API is
 * unavailable (non-HTTPS origins, older browsers).
 */
export default function AddressChip({
  address,
  lead = 6,
  tail = 6,
  full = false,
  label = 'address',
  className = '',
}: AddressChipProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(async () => {
    if (!address) return
    const text = String(address)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const el = document.createElement('textarea')
        el.value = text
        el.setAttribute('readonly', '')
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Copy is a convenience; never surface a failure as an error state.
    }
  }, [address])

  if (!address) return null

  return (
    <span className={`pv-addr ${className}`.trim()}>
      <span className="pv-addr__value" title={String(address)}>
        {full ? address : truncateAddress(address, lead, tail)}
      </span>
      <button
        type="button"
        className={`pv-addr__copy ${copied ? 'is-copied' : ''}`.trim()}
        onClick={copy}
        aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
        title={copied ? 'Copied' : 'Copy'}
      >
        <Icon name={copied ? 'check' : 'copy'} size={13} />
      </button>
    </span>
  )
}
