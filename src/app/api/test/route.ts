import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 测试能否查询
    const users = await prisma.user.findMany();
    return NextResponse.json({
      success: true,
      userCount: users.length,
      users: users
    });
  } catch (error) {
    console.error("测试失败:", error);
    return NextResponse.json({
      success: false,
      error: String(error),
      type: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 });
  }
}