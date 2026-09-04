/**
 * Local declarations for untyped modules we depend on.
 *
 * Declared here rather than installing @types packages so the frontend keeps
 * its dependency list unchanged. Only the surface we actually call is typed.
 */

declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    width?: number
    margin?: number
    scale?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
    color?: { dark?: string; light?: string }
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>

  const QRCode: { toDataURL: typeof toDataURL }
  export default QRCode
}

/**
 * The holder state core is a 926-line JavaScript module that is deliberately
 * left untouched by the UI rebuild. Only the provider is consumed from
 * TypeScript, so that is all that is declared.
 */
declare module '*/context/HolderContext' {
  import type { ReactElement, ReactNode } from 'react'

  export function HolderProvider(props: { children?: ReactNode }): ReactElement
  export function useHolder(): Record<string, unknown>
}
