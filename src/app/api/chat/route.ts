import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { chatStream } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const { message, systemPrompt, sessionId, appId } = body;

  if (!message) {
    return NextResponse.json({ code: 400, message: "消息不能为空" }, { status: 400 });
  }

  const response = await chatStream(accessToken, { message, systemPrompt, sessionId, appId });

  // 透传 SSE 流
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
