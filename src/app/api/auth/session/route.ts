import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({ user });
}