import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/jwt";
import { verifyCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  const { username, password, csrfToken } = await req.json();

  if (!(await verifyCsrf(csrfToken))) {
    return NextResponse.json({ error: "无效的请求" }, { status: 403 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  await createSession(String(user.id));
  return NextResponse.json({ ok: true });
}