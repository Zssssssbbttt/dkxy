import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { menus } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

// PUT /api/menus/[id] — 编辑菜单（仅超级管理员）
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const menu = await db.query.menus.findFirst({
    where: eq(menus.id, params.id),
  });
  if (!menu) {
    return NextResponse.json({ error: "菜单不存在" }, { status: 404 });
  }

  const { name, path, icon, parentId, sort, status } = await req.json();

  if (parentId === params.id) {
    return NextResponse.json({ error: "上级菜单不能是自己" }, { status: 400 });
  }

  const [updated] = await db
    .update(menus)
    .set({
      name: name ?? menu.name,
      path: path !== undefined ? path : menu.path,
      icon: icon !== undefined ? icon : menu.icon,
      parentId: parentId !== undefined ? parentId : menu.parentId,
      sort: sort ?? menu.sort,
      status: status ?? menu.status,
    })
    .where(eq(menus.id, params.id))
    .returning();

  return NextResponse.json(updated);
}

// DELETE /api/menus/[id] — 删除菜单（仅超级管理员）
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const menu = await db.query.menus.findFirst({
    where: eq(menus.id, params.id),
  });
  if (!menu) {
    return NextResponse.json({ error: "菜单不存在" }, { status: 404 });
  }

  // 检查是否有子菜单
  const child = await db.query.menus.findFirst({
    where: eq(menus.parentId, params.id),
  });
  if (child) {
    return NextResponse.json({ error: "该菜单下存在子菜单，无法删除" }, { status: 400 });
  }

  await db.delete(menus).where(eq(menus.id, params.id));
  return NextResponse.json({ ok: true });
}