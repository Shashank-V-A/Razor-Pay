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

The `/api/agent/tick` orchestration loop watches event timelines, notifies organizer/sponsor, and after dual approval runs payment + git evaluators before Razorpay payouts.
