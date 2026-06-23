import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { menus } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

interface MenuTree {
  id: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  type: "menu" | "button";
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
      nameEn: m.nameEn ?? null,
      code: m.code ?? null,
      type: m.type as "menu" | "button",
      path: m.path ?? null,
      icon: m.icon ?? null,
      children: buildTree(list, m.id),
    }));
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const flat = searchParams.get("flat") === "true";

  const list = await db
    .select()
    .from(menus)
    .orderBy(asc(menus.sort));

  if (flat) {
    return NextResponse.json(list);
  }

  const activeList = list.filter((m) => m.status === "active");
  const tree = buildTree(activeList, null);
  return NextResponse.json(tree);
}

// POST /api/menus — 创建菜单（仅超级管理员）
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { name, nameEn, code, type, path, icon, parentId, sort } =
    await req.json();

  if (!name || !code || !type) {
    return NextResponse.json(
      { error: "菜单名称、编号、类型不能为空" },
      { status: 400 }
    );
  }

  const [menu] = await db
    .insert(menus)
    .values({
      name,
      nameEn: nameEn || null,
      code,
      type,
      path: path || null,
      icon: icon || null,
      parentId: parentId || null,
      sort: sort || "0",
    })
    .returning();

  return NextResponse.json(menu, { status: 201 });
}