import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/secondme";

export async function GET() {
  const state = crypto.randomUUID();
  const authUrl = buildAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
