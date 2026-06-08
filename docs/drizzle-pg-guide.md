# Drizzle + PostgreSQL 功能开发指南

## 开发新功能时的步骤

### 第 1 步：定义表结构（`src/db/schema.ts`）

在这个文件中用 Drizzle 的 pg-core 定义表。一个功能涉及几张表，就定义几张。

```ts
import { pgTable, serial, varchar, text, boolean, integer } from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  completed: boolean("completed").default(false),
  userId: integer("user_id").references(() => users.id),
});
```

**阅读代码时**：先看这个文件，搞清楚有哪些表、每个字段是什么类型、表之间有什么关联（references）。

### 第 2 步：确认数据库连接配置（`src/lib/drizzle.ts`）

这个文件创建 pg Pool 并用它初始化 Drizzle 客户端，通常不需要改，但需要确认它存在且连接字符串正确。

**阅读代码时**：看它用的是哪个环境变量（`DATABASE_URL_POSTGRES`），以及 schema 是否已传入（`drizzle(pool, { schema })`）。传入 schema 才能用 `db.query.表名.findFirst()` 这种带类型推导的 API。

### 第 3 步：确认 CLI 配置（`drizzle.config.ts`）

确认 `schema` 路径指向你的 schema 文件，`dialect` 是 `"postgresql"`，`dbCredentials.url` 引用正确的环境变量。

### 第 4 步：确认环境变量（`.env`）

```
DATABASE_URL_POSTGRES="postgresql://用户名:密码@主机:端口/数据库名"
```

### 第 5 步：同步表结构到数据库

```bash
npx drizzle-kit push
```

这条命令会读取 `drizzle.config.ts` 中找到的 schema 文件，对比数据库当前状态，自动创建或修改表。开发阶段用 push 就够了，不需要手动写迁移文件。

**排查问题时**：如果接口报错说表不存在，先检查是否执行了这一步。

### 第 6 步：在 API 路由中使用

```ts
import { db } from "@/lib/drizzle";
import { todos } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// 查询
const result = await db.query.todos.findMany({
  where: eq(todos.userId, userId),
});

// 插入
await db.insert(todos).values({ title: "新任务", userId: 1 });

// 更新
await db.update(todos).set({ completed: true }).where(eq(todos.id, id));

// 删除
await db.delete(todos).where(eq(todos.id, id));
```

**阅读代码时**：关注 import 了哪些 schema 表，用了什么查询方法（findFirst / findMany / insert / update / delete），where 条件是什么。

### 第 7 步：验证

启动项目，实际调用接口，确认数据库中有正确的数据写入。

---

## 阅读别人代码时的检查顺序

| 顺序 | 看什么 | 文件 |
|------|--------|------|
| 1 | 有哪些表、字段、关联 | `src/db/schema.ts` |
| 2 | 连的哪个数据库 | `src/lib/drizzle.ts` |
| 3 | 环境变量是什么 | `.env` |
| 4 | 每个 API 路由操作了哪些表 | `src/app/api/**/route.ts` |

---

## 关键常识

- **不需要手动 connect / disconnect**：pg Pool 自动管理连接，`db.query` 和 `db.insert` 自动从池中取连接、用完归还。
- **serial 返回 number**：如果 NextAuth 等库需要 string id，记得 `String(user.id)`。
- **`db.query.表名` vs `db.select().from()`**：`db.query` 是 Drizzle 的高级 API，类型推导更好，日常用这个就够了。`db.select()` 是 SQL-like 的低级 API，复杂查询时用。
- **push vs migrate**：开发用 `push` 直接同步，上线用 `generate` + `migrate` 保留变更历史。