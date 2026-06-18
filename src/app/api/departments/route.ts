import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { departments } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

// GET /api/departments — 部门列表（平铺，按 sort 排序）
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const list = await db
    .select()
    .from(departments)
    .orderBy(asc(departments.sort));

  return NextResponse.json(list);
}

// POST /api/departments — 创建部门（仅超级管理员）
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { name, code, parentId, sort } = await req.json();

  if (!name || !code) {
    return NextResponse.json({ error: "部门名称和编号不能为空" }, { status: 400 });
  }

  const existing = await db.query.departments.findFirst({
    where: eq(departments.code, code),
  });
  if (existing) {
    return NextResponse.json({ error: "部门编号已存在" }, { status: 409 });
  }

  const [dept] = await db
    .insert(departments)
    .values({
      name,
      code,
      parentId: parentId || null,
      sort: sort || "0",
    })
    .returning();

  return NextResponse.json(dept, { status: 201 });
}