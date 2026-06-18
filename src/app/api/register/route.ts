import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { phone, password, name, employeeId } = await req.json();

    if (!phone || !password || !name || !employeeId) {
      return NextResponse.json({ error: "手机号、密码、姓名、员工编号不能为空" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码长度不能少于6位" }, { status: 400 });
    }

    const existingPhone = await db.query.users.findFirst({
      where: eq(users.phone, phone),
    });
    if (existingPhone) {
      return NextResponse.json({ error: "手机号已注册" }, { status: 409 });
    }

    const existingEmployeeId = await db.query.users.findFirst({
      where: eq(users.employeeId, employeeId),
    });
    if (existingEmployeeId) {
      return NextResponse.json({ error: "员工编号已存在" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await db.insert(users).values({
      phone,
      password: hashed,
      name,
      employeeId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error("注册失败:", e);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}