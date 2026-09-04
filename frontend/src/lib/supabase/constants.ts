/**
 * PrizeVault Supabase project defaults.
 * The publishable key is public (embedded in the client bundle) — same as Supabase anon key.
 * Override via NEXT_PUBLIC_SUPABASE_* env vars for other projects / environments.
 */
export const PRIZEVAULT_SUPABASE_URL = 'https://mjlbcskcsrxkjycjpdyh.supabase.co'

export const PRIZEVAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_jM9a3lNktIjheG6joFKvYw_G8PcKjPx'

/** Resolve Supabase URL from env with project default. */
export function resolveSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    PRIZEVAULT_SUPABASE_URL
  ).trim()
}

/** Resolve publishable key from env with project default. */
export function resolveSupabasePublishableKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PRIZEVAULT_SUPABASE_PUBLISHABLE_KEY
  ).trim()
}

export function isSupabaseEnvConfigured(): boolean {
  return Boolean(resolveSupabaseUrl() && resolveSupabasePublishableKey())
}

export function supabaseEnvSource(): 'env' | 'default' {
  const hasUrl =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) ||
    Boolean(process.env.SUPABASE_URL?.trim())
  const hasKey =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) ||
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  return hasUrl && hasKey ? 'env' : 'default'
}
