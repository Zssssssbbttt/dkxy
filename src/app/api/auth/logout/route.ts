import { NextResponse } from "next/server";
import { destroySession } from "@/lib/jwt";
import { verifyCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  const { csrfToken } = await req.json();

  if (!(await verifyCsrf(csrfToken))) {
    return NextResponse.json({ error: "无效的请求" }, { status: 403 });
  }

  await destroySession();
  return NextResponse.json({ ok: true });
}