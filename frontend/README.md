# PrizeVault (Next.js)

Vercel **Root Directory** must be `frontend` (this folder).

## Vercel project settings (required)

In **Project → Settings → Build & Deployment**:

| Setting | Value |
|---------|--------|
| Framework Preset | **Next.js** |
| Root Directory | `frontend` |
| Build Command | `next build` (or default) |
| Output Directory | **leave empty** (do **not** use `dist`) |
| Install Command | `npm install` (default) |

If Output Directory is still `dist` from the old Vite app, the build will succeed then fail with “No Output Directory named dist”. Clear that field and redeploy.

## Env vars

Set in Vercel → Settings → Environment Variables (Production + Preview):

### Supabase (required for hackathons, registration, payouts)

These are **also baked into `vercel.json` and project defaults** so production works even if you skip the dashboard — override only for a different Supabase project.

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mjlbcskcsrxkjycjpdyh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your publishable key from Supabase → Settings → API |

Required for creating events, registrations, and payouts (server-only):

| Variable | Notes |
|----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` | Never expose to the client. Needed after `004_tighten_rls.sql`. |

Run SQL migrations once on the Supabase project: see `../supabase/README.md`.

After deploy, confirm: `GET /api/health` → `"supabaseConfigured": true`.

### Stellar / escrow

- `SOROBAN_CONTRACT_ID`
- `SPONSOR_SECRET_KEY`
- `ORGANIZER_SECRET_KEY`
- `STELLAR_RPC_URL` (optional)
- **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`** — required for **Freighter Mobile** (phone). Free ID from [Reown Cloud](https://dashboard.walletconnect.com/). Without it, only the desktop Freighter extension works.

## Wallet connect

| Device | How |
|--------|-----|
| Desktop | [Freighter browser extension](https://www.freighter.app/) |
| Phone | Freighter Mobile app + WalletConnect Project ID above → tap **Connect Stellar wallet** → approve in Freighter |

## Local

```bash
# from prizevault/frontend
echo NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id >> .env.local
npm run dev
# → http://localhost:3000
```
