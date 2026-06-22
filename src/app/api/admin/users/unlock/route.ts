import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUserId } from "@/lib/jwt";

export async function POST(req: Request) {
  const operatorId = await getSessionUserId();
  if (!operatorId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 校验操作者是否为超级管理员
  const operator = await db.query.users.findFirst({
    where: eq(users.id, operatorId),
  });
  if (!operator || operator.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "缺少userId" }, { status: 400 });
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  await db
    .update(users)
    .set({ loginAttempts: 0, lockedAt: null, status: "active" })
    .where(eq(users.id, userId));

  return NextResponse.json({ ok: true });
}