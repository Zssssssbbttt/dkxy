import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { employeeProfiles } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const list = await db
    .select({
      id: employeeProfiles.id,
      name: employeeProfiles.name,
      employeeId: employeeProfiles.employeeId,
    })
    .from(employeeProfiles)
    .orderBy(asc(employeeProfiles.employeeId));

  return NextResponse.json(list);
}