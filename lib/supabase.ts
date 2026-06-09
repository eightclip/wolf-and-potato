import { createClient } from '@supabase/supabase-js'

export const LOCATIONS_TABLE = 'wolf_potato_locations'

// Lazy singleton — only created in the browser (or when env vars are present).
// This prevents the SSR static build from blowing up without env vars set.
let _client: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  _client = createClient(url, key)
  return _client
}
