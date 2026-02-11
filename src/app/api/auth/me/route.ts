import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  return NextResponse.json({
    code: 0,
    data: {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      secondmeUserId: user.secondmeUserId,
      createdAt: user.createdAt,
    },
  });
}
