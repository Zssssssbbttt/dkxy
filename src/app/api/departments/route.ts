import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { departments, employeeProfiles } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

// GET /api/departments — 部门列表（平铺，含员工数，按 sort 排序）
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const list = await db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      parentId: departments.parentId,
      sort: departments.sort,
      status: departments.status,
      createdAt: departments.createdAt,
      updatedAt: departments.updatedAt,
      employeeCount: sql<number>`(
        SELECT COUNT(*) FROM ${employeeProfiles}
        WHERE ${employeeProfiles.departmentId} = ${departments.id}
      )`.mapWith(Number),
    })
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

  const { name, code, parentId, sort, remark } = await req.json();

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
      createdBy: user.id,
      remark: remark || null,
    })
    .returning();

  return NextResponse.json(dept, { status: 201 });
}