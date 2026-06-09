# 从零到一：Drizzle + PostgreSQL 功能开发完整流程

## 前置准备（一次性）

### 1. 安装 PostgreSQL

确保 `pg_ctl` 和 `psql` 可用：

```bash
pg_ctl --version
psql --version
```

### 2. 安装依赖包

```bash
npm install pg drizzle-orm
npm install -D drizzle-kit @types/pg
```

三个包各司其职：

| 包 | 类型 | 作用 |
|---|---|---|
| `pg` | 运行时依赖 | Node.js 连接 PostgreSQL 的底层驱动 |
| `drizzle-orm` | 运行时依赖 | Drizzle ORM 核心，提供 `drizzle()`、查询方法、`eq()` 等 |
| `drizzle-kit` | 开发依赖 | CLI 工具，`npx drizzle-kit push` 同步表结构到数据库 |

### 3. 安装 pgAdmin 4（可选）

图形化管理工具，连接参数：
- Host: `localhost`
- Port: `5432`
- Username: `postgres`
- Maintenance database: `postgres`

连上后可以在左侧树形菜单看到所有数据库和表。

---

## 功能开发流程（每次新功能都走这条线）

流程图：

```
定义表结构 → 配置 Drizzle 客户端 → 配置 CLI → 设置环境变量 → 同步表结构 → 写 API 路由 → 前端调用
```

以下以「用户注册」功能为例，逐步说明。

---

### 第 1 步：定义表结构（`src/db/schema.ts`）

这是"建表图纸"。用 Drizzle 的 pg-core 定义表、字段、约束：

```ts
import { pgTable, serial, varchar, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
});
```

**你在做什么**：告诉 Drizzle "数据库里应该有一张叫 `users` 的表，有这 3 个字段"。

---

### 第 2 步：创建 Drizzle 客户端（`src/lib/drizzle.ts`）

这一步连接 Drizzle ORM 和 PostgreSQL：

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const globalForPool = globalThis as unknown as { pool: Pool };
const pool =
  globalForPool.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL_POSTGRES,
  });
if (process.env.NODE_ENV !== "production") globalForPool.pool = pool;

export const db = drizzle(pool, { schema });
```

**你在做什么**：
- `new Pool({ connectionString })` — 创建一个 PostgreSQL 连接池
- `globalThis` 缓存 — 防止 Next.js 热更新时重复创建连接池（HMR 每次重新加载模块都会执行 `new Pool()`，不缓存会耗尽连接）
- `drizzle(pool, { schema })` — 把连接池和表定义绑定在一起，导出 `db` 对象

**导入了 schema 之后**，`db` 就有了类型推导能力，后续可以用 `db.query.users.findFirst()` 这种带自动补全的 API。

---

### 第 3 步：配置 drizzle-kit（`drizzle.config.ts`）

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",   // schema 文件位置
  out: "./drizzle",                // 迁移文件输出目录
  dialect: "postgresql",           // 数据库方言
  dbCredentials: {
    url: process.env.DATABASE_URL_POSTGRES!,
  },
});
```

**你在做什么**：告诉 `drizzle-kit` CLI 工具三件事：
1. 去哪个文件读取表定义（`schema`）
2. 连哪个数据库（`dbCredentials.url`）
3. 用哪种数据库方言（`dialect: "postgresql"`）

**何时用到**：只有在运行 `npx drizzle-kit push` 时才会读这个文件。项目运行时不需要它。

---

### 第 4 步：设置环境变量（`.env`）

```
DATABASE_URL_POSTGRES="postgresql://postgres@localhost:5432/todo_project"
```

**连接字符串解读**：
```
postgresql://用户名@主机:端口/数据库名
postgresql://postgres@localhost:5432/todo_project
```

- `postgres` — PostgreSQL 默认超级用户
- `localhost:5432` — 本机 PostgreSQL 默认端口
- `todo_project` — 你给项目起的数据库名

---

### 第 5 步：同步表结构到数据库

```bash
# 先启动 PostgreSQL
npm run db:start

# 同步 schema 到数据库
npx drizzle-kit push
```

**你在做什么**：
- `db:start` — 启动 PostgreSQL 服务进程（不注册 Windows 服务，手动启动）
- `drizzle-kit push` — 读取 `drizzle.config.ts` → 找到 `schema.ts` → 对比数据库当前状态 → 自动创建或修改表

**重要：push 不是只执行一次**。每次修改 `schema.ts`（加字段、改类型、加表），都要重新运行 `npx drizzle-kit push` 来同步到数据库。把它理解成 `git push`——改了代码要 push，改了表结构也要 push。

执行后，打开 pgAdmin 就能看到数据库和表。

---

### 第 6 步：写 API 路由（`src/app/api/register/route.ts`）

```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  // 校验
  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码长度不能少于6位" }, { status: 400 });
  }

  // 查重
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  // 哈希密码并插入
  const hashed = await bcrypt.hash(password, 10);
  await db.insert(users).values({ username, password: hashed });

  return NextResponse.json({ success: true }, { status: 201 });
}
```

**常用 Drizzle API 速查**：

```ts
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// 查一条
const user = await db.query.users.findFirst({
  where: eq(users.username, "zhangsan"),
});

// 查多条
const all = await db.query.users.findMany();

// 插入
await db.insert(users).values({ username: "zhangsan", password: "hashed..." });

// 更新
await db.update(users)
  .set({ password: "new-hashed..." })
  .where(eq(users.id, 1));

// 删除
await db.delete(users).where(eq(users.id, 1));
```

**关键点**：使用 `db.query.表名.xxx()` 而不是 `db.select().from()`，前者类型推导更好、有自动补全。

---

### 第 7 步：前端调用

```tsx
// 客户端组件中
const res = await fetch("/api/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password }),
});

if (res.ok) {
  router.push("/login");
}
```

---

## 日常启动流程

```bash
# 1. 启动 PostgreSQL
npm run db:start

# 2. 启动项目
npm run dev

# 3. 停止 PostgreSQL（关机前）
npm run db:stop
```

---

## 优化建议

### 1. 添加时间戳字段

社区惯例：每张表都应有 `created_at` 和 `updated_at`：

```ts
import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 2. 添加 email 字段

大多数应用注册时需要邮箱，用于找回密码、通知等：

```ts
email: varchar("email", { length: 255 }).notNull().unique(),
```

### 3. 用户名 trim 和格式校验

注册时自动去掉首尾空格，限制用户名格式：

```ts
const username = rawUsername.trim();
if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
  return NextResponse.json({ error: "用户名格式不正确" }, { status: 400 });
}
```

### 4. 清理调试日志

生产代码中不应出现 `console.log(username, password)`，会泄露用户密码到服务器日志。

### 5. 密码强度增强

当前只校验了最小长度 6，建议增加复杂度要求（大小写字母 + 数字）。

### 6. 错误处理不要暴露内部信息

已经是 `"注册失败，请稍后重试"`（而不是 `e.message`），这是对的。