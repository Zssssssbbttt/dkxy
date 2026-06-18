import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users, menus } from "../src/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";

const SUPER_ADMIN = {
  employeeId: "ADMIN001",
  phone: "13800000000",
  password: "admin123",
  name: "超级管理员",
  role: "super_admin" as const,
};

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_POSTGRES,
  });
  const db = drizzle(pool);

  // 1. 超级管理员
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.employeeId, SUPER_ADMIN.employeeId))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log("超级管理员已存在，跳过");
  } else {
    const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, 10);
    await db.insert(users).values({
      employeeId: SUPER_ADMIN.employeeId,
      phone: SUPER_ADMIN.phone,
      password: passwordHash,
      name: SUPER_ADMIN.name,
      role: SUPER_ADMIN.role,
    });
    console.log(`超级管理员创建成功: ${SUPER_ADMIN.phone}`);
  }

  // 2. 初始菜单
  const existingMenu = await db
    .select()
    .from(menus)
    .where(eq(menus.name, "后台管理"))
    .limit(1);

  if (existingMenu.length > 0) {
    console.log("初始菜单已存在，跳过");
  } else {
    const [admin] = await db
      .insert(menus)
      .values({ name: "后台管理", sort: "1" })
      .returning();

    await db.insert(menus).values({
      name: "菜单配置",
      path: "/admin/menus",
      parentId: admin.id,
      sort: "1",
    });

    console.log("初始菜单创建成功");
  }

  await pool.end();
  console.log("Seed 完成");
}

seed().catch((err) => {
  console.error("Seed 失败:", err);
  process.exit(1);
});