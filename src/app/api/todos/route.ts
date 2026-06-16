import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/jwt";
import { db } from "@/lib/drizzle";
import { todos } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { todoCreateSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const uid = Number(userId);
  const conditions = [eq(todos.userId, uid)];
  if (status === "pending") conditions.push(eq(todos.completed, false));
  if (status === "done") conditions.push(eq(todos.completed, true));

  const result = await db
    .select()
    .from(todos)
    .where(and(...conditions))
    .orderBy(desc(todos.createdAt));
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = todoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [todo] = await db
    .insert(todos)
    .values({ title: parsed.data.title, userId: Number(userId) })
    .returning();
  return NextResponse.json(todo, { status: 201 });
}