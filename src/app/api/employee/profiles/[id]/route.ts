import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { employeeProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const profile = await db.query.employeeProfiles.findFirst({
    where: eq(employeeProfiles.id, params.id),
  });
  if (!profile) {
    return NextResponse.json({ error: "员工不存在" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json();
  const [updated] = await db
    .update(employeeProfiles)
    .set(body)
    .where(eq(employeeProfiles.id, params.id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  await db
    .delete(employeeProfiles)
    .where(eq(employeeProfiles.id, params.id));

  return NextResponse.json({ ok: true });
}