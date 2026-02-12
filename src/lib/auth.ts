import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { refreshAccessToken } from "./secondme";

const SESSION_COOKIE = "session_user_id";

/** 设置登录 session（写入 cookie） */
export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 天
    path: "/",
  });
}

/** 清除登录 session */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** 获取当前登录用户（自动刷新 token） */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) {
    console.log("[Auth] No session cookie found");
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log("[Auth] User not found in DB for id:", userId);
    return null;
  }

  // 检查 token 是否过期，如果过期则刷新
  if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
    console.log("[Auth] Token expired for user:", userId, "expired at:", user.tokenExpiresAt.toISOString());

    if (!user.refreshToken) {
      console.log("[Auth] No refresh token available, user needs to re-login");
      return null;
    }

    try {
      const result = await refreshAccessToken(user.refreshToken);
      if (result.code === 0 && result.data) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken || user.refreshToken,
            tokenExpiresAt: new Date(Date.now() + (result.data.expiresIn || 7200) * 1000),
          },
        });
        console.log("[Auth] Token refreshed successfully for user:", userId);
        return updatedUser;
      }
      console.error("[Auth] Token refresh returned error:", JSON.stringify(result));
      return null;
    } catch (error) {
      console.error("[Auth] Token refresh failed:", error);
      return null;
    }
  }

  return user;
}

/** 获取当前用户的 access token（自动刷新） */
export async function getAccessToken(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.accessToken || null;
}
