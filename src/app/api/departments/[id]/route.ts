import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { departments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

// PUT /api/departments/[id] — 编辑部门（仅超级管理员）
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const dept = await db.query.departments.findFirst({
    where: eq(departments.id, params.id),
  });
  if (!dept) {
    return NextResponse.json({ error: "部门不存在" }, { status: 404 });
  }

  const { name, code, parentId, sort, remark } = await req.json();

  if (code && code !== dept.code) {
    const existing = await db.query.departments.findFirst({
      where: eq(departments.code, code),
    });
    if (existing) {
      return NextResponse.json({ error: "部门编号已存在" }, { status: 409 });
    }
  }

  const [updated] = await db
    .update(departments)
    .set({
      name: name ?? dept.name,
      code: code ?? dept.code,
      parentId: parentId !== undefined ? parentId : dept.parentId,
      sort: sort ?? dept.sort,
      remark: remark !== undefined ? remark : dept.remark,
    })
    .where(eq(departments.id, params.id))
    .returning();

  return NextResponse.json(updated);
}

// DELETE /api/departments/[id] — 删除部门（仅超级管理员）
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const dept = await db.query.departments.findFirst({
    where: eq(departments.id, params.id),
  });
  if (!dept) {
    return NextResponse.json({ error: "部门不存在" }, { status: 404 });
  }

  // 检查是否有子部门
  const child = await db.query.departments.findFirst({
    where: eq(departments.parentId, params.id),
  });
  if (child) {
    return NextResponse.json({ error: "该部门下存在子部门，无法删除" }, { status: 400 });
  }

  // 检查是否有用户
  const userInDept = await db.query.users.findFirst({
    where: eq(users.departmentId, params.id),
  });
  if (userInDept) {
    return NextResponse.json({ error: "该部门下存在员工，无法删除" }, { status: 400 });
  }

  await db.delete(departments).where(eq(departments.id, params.id));
  return NextResponse.json({ ok: true });
}