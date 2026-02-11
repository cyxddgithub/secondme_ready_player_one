import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { actStream } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const { message, actionControl, systemPrompt, sessionId, appId } = body;

  if (!message || !actionControl) {
    return NextResponse.json(
      { code: 400, message: "message 和 actionControl 不能为空" },
      { status: 400 }
    );
  }

  const response = await actStream(accessToken, {
    message,
    actionControl,
    systemPrompt,
    sessionId,
    appId,
  });

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
