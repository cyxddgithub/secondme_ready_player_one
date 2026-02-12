import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, getUserInfo } from "@/lib/secondme";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    // 用授权码换取 token
    const tokenResult = await exchangeCodeForToken(code);

    if (tokenResult.code !== 0 || !tokenResult.data) {
      console.error("Token exchange failed:", JSON.stringify(tokenResult));
      // 将详细错误信息传递到前端方便调试
      const errMsg = tokenResult.detail || tokenResult.message || "unknown";
      return NextResponse.redirect(new URL(`/?error=token_exchange_failed&detail=${encodeURIComponent(errMsg)}`, request.url));
    }

    const { accessToken: access_token, refreshToken: refresh_token, expiresIn: expires_in } = tokenResult.data;

    // 获取用户信息
    const userInfoResult = await getUserInfo(access_token);

    if (userInfoResult.code !== 0 || !userInfoResult.data) {
      console.error("Get user info failed:", userInfoResult);
      return NextResponse.redirect(new URL("/?error=user_info_failed", request.url));
    }

    const userInfo = userInfoResult.data;
    const secondmeUserId = userInfo.route || userInfo.email || userInfo.name;

    // 创建或更新用户
    const user = await prisma.user.upsert({
      where: { secondmeUserId },
      update: {
        name: userInfo.name || null,
        avatar: userInfo.avatarUrl || null,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt: new Date(Date.now() + (expires_in || 7200) * 1000),
      },
      create: {
        secondmeUserId,
        name: userInfo.name || null,
        avatar: userInfo.avatarUrl || null,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        tokenExpiresAt: new Date(Date.now() + (expires_in || 7200) * 1000),
      },
    });

    // 设置 session cookie
    await setSession(user.id);

    // 检查是否已有 Agent，决定跳转目标
    const agent = await prisma.agent.findUnique({ where: { userId: user.id } });
    const redirectUrl = agent ? "/agent/career" : "/agent/create";

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=callback_failed", request.url));
  }
}
