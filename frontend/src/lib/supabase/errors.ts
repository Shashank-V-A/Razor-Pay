type PgError = {
  message?: string
  code?: string
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as PgError).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export function formatSupabaseApiError(context: string, err: unknown): string {
  const pg = err as PgError
  const base = errorMessage(err, context)
  const hint =
    pg?.code === '42501' || base.toLowerCase().includes('row-level security')
      ? ' Apply the Supabase migrations in supabase/migrations/ (001 for proposals, 003 for payouts).'
      : pg?.code === '42P01' || pg?.code === 'PGRST205'
        ? ' A required table is missing — run migration 001_prizevault_schema.sql.'
        : pg?.code === '23503'
          ? ' A linked hackathon or escrow row is missing in Supabase — sync the hackathon first.'
          : pg?.code === '23505'
            ? ' Duplicate proposal id — refresh and try again.'
            : ''
  return `${context}: ${base}${hint}`
}
