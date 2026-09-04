# Supabase setup (PrizeVault)

Project: **https://mjlbcskcsrxkjycjpdyh.supabase.co**

## 1. Run the schema (one time)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/mjlbcskcsrxkjycjpdyh/sql/new)
2. Paste and run: `supabase/migrations/001_prizevault_schema.sql`
3. Then run: `supabase/migrations/002_participants_rls.sql` (enables `participants` RLS + `hackathon_registrations` table)
4. Then run: `supabase/migrations/003_payouts_rls.sql` (enables `payouts` RLS + unique index per proposal/winner)
5. Then run: `supabase/migrations/004_tighten_rls.sql` (required on existing projects that already applied the old open policies)

## 2. Environment variables

**Local:** copy `frontend/.env.example` → `frontend/.env.local`

**Production (Vercel):** Root Directory = `frontend`. Supabase public vars are in `frontend/vercel.json` and resolved at build time via `src/lib/supabase/constants.ts`. You can still override in Vercel → Environment Variables.

```env
NEXT_PUBLIC_SUPABASE_URL=https://mjlbcskcsrxkjycjpdyh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service_role key — server only, never NEXT_PUBLIC>
```

`SUPABASE_SERVICE_ROLE_KEY` is required for creating events, registrations, and payout writes. The publishable key can only read the public `hackathons` catalog.

Verify after deploy: `GET https://your-app.vercel.app/api/health` should return `"supabaseConfigured": true`.

## 3. API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/hackathons` | List hackathons (`?organizer=G...` `?sponsor=G...`) |
| POST | `/api/hackathons` | Create hackathon |
| PATCH | `/api/hackathons/[id]` | Update hackathon |
| GET | `/api/proposals` | List payout proposals |
| PUT | `/api/proposals` | Bulk sync proposals |
| POST | `/api/proposals` | Create proposal |

The UI still caches to `localStorage` as fallback when Supabase is unavailable.

## 4. Tables

- `hackathons` — main event data + JSON `payload` (participants, winners)
- `participants` — global wallet profiles (`full_name`, `payout_wallet_address` required)
- `hackathon_registrations` — per-event roster with `status` (registered / shortlisted / winner)
- `proposals` — payout proposals linked to hackathons
- `payouts` — one row per executed winner (`winner_wallet`, `amount_stroops`, `transaction_hash`, `status`)
- `escrows`, `organizers`, `sponsors`, `payouts`, `chain_transactions`, `idempotency_keys`, `audit_logs`

## 5. Security note

RLS is enabled on all core tables. The publishable (`anon`) key may **SELECT** `hackathons` only. It cannot insert, update, or delete, and it cannot read organizers, sponsors, participants, proposals, payouts, or related PII tables. Mutations run exclusively through Next.js `/api/*` routes with `SUPABASE_SERVICE_ROLE_KEY`.
