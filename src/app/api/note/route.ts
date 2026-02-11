import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth";
import { addNote } from "@/lib/secondme";

export async function POST(request: NextRequest) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json({ code: 400, message: "笔记内容不能为空" }, { status: 400 });
  }

  const result = await addNote(accessToken, content);
  return NextResponse.json(result);
}
