import { NextResponse } from "next/server";
import { buildAuthUrl, secondMeConfig } from "@/lib/secondme";

export async function GET() {
  if (!secondMeConfig.clientId) {
    console.error("OAuth 配置错误: SECONDME_CLIENT_ID 环境变量未设置");
    return NextResponse.json(
      { error: "OAuth 配置错误: 缺少 SECONDME_CLIENT_ID 环境变量" },
      { status: 500 }
    );
  }

  const state = crypto.randomUUID();
  const authUrl = buildAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
