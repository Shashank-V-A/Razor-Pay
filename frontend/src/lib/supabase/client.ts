'use client'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublishableKey, getSupabaseUrl, isSupabaseConfigured } from './env'

let browserClient: SupabaseClient | null = null

/** Browser Supabase client (publishable key only). */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (browserClient) return browserClient

  browserClient = createClient(getSupabaseUrl(), getSupabasePublishableKey())
  return browserClient
}
