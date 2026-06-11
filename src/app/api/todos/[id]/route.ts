import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { todoUpdateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const todo = await prisma.todo.findUnique({ where: { id: params.id } });
  if (!todo || todo.userId !== userId) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = todoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

    const updated = await prisma.todo.update({
      where: { id: params.id },
      data: parsed.data,
    });
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

  const todo = await prisma.todo.findUnique({ where: { id: params.id } });
  if (!todo || todo.userId !== userId) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  await prisma.todo.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
