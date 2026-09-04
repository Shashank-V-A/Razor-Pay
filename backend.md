## Backend Overview (Stellar)

The Next.js app (`frontend/`, `npm run dev`) holds organizer/sponsor secret keys for **testnet** and invokes the Soroban escrow contract via App Router handlers under `/api/escrow/*`. Classic CLI scripts remain available for the 2-of-2 account flow.

### HTTP API (Soroban)

| Method | Path | Signer | Contract method |
|--------|------|--------|-----------------|
| POST | `/api/escrow/propose` | Organizer | `propose_release` |
| POST | `/api/escrow/approve` | Sponsor | `approve_release` |
| POST | `/api/escrow/execute` | Organizer | `execute_release` |
| GET | `/api/health` | — | Config probe |

Request/response shape:

```json
// propose body
{ "proposal_id": 1710000000000, "payouts": [{ "winner_address": "G...", "amount": "1000000000" }] }

// approve / execute body
{ "proposal_id": 1710000000000 }

// response
{ "success": true, "txHash": "...", "error": "" }
```

`amount` is **stroops** (1 XLM = 10_000_000). The React `useEscrow()` hook converts XLM → stroops before calling the API.

Shared invoke logic lives in `src/soroban/escrowClient.ts` and `src/api/escrowHandlers.ts` (imported by Next route handlers).

### Runtime configuration

- `STELLAR_HORIZON_URL`
- `STELLAR_RPC_URL` (Soroban RPC, default testnet)
- `STELLAR_NETWORK_PASSPHRASE`
- `SPONSOR_SECRET_KEY`
- `ORGANIZER_SECRET_KEY`
- `SOROBAN_CONTRACT_ID` (optional; falls back to `escrow-state.json` / default id)
- `PORT` (Next default `3000`)

Copy `.env.example` → `.env` (repo root). Next.js loads it from the parent folder.

### Script mapping (classic account)

- `npm run create-escrow` - create and lock escrow signer policy.
- `npm run deposit -- --amount=<xlm>` - sponsor deposit.
- `npm run release -- --winner=<G...> --amount=<xlm>` - payout release.
- `npm run agent` - approval-gated orchestration wrapper.
- `npm run deploy-contract` - store deployed Soroban contract id.

### Production recommendations

- Move private keys to secure signer infrastructure (HSM/KMS).
- Prefer wallet-signed transactions in the browser instead of server-side private keys.
- Add idempotent payout records and replay protection.
- Add timeout/refund path for unresolved approvals.
