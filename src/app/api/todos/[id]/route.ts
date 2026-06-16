import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/jwt";
import { db } from "@/lib/drizzle";
import { todos } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { todoUpdateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "无效ID" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, Number(userId))))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = todoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [updated] = await db
    .update(todos)
    .set(parsed.data)
    .where(eq(todos.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "无效ID" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, Number(userId))))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  await db.delete(todos).where(eq(todos.id, id));
  return NextResponse.json({ success: true });
}