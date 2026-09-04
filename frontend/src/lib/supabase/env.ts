import {
  isSupabaseEnvConfigured,
  resolveSupabasePublishableKey,
  resolveSupabaseUrl,
  supabaseEnvSource,
} from './constants'

export function getSupabaseUrl(): string {
  return resolveSupabaseUrl()
}

export function getSupabasePublishableKey(): string {
  return resolveSupabasePublishableKey()
}

export function getSupabaseServiceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

export function isSupabaseConfigured(): boolean {
  return isSupabaseEnvConfigured()
}

/** Whether URL/key came from env vars or baked-in project defaults. */
export function getSupabaseConfigSource(): 'env' | 'default' {
  return supabaseEnvSource()
}
