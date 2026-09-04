import { INR_VAULT_ID } from "./config";
import { createOrder, createPayout } from "./razorpayClient";
import {
  complianceRecord,
  evaluateGit,
  evaluatePayment,
  type WinnerLike,
} from "../agent/evaluators";
import { isValidPayoutDestination } from "@/client/constants/escrow";

export interface ApiSuccess {
  success: true;
  txHash: string;
  error: "";
  vaultId?: string;
  gates?: unknown;
}

export interface ApiFailure {
  success: false;
  txHash: "";
  error: string;
}

export type ApiResponse = ApiSuccess | ApiFailure;

export function ok(txHash: string, extra: Partial<ApiSuccess> = {}): ApiSuccess {
  return { success: true, txHash, error: "", vaultId: INR_VAULT_ID, ...extra };
}

export function fail(error: unknown): ApiFailure {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Prize vault request failed";
  return { success: false, txHash: "", error: message };
}

export function parseProposalId(body: Record<string, unknown>): number | string {
  const raw = body.proposal_id ?? body.proposalId;
  if (raw === undefined || raw === null || raw === "") {
    throw new Error("proposal_id is required");
  }
  if (typeof raw === "number" || typeof raw === "string") return raw;
  throw new Error("proposal_id must be a number or string");
}

export type WinnerPayoutInput = {
  winner_address: string;
  amount: string | number;
};

export function parsePayouts(body: Record<string, unknown>): WinnerPayoutInput[] {
  const raw = body.payouts;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("payouts must be a non-empty array of { winner_address, amount }");
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`payouts[${index}] must be an object`);
    }
    const row = item as Record<string, unknown>;
    const winner_address = String(
      row.winner_address ?? row.winnerAddress ?? row.winner ?? row.payoutAddress ?? "",
    ).trim();
    const amount = row.amount ?? row.prizeAmount ?? row.amount_inr;
    if (!winner_address) {
      throw new Error(`payouts[${index}].winner_address (UPI or bank account) is required`);
    }
    if (!isValidPayoutDestination(winner_address)) {
      throw new Error(`payouts[${index}].winner_address is not a valid UPI VPA or bank account`);
    }
    if (amount === undefined || amount === null || amount === "") {
      throw new Error(`payouts[${index}].amount (INR) is required`);
    }
    return { winner_address, amount: amount as string | number };
  });
}

function payoutsToWinners(payouts: WinnerPayoutInput[], extra: WinnerLike[] = []): WinnerLike[] {
  return payouts.map((p, i) => ({
    payoutAddress: p.winner_address,
    prizeAmount: p.amount,
    name: extra[i]?.name,
    project: extra[i]?.project,
    githubUrl: extra[i]?.githubUrl,
  }));
}

export async function handlePropose(body: Record<string, unknown>): Promise<ApiResponse> {
  try {
    const proposalId = parseProposalId(body);
    const payouts = parsePayouts(body);
    const payment = evaluatePayment(payoutsToWinners(payouts), Number.MAX_SAFE_INTEGER);
    if (!payment.ok) throw new Error(payment.detail);
    const receipt = `prop_inr_${proposalId}`;
    return ok(receipt, { gates: [payment] });
  } catch (error) {
    return fail(error);
  }
}

export async function handleApprove(body: Record<string, unknown>): Promise<ApiResponse> {
  try {
    const proposalId = parseProposalId(body);
    return ok(`appr_inr_${proposalId}`);
  } catch (error) {
    return fail(error);
  }
}

export async function handleExecute(body: Record<string, unknown>): Promise<ApiResponse> {
  try {
    const proposalId = parseProposalId(body);
    const payouts = parsePayouts(body);
    const extraWinners = Array.isArray(body.winners) ? (body.winners as WinnerLike[]) : [];
    const winners = payoutsToWinners(payouts, extraWinners);
    const vaultBalance = Number(body.vaultBalanceInr ?? body.sponsorFundingXlm ?? Number.MAX_SAFE_INTEGER);

    const payment = evaluatePayment(winners, vaultBalance);
    const git = await evaluateGit(extraWinners.length ? extraWinners : winners);
    if (!payment.ok) throw new Error(payment.detail);
    if (!git.ok) throw new Error(git.detail);

    const receipts: string[] = [];
    for (const payout of payouts) {
      const created = await createPayout({
        rupees: Number(payout.amount),
        destination: payout.winner_address,
        idempotencyKey: `pv_${proposalId}_${payout.winner_address}`.slice(0, 48),
      });
      receipts.push(created.id);
    }

    complianceRecord({
      at: new Date().toISOString(),
      stage: "execute",
      hackathonId: String(body.hackathonId || ""),
      detail: `Released ${payouts.length} INR payout(s)`,
      receiptId: receipts.join(","),
      gates: [payment, git],
    });

    return ok(receipts.join(","), { gates: [payment, git] });
  } catch (error) {
    return fail(error);
  }
}

export async function handleFund(body: Record<string, unknown>): Promise<ApiResponse & { amount?: number }> {
  try {
    const amount = Number(body.amount ?? body.amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("amount (INR) must be greater than 0");
    }
    const hackathonId = String(body.hackathonId || body.escrowId || "vault");
    const order = await createOrder(amount, `fund_${hackathonId}`.slice(0, 40));
    return { ...ok(order.id), amount };
  } catch (error) {
    return fail(error);
  }
}
