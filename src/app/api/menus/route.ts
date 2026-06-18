import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { menus } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

interface MenuTree {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  children: MenuTree[];
}

function buildTree(
  list: typeof menus.$inferSelect[],
  parentId: string | null
): MenuTree[] {
  return list
    .filter((m) => m.parentId === parentId)
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map((m) => ({
      id: m.id,
      name: m.name,
      path: m.path ?? null,
      icon: m.icon ?? null,
      children: buildTree(list, m.id),
    }));
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const list = await db
    .select()
    .from(menus)
    .where(eq(menus.status, "active"))
    .orderBy(asc(menus.sort));

  const tree = buildTree(list, null);

  return NextResponse.json(tree);
}

// POST /api/menus — 创建菜单（仅超级管理员）
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { name, path, icon, parentId, sort } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "菜单名称不能为空" }, { status: 400 });
  }

  const [menu] = await db
    .insert(menus)
    .values({
      name,
      path: path || null,
      icon: icon || null,
      parentId: parentId || null,
      sort: sort || "0",
    })
    .returning();

  return NextResponse.json(menu, { status: 201 });
}