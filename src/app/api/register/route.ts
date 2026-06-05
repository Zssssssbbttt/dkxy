import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongoose";
import { User } from "@/models";

export async function POST(req: Request) {
  try {
    console.log('api/register','注册')
    const { username, password } = await req.json();
    console.log(username,password)

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码长度不能少于6位" }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ username });

    if (existing) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ username, password: hashed });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error("注册失败:", e);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}