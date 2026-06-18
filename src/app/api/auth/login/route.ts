import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/jwt";
import { verifyCsrf } from "@/lib/csrf";

const MAX_ATTEMPTS = 6;

export async function POST(req: Request) {
  const { phone, password, csrfToken } = await req.json();

  if (!(await verifyCsrf(csrfToken))) {
    return NextResponse.json({ error: "无效的请求" }, { status: 403 });
  }

  if (!phone || !password) {
    return NextResponse.json({ error: "手机号或密码错误" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.phone, phone),
  });

  if (!user) {
    return NextResponse.json({ error: "手机号或密码错误" }, { status: 401 });
  }

  // 检查是否被锁定
  if (user.status === "inactive" && user.lockedAt) {
    return NextResponse.json({ error: "账号已被锁定，请联系管理员" }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const newAttempts = user.loginAttempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      await db
        .update(users)
        .set({ loginAttempts: newAttempts, status: "inactive", lockedAt: new Date() })
        .where(eq(users.id, user.id));
      return NextResponse.json({ error: "密码错误次数过多，账号已被锁定" }, { status: 403 });
    }
    await db
      .update(users)
      .set({ loginAttempts: newAttempts })
      .where(eq(users.id, user.id));
    return NextResponse.json({ error: `手机号或密码错误，还剩${MAX_ATTEMPTS - newAttempts}次机会` }, { status: 401 });
  }

  // 登录成功，重置尝试次数
  if (user.loginAttempts > 0) {
    await db
      .update(users)
      .set({ loginAttempts: 0, lockedAt: null })
      .where(eq(users.id, user.id));
  }

  await createSession({
    id: user.id,
    name: user.name,
    employeeId: user.employeeId,
    phone: user.phone,
    role: user.role,
    departmentId: user.departmentId,
  });
  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      employeeId: user.employeeId,
      phone: user.phone,
      role: user.role,
      departmentId: user.departmentId,
    },
  });
}