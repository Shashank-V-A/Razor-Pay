import { NextResponse } from "next/server";
import { handlePropose } from "@/lib/backend/escrowHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, txHash: "", error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const payload = await handlePropose(body);
  return NextResponse.json(payload, { status: payload.success ? 200 : 400 });
}
