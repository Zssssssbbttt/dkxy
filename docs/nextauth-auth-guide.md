# 登录鉴权体系：NextAuth + Drizzle + PostgreSQL

## 依赖包

登录功能涉及 3 个包：

| 包 | 作用 | 在哪里用 |
|---|---|---|
| `next-auth` | 鉴权框架，封装登录/登出/session/JWT | 全局 |
| `bcryptjs` | 密码哈希和比对 | `auth.ts` 核对密码、`register/route.ts` 哈希存储 |
| `pg` + `drizzle-orm` | 数据库驱动 + ORM | `auth.ts` 查用户 |

`next-auth` 是核心，`bcryptjs` 是密码工具，数据库包负责存取用户数据。三者互不依赖，在 `auth.ts` 里组合到一起。

---

## 文件架构总览

```
鉴权体系由 5 个文件组成，分三层：

┌─────────────────────────────────────────────────┐
│  配置层                                          │
│  src/lib/auth.ts        鉴权策略、验证逻辑        │
└──────────────────────┬──────────────────────────┘
                       │ 被引用
┌──────────────────────▼──────────────────────────┐
│  基础设施层                                      │
│  api/auth/[...nextauth]/route.ts  API 入口       │
│  middleware.ts                   路由守卫         │
│  components/SessionProvider.tsx  客户端上下文     │
└──────────────────────┬──────────────────────────┘
                       │ 被调用
┌──────────────────────▼──────────────────────────┐
│  页面层                                          │
│  LoginForm.tsx            signIn("credentials")  │
│  TodoPageClient.tsx       signOut()              │
│  page.tsx / todos/page.tsx getServerSession()   │
└─────────────────────────────────────────────────┘
```

---

## 逐文件讲解

### 1. `src/lib/auth.ts` — 鉴权配置（大脑）

