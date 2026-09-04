import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from './env'

let serverClient: SupabaseClient | null = null

/** Server-side Supabase client (API routes). Prefers service role when set. */
export function createSupabaseServerClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  if (serverClient) return serverClient

  const serviceKey = getSupabaseServiceRoleKey()
  const key = serviceKey || getSupabasePublishableKey()

  if (!serviceKey && process.env.NODE_ENV !== 'test') {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY is not set. With locked RLS, API writes will fail; set the service role key on the server.',
    )
  }

  serverClient = createClient(getSupabaseUrl(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serverClient
}
