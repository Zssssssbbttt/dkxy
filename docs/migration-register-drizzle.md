# 注册功能迁移到 Drizzle + PostgreSQL 修改说明

## 目标

将注册功能从 MongoDB + Mongoose 迁移到 PostgreSQL + Drizzle ORM，保留所有现有 MongoDB 代码不动。

---

## 修改清单

### 1. 新增依赖（`package.json`）

```json
"drizzle-orm": "^x.x.x",   // Drizzle ORM 核心库
"pg": "^x.x.x",             // PostgreSQL 官方 Node.js 驱动
"drizzle-kit": "^x.x.x",    // Drizzle CLI 工具（devDependencies）
"@types/pg": "^x.x.x"       // pg 的 TypeScript 类型（devDependencies）
```

**为什么**：Drizzle 依赖 pg 驱动连接 PostgreSQL，drizzle-kit 用于 schema 同步和迁移。

---

### 2. 新增 `src/db/schema.ts` — 数据库表定义

**为什么放 src/db/**：Drizzle 社区惯例，schema 文件和业务逻辑分开。

**为什么用 serial 做 id**：PostgreSQL 原生自增整数，比 MongoDB 的 ObjectId 更适合关系型数据库，且作为主键索引效率更高。

**为什么 username 用 varchar(255)**：限定长度既满足业务需求，又比 text 类型有更好的索引性能。

**为什么 password 用 text**：bcrypt 生成的哈希值可能很长（60 字符），text 更灵活。

---

### 3. 新增 `src/lib/drizzle.ts` — 数据库连接

**为什么用 Pool 而不是单个 Client**：连接池管理多个连接，自动处理并发请求，适合 Next.js 的服务端场景。

**为什么传入 schema**：让 Drizzle 的 `db.query` API 能自动推导类型，比如 `db.query.users.findFirst()` 返回的类型自动匹配 users 表结构。

---

### 4. 新增 `drizzle.config.ts` — Drizzle CLI 配置

**为什么放项目根目录**：drizzle-kit 默认读取根目录的这个文件，符合惯例。

**为什么用 push 而不是 migrate**：开发阶段用 `push` 直接同步 schema 更快，不需要生成和运行迁移文件。正式上线时可以用 `generate` + `migrate` 保留变更历史。

---

### 5. 修改 `.env` — 新增 PostgreSQL 连接字符串

```
DATABASE_URL_POSTGRES="postgresql://postgres@localhost:5432/todo_project"
```

**为什么新建变量而不是改 DATABASE_URL**：保留 MongoDB 连接给其他仍在使用 Prisma/Mongoose 的代码（Todo CRUD 等）。

**为什么用 postgres 用户**：这是 PostgreSQL 默认的超级用户，本地开发方便。生产环境应创建专用用户。

---

### 6. 修改 `src/app/api/register/route.ts` — 注册接口

| 原来（Mongoose） | 改为（Drizzle） | 原因 |
|---|---|---|
| `import connectDB from "@/lib/mongoose"` | 删除 | 不需要 Mongoose 连接 |
| `import { User } from "@/models"` | `import { users } from "@/db/schema"` | 用 Drizzle schema 定义的表 |
| `await connectDB()` | 删除 | Drizzle 连接池自动管理，不需要手动连接 |
| `User.findOne({ username })` | `db.query.users.findFirst({ where: eq(users.username, username) })` | Drizzle 的查询 API，类型安全 |
| `User.create({ username, password })` | `db.insert(users).values({ username, password })` | Drizzle 的插入 API |

**为什么 Drizzle 不需要手动 connectDB**：pg Pool 在创建时就建立了连接，`db.query` 和 `db.insert` 自动从池中获取连接，用完归还，不需要手动管理。

---

### 7. 修改 `src/lib/auth.ts` — 登录验证

| 原来（Prisma） | 改为（Drizzle） | 原因 |
|---|---|---|
| `import { prisma } from "./prisma"` | `import { db } from "./drizzle"` + `import { users } from "@/db/schema"` + `import { eq } from "drizzle-orm"` | 用 Drizzle 替代 Prisma 查询 |
| `prisma.user.findUnique({ where: { username } })` | `db.query.users.findFirst({ where: eq(users.username, username) })` | Drizzle 的查询 API |
| `user.id` (number) | `String(user.id)` | PostgreSQL serial 返回数字，NextAuth 需要字符串 |

**为什么 auth.ts 必须同步迁移**：注册接口已改用 Drizzle 写入 PostgreSQL，如果登录仍用 Prisma 查询 MongoDB，新注册的用户将无法登录。

---

## 未修改的部分

- `src/models/` — Mongoose 模型定义保持不变
- `src/lib/mongoose.ts` — Mongoose 连接保持不变
- `src/lib/prisma.ts` — Prisma 客户端保持不变（Todo CRUD 仍在使用）
- `src/app/api/todos/` — Todo CRUD 仍用 Prisma
- `src/app/todos/page.tsx` — Todo 页面仍用 Prisma

---

## 验证结果

- 注册成功 → 返回 `{"success":true}` 状态码 201
- 重复用户名 → 返回 `{"error":"用户名已存在"}` 状态码 409
- 登录成功 → 注册后可用相同用户名密码登录
- 登录失败 → 错误密码返回 401，重定向回登录页
- 数据库确认 → 用户数据正确写入 PostgreSQL `todo_project` 数据库的 `users` 表