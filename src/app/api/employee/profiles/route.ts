import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { employeeProfiles } from "@/db/schema";
import { users } from "@/db/schema";
import { eq, ilike, or, asc, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");
  const search = searchParams.get("search");
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 20;

  let where: ReturnType<typeof eq> | undefined;
  if (departmentId) {
    where = eq(employeeProfiles.departmentId, departmentId);
  }

  let list;
  let totalResult;

  if (search) {
    list = await db
      .select()
      .from(employeeProfiles)
      .where(
        or(
          ilike(employeeProfiles.name, `%${search}%`),
          ilike(employeeProfiles.employeeId, `%${search}%`)
        )
      )
      .orderBy(asc(employeeProfiles.employeeId))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeProfiles)
      .where(
        or(
          ilike(employeeProfiles.name, `%${search}%`),
          ilike(employeeProfiles.employeeId, `%${search}%`)
        )
      );
  } else if (where) {
    list = await db
      .select()
      .from(employeeProfiles)
      .where(where)
      .orderBy(asc(employeeProfiles.employeeId))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeProfiles)
      .where(where);
  } else {
    list = await db
      .select()
      .from(employeeProfiles)
      .orderBy(asc(employeeProfiles.employeeId))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeProfiles);
  }

  return NextResponse.json({
    list,
    total: Number(totalResult[0]?.count ?? 0),
    page,
    pageSize,
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const body = await req.json();

  // 如果没传 userId，创建新 users 账号
  let userId = body.userId;
  if (!userId) {
    if (!body.phone || !body.password) {
      return NextResponse.json(
        { error: "手机号和密码不能为空" },
        { status: 400 }
      );
    }
    const hashed = await bcrypt.hash(body.password, 10);
    const [newUser] = await db
      .insert(users)
      .values({
        employeeId: body.employeeId,
        phone: body.phone,
        password: hashed,
        name: body.name,
        role: "user",
      })
      .returning();
    userId = newUser.id;
  }

  // 检查工号是否重复
  const existing = await db.query.employeeProfiles.findFirst({
    where: eq(employeeProfiles.employeeId, body.employeeId),
  });
  if (existing) {
    return NextResponse.json({ error: "工号已存在" }, { status: 409 });
  }

  const [profile] = await db
    .insert(employeeProfiles)
    .values({
      userId,
      employeeId: body.employeeId,
      name: body.name,
      namePinyin: body.namePinyin,
      nameEn: body.nameEn || "",
      gender: body.gender,
      birthDate: body.birthDate,
      ethnicity: body.ethnicity,
      phone: body.phone,
      nativePlace: body.nativePlace,
      politicalStatus: body.politicalStatus,
      departmentId: body.departmentId,
      position: body.position,
      jobLevel: body.jobLevel,
      supervisorId: body.supervisorId || null,
      workLocation: body.workLocation,
      costCenter: body.costCenter,
      entryDate: body.entryDate,
      regularDate: body.regularDate,
      contractType: body.contractType,
      signDate: body.signDate,
      contractPeriod: body.contractPeriod,
      renewalRemind: body.renewalRemind ?? false,
      contractFile: body.contractFile || "",
      education: body.education || null,
      workHistory: body.workHistory || null,
      projectExp: body.projectExp || null,
      languages: body.languages || null,
      certificates: body.certificates || null,
      skills: body.skills || null,
      parentNames: body.parentNames || null,
      parentPhones: body.parentPhones || null,
    })
    .returning();

  return NextResponse.json(profile, { status: 201 });
}