这是整个登录系统的核心配置文件。NextAuth 的所有行为都由这个文件决定。

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  // ---- 登录方式 ----
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        // 1. 判空
        if (!credentials?.username || !credentials?.password) return null;
        // 2. 查数据库
        const user = await db.query.users.findFirst({
          where: eq(users.username, credentials.username),
        });
        if (!user) return null;
        // 3. 比对密码
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        // 4. 验证通过，返回用户信息
        return { id: String(user.id), name: user.username };
      },
    }),
  ],

  // ---- 登录状态存储方式 ----
  session: { strategy: "jwt" },

  // ---- 自定义登录页 ----
  pages: { signIn: "/login" },

  // ---- 回调：在 JWT 和 session 之间传递数据 ----
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;    // 登录时把 id 写入 JWT
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;  // 从 JWT 取出 id
      return session;
    },
  },
};
```

**逐段解释：**

**`providers: [CredentialsProvider({...})]`** — 登录方式。NextAuth 支持多种 provider（GitHub OAuth、Google OAuth、邮箱链接等），你用的是最直接的「用户名+密码」方式。核心是 `authorize` 函数：
- `return null` → 登录失败，NextAuth 向前端返回 `{ error: "CredentialsSignin" }`
- `return { id, name }` → 登录成功，NextAuth 用这个对象生成 JWT

**`session: { strategy: "jwt" }`** — 登录状态的存储策略。JWT 策略的意思是「把用户信息加密存在 cookie 里，不在服务端存 session」。另一种策略是 `"database"`，会把 session 存数据库。JWT 更轻量，适合大多数应用。

**`pages: { signIn: "/login" }`** — 告诉 NextAuth：如果用户没登录就访问受保护页面，重定向到 `/login`，不要用 NextAuth 自带的默认登录页。

**`callbacks`** — 两个函数在「登录 → 生成 JWT → 后续请求读取 JWT」这条链路上传递用户 id：
```
登录成功     → jwt callback 触发     → token.id = user.id
后续请求来了 → session callback 触发 → session.user.id = token.id
```

---

### 2. `src/app/api/auth/[...nextauth]/route.ts` — API 入口（门）

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**这个文件是干什么的？**

`[...nextauth]` 是 Next.js 的 catch-all 动态路由。它会把所有 `/api/auth/*` 的请求都交给 NextAuth 处理：

| 前端调用 | 实际请求 | NextAuth 自动做什么 |
|---|---|---|
| `signIn("credentials", {...})` | `POST /api/auth/callback/credentials` | 调用 `authorize`，生成 JWT，写 cookie |
| `signOut()` | `POST /api/auth/signout` | 清空 cookie |
| `getServerSession(authOptions)` | 读 cookie | 解密 JWT，返回 session 对象 |
| `useSession()` | `GET /api/auth/session` | 返回当前 session |

**你不需要手动写这些路由**。`NextAuth(authOptions)` 把所有这些接口都自动生成好了。这个文件只是一个「桥梁」——把 `authOptions` 配置传给 NextAuth，导出 GET 和 POST handler。

---

### 3. `src/middleware.ts` — 路由守卫（看门人）

```ts
export { default } from "next-auth/middleware";
export const config = {
  matcher: ["/todos", "/api/todos/:path*"],
};
```

这就是 NextAuth 自带的中间件。`matcher` 指定了哪些路由需要保护——访问 `/todos` 和 `/api/todos/*` 的请求会被自动拦截检查。没有登录 → 重定向到 `/login`（就是 `pages.signIn` 配置的那个）。

**为什么 `/api/register` 和 `/api/auth/*` 不在 matcher 里？** 因为注册和登录接口必须是公开的——还没注册的用户当然不应该被拦截。

---

### 4. `src/components/SessionProvider.tsx` — 客户端上下文（插座）

```tsx
"use client";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

包裹在 `src/app/layout.tsx` 的最外层。它的作用是给整个应用提供 session 上下文，让任意客户端组件都能通过 `useSession()` 拿到当前登录用户。

**为什么单独封装一个组件？** 因为 `SessionProvider` 必须是客户端组件（`"use client"`），而 `layout.tsx` 是服务端组件。所以把它抽成一个独立的客户端组件再引入到 layout 里。

---

### 5. 前端调用：signIn、signOut、getServerSession

**三个方法的使用场景：**

| 方法 | 在哪里用 | 场景 |
|---|---|---|
| `signIn("credentials", {...})` | 客户端组件 | 登录表单提交 |
| `signOut()` | 客户端组件 | 点击退出登录按钮 |
| `getServerSession(authOptions)` | 服务端组件 | 页面加载时检查登录状态 |

**`src/components/LoginForm.tsx` — 登录：**
```ts
import { signIn } from "next-auth/react";

const res = await signIn("credentials", {
  username: form.get("username"),
  password: form.get("password"),
  redirect: false,   // false = 不自动跳转，自己处理结果
});

if (res?.error) {
  setError("用户名或密码错误");  // res.error 统一为 "CredentialsSignin"
} else {
  router.push("/todos");  // 手动跳转
}
```

**`signIn` 做了什么：**
1. POST `/api/auth/callback/credentials`，body 是 `{ username, password }`
2. NextAuth 拿到后调用 `auth.ts` 里的 `authorize(credentials)`
3. 验证成功 → 生成 JWT → 写入 cookie → 返回 `{ ok: true }`
4. 验证失败 → 返回 `{ error: "CredentialsSignin" }`

**`redirect: false`** 的作用：默认情况下 `signIn` 成功会自动跳转到受保护页面。设置 `false` 后变成手动控制跳转，更适合自定义 UI。

**`src/app/todos/TodoPageClient.tsx` — 登出：**
```ts
import { signOut } from "next-auth/react";

await signOut({ redirect: false });
router.push("/login");
```

**`signOut` 做了什么：** POST `/api/auth/signout` → NextAuth 清空 JWT cookie → session 失效。

**`src/app/page.tsx` — 服务端检查登录：**
```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
if (session) redirect("/todos");  // 已登录 → 去 todos
redirect("/login");               // 未登录 → 去登录
```

---

## 登录流程全链路

```
用户访问 /todos
     │
     ▼
middleware.ts 检查 session
     │
     ├─ 有 session → 放行
     │
     └─ 无 session → 重定向 /login
                         │
                    用户填表提交
                         │
                    signIn("credentials", {username, password})
                         │
                    POST /api/auth/callback/credentials
                         │
                    [...nextauth]/route.ts 接收
                         │
                    调用 auth.ts → authorize()
                         │
              ┌──────────┼──────────┐
              │          │          │
         字段为空    用户不存在   密码错误
              │          │          │
              ▼          ▼          ▼
         return null  return null  return null
              │          │          │
              └──────────┼──────────┘
                         ▼
              前端收到 { error: "CredentialsSignin" }
              显示 "用户名或密码错误"
                         
              ─────────────────────────
                         
          authorize 验证成功
              return { id: "1", name: "admin" }
                         │
              NextAuth 生成 JWT → 加密写入 cookie
                         │
              前端收到 { ok: true }
                         │
              router.push("/todos")
                         │
              middleware 检查 → 有 cookie → 解密 JWT → 放行
```

---

## 方法之间的依赖关系

```
bcryptjs ──────────┐
                   ▼
drizzle-orm ──→ auth.ts (authorize 查库 + 比对密码)
                   │
                   ▼
            [...nextauth]/route.ts (NextAuth(authOptions))
                   │
         ┌─────────┼─────────┐
         │         │         │
      signIn    signOut   getServerSession
    (客户端)   (客户端)    (服务端)
         │         │         │
    LoginForm  TodoPage   page.tsx
              Client     todos/page.tsx
```

---

## 社区常用实践

### 1. 类型扩展：让 TypeScript 知道 session.user.id

项目里用 `session.user.id`，但 NextAuth 默认类型里 `user` 没有 `id`。在 `src/types/next-auth.d.ts` 里扩展类型：

```ts
// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

这样写 `session.user.id` 时 TypeScript 不会报错，有自动补全。

### 2. 客户端获取 session：useSession

当前项目在服务端用 `getServerSession` 拿 session，传给客户端 props。另一种方式是客户端直接用 hook：

```tsx
"use client";
import { useSession } from "next-auth/react";

export default function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <p>加载中...</p>;
  if (status === "unauthenticated") return <p>请先登录</p>;

  return <p>你好, {session.user.name}</p>;
}
```

两种方式都行，服务端拿（props 传递）首屏更快，客户端拿更灵活。

### 3. 抽取 authorize 逻辑

当 `authorize` 逻辑变复杂时，把验证逻辑抽到单独的函数，保持 `auth.ts` 整洁：

```ts
// src/lib/auth-service.ts
export async function verifyCredentials(username: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  return { id: String(user.id), name: user.username };
}
```

```ts
// auth.ts 中
async authorize(credentials) {
  if (!credentials?.username || !credentials?.password) return null;
  return verifyCredentials(credentials.username, credentials.password);
}
```

### 4. 登录失败不暴露具体原因

`authorize` 中任何失败都 `return null`（不区分「用户名不存在」和「密码错误」）。前端显示统一的「用户名或密码错误」。这是安全最佳实践——不给攻击者枚举用户名的机会。

### 5. 密码哈希轮数

`bcrypt.hash(password, 10)` 中的 `10` 是 salt 轮数。10~12 是当前社区通用值，太低不安全，太高登录慢。10 对大多数应用是合适的。

### 6. 环境变量安全

`NEXTAUTH_SECRET` 在 `.env.local` 中是 `"super-secret-key-change-in-production"`。生产环境必须替换为真随机字符串：

```bash
openssl rand -base64 32
```

这个 secret 用于加密 JWT，泄露了攻击者就能伪造任意用户的 token。