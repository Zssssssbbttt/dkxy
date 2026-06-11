import { NextResponse } from "next/server";
import { setCsrfCookie } from "@/lib/csrf";

export async function GET() {
  const csrfToken = await setCsrfCookie();
  return NextResponse.json({ csrfToken });
}