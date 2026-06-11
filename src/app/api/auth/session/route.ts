import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/jwt";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(null, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(userId)),
  });

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    user: { id: String(user.id), name: user.username },
  });
}