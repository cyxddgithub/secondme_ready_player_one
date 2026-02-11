import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { getUserInfo } from "@/lib/secondme";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const result = await getUserInfo(accessToken);
  return NextResponse.json(result);
}
