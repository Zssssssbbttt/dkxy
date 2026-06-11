import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { todoCreateSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { userId };
  if (status === "pending") where.completed = false;
  if (status === "done") where.completed = true;

  const todos = await prisma.todo.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(todos);
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

  const todo = await prisma.todo.create({
    data: { title: parsed.data.title, userId },
  });
  return NextResponse.json(todo, { status: 201 });
}
