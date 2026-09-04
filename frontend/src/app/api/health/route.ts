import { NextResponse } from "next/server";
import { INR_VAULT_ID, isRazorpayLiveConfigured, isRazorpayTestMode } from "@/lib/backend/config";
import {
  getSupabaseConfigSource,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isSupabaseConfigured();
  return NextResponse.json({
    ok: true,
    rail: "INR",
    vaultId: INR_VAULT_ID,
    razorpayConfigured: isRazorpayLiveConfigured(),
    razorpayTestMode: isRazorpayTestMode(),
    supabaseConfigured: configured,
    supabaseUrl: configured ? getSupabaseUrl() : null,
    supabaseConfigSource: getSupabaseConfigSource(),
    hasSupabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  });
}
