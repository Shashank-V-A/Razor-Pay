# PrizeVault — dual-control hackathon prizes in INR

Blockchain-free prize escrow for Web2 events. Prize funds sit in a **Razorpay INR vault** until **both sponsor and organizer** approve. Agentic gates (timeline, payment math, optional GitHub scorecard) must pass before winners are paid.

## What it solves

Sponsors worry prize money will be misused; organizers do not want to front cash; winners want a guaranteed INR payout. Dual approval plus agents coordinate funding → winners → payout.

## Money path

1. Sponsor funds the prize pool (Razorpay order / mock receipt if keys unset).
2. Organizer proposes winners (UPI or bank account + INR amounts).
3. Sponsor co-approves.
4. Orchestration agent executes payouts (`POST /v1/payouts` when RazorpayX is configured, otherwise mock receipts for demo).

True bank escrow with a trustee is [RazorpayX Escrow+](https://razorpay.com/docs/x/account-types/escrow/). This product demos the same dual-control workflow on test/mock APIs.

## Run locally

```bash
npm install
cd frontend && npm install
```

Create `.env` from `.env.example`. Optional:

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Then from the repo root:

```bash
npm run dev
```

Open http://localhost:3000 (or 3001 if 3000 is taken). Sign in with **email + role** (no crypto wallet).

| Route | Role |
|---|---|
| `/` | Landing |
| `/organizer` | Organizer console |
| `/holder` | Participant |
| `/verifier` | Sponsor |

## Agents

`POST /api/agent/tick` (also GET) is the orchestration loop. Organizer and sponsor dashboards run it on load and every 60s, and show an **Orchestration agent** console.

What the tick does:

1. **Funding** — live or ended event still short of the prize pool → notify the sponsor of remaining ₹.
2. **Timeline** — event ended, no winners → notify organizer (and sponsor).
3. **Propose** — winners saved → remind organizer to propose payout.
4. **Release** — both approved → payment + git gates → RazorpayX payout or `pout_queued_…` if X is unavailable.

The agent **cannot** approve payouts or call Checkout. Dual-control stays in code.

### Verify locally

1. Restart `npm run dev`, sign in as **organizer** (`/issuer`) and **sponsor** (`/verifier`).
2. Confirm the **Orchestration agent** card: last tick time, **Run tick**, and any error (Supabase service role is required to persist).
3. Hit `http://localhost:3000/api/agent/tick` — JSON `actions` + `summary`.
4. **Funding:** live unfunded event with a sponsor email → sponsor inbox “Prize vault still needs funding”.
5. Set event **end date in the past**, no winners → organizer inbox “choose winners”.
6. Save winners → inbox “propose the payout”.
7. Propose + sponsor approve → tick runs gates; console shows `PAYMENT_OK` / `GIT_SKIP` and a receipt. `pout_queued_` means queued, not bank INR.
8. Organizer **Payout** page shows payment gate pass/fail **before** Execute.

