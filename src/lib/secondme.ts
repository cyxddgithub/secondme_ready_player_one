/**
 * Second Me API 客户端
 * Base URL: https://app.mindos.com/gate/lab
 * OAuth2: https://go.second.me/oauth/
 *
 * API 路径规则:
 * - OAuth Token: {base_url}/api/oauth/token
 * - SecondMe API: {base_url}/api/secondme/{endpoint}
 */

const API_BASE_URL = process.env.SECONDME_API_BASE_URL || "https://app.mindos.com/gate/lab";
const OAUTH_URL = process.env.SECONDME_OAUTH_URL || "https://go.second.me/oauth/";
const TOKEN_ENDPOINT = process.env.SECONDME_TOKEN_ENDPOINT || `${API_BASE_URL}/api/oauth/token`;

/**
 * 自动推断应用 base URL（用于构建 redirect_uri）
 * 优先级: SECONDME_REDIRECT_URI > NEXTAUTH_URL > VERCEL_PROJECT_PRODUCTION_URL > VERCEL_URL > localhost
 *
 * 注意: VERCEL_URL 是部署专属 URL（每次部署不同），不适合用作 OAuth 回调地址。
 * VERCEL_PROJECT_PRODUCTION_URL 是稳定的生产域名，应优先使用。
 */
function getRedirectUri(): string {
  if (process.env.SECONDME_REDIRECT_URI) {
    return process.env.SECONDME_REDIRECT_URI;
  }
  if (process.env.NEXTAUTH_URL) {
    return `${process.env.NEXTAUTH_URL}/api/auth/callback`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/auth/callback`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/auth/callback`;
  }
  return "http://localhost:3000/api/auth/callback";
}

export const secondMeConfig = {
  clientId: process.env.SECONDME_CLIENT_ID || "",
  clientSecret: process.env.SECONDME_CLIENT_SECRET || "",
  redirectUri: getRedirectUri(),
  apiBaseUrl: API_BASE_URL,
  oauthUrl: OAUTH_URL,
  tokenEndpoint: TOKEN_ENDPOINT,
};

/** 构建 OAuth2 授权 URL */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: secondMeConfig.clientId,
    redirect_uri: secondMeConfig.redirectUri,
    state,
    response_type: "code",
    scope: "user.info user.info.shades user.info.softmemory chat note.add",
  });
  return `${secondMeConfig.oauthUrl}?${params.toString()}`;
}

/** 用授权码换取 Token（自动尝试 JSON 和 form-urlencoded 格式） */
export async function exchangeCodeForToken(code: string) {
  const params = {
    grant_type: "authorization_code",
    code,
    client_id: secondMeConfig.clientId,
    client_secret: secondMeConfig.clientSecret,
    redirect_uri: secondMeConfig.redirectUri,
  };

  console.log("[OAuth] Token endpoint:", secondMeConfig.tokenEndpoint);
  console.log("[OAuth] Redirect URI:", secondMeConfig.redirectUri);

  // 先尝试 JSON 格式
  let res = await fetch(secondMeConfig.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  console.log("[OAuth] JSON response status:", res.status);

  // 如果 JSON 格式返回 404/405，尝试 form-urlencoded（标准 OAuth2 格式）
  if (res.status === 404 || res.status === 405) {
    console.log("[OAuth] JSON got", res.status, "- trying form-urlencoded...");
    res = await fetch(secondMeConfig.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });
    console.log("[OAuth] form-urlencoded response status:", res.status);
  }

  const result = await res.json();
  if (!res.ok) {
    console.error("[OAuth] Token exchange failed. Status:", res.status, "Body:", JSON.stringify(result));
  }
  return result;
}

/** 刷新 Token */
export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(secondMeConfig.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: secondMeConfig.clientId,
      client_secret: secondMeConfig.clientSecret,
    }),
  });
  return res.json();
}

/** 获取用户信息 */
export async function getUserInfo(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/user/info`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

/** 获取用户个性 Shades */
export async function getUserShades(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/user/shades`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

/** 获取用户 Soft Memory */
export async function getUserSoftMemory(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/user/softmemory`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

/** 获取聊天会话列表 */
export async function getChatSessions(accessToken: string) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/chat/session/list`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

/** 获取会话消息 */
export async function getChatMessages(accessToken: string, sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/chat/session/messages?sessionId=${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

/** Chat 流式请求（SSE） */
export async function chatStream(
  accessToken: string,
  params: {
    message: string;
    systemPrompt?: string;
    sessionId?: string;
    appId?: string;
  }
) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  return res;
}

/** Act 流式请求（SSE） - 用于 Agent 行为判断 */
export async function actStream(
  accessToken: string,
  params: {
    message: string;
    systemPrompt?: string;
    sessionId?: string;
    actionControl?: string;
    appId?: string;
  }
) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/act/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  return res;
}

/** 添加笔记 */
export async function addNote(accessToken: string, content: string) {
  const res = await fetch(`${API_BASE_URL}/api/secondme/note/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
  return res.json();
}
