# NextAuth vs 自定义鉴权：对比分析与替换方案

## 一、NextAuth 当前做了什么（拆解视角）

从源码层面拆解，NextAuth 帮你封装了 5 件事：

| 模块 | NextAuth 的实现 | 源码位置 |
|------|----------------|---------|
| JWT 签发/校验 | `jose` 库，JWE 加密（`alg: dir, enc: A256GCM`），密钥经 HKDF 派生 | `next-auth/jwt/index.js` |
| Cookie 管理 | 加密 JWT 写入 http-only cookie，命名 `next-auth.session-token` | `next-auth/core/lib/cookie.js` |
| CSRF 防护 | 双重提交 Cookie 模式，signIn/signOut 自动带 token | `next-auth/react/index.js` — signIn/signOut 函数 |
| Session 传递 | React Context + 服务端 props 注入 + localStorage 跨标签同步 + visibilitychange 自动刷新 | `next-auth/react/index.js` — SessionProvider |
| 路由守卫 | middleware 解析 cookie → 校验 JWT → redirect /login | `next-auth/middleware.js` |

---

## 二、两种方案逐项对比

### 2.1 JWT 库

| 维度 | NextAuth（jose） | 自定义（jose 或 jsonwebtoken） |
|------|-----------------|-------------------------------|
| 库 | `jose` v4.15.5 | 任选 `jose` 或 `jsonwebtoken` |
| 运行时兼容 | Edge + Node.js 均可 | jose 兼容 Edge，jsonwebtoken 仅 Node.js |
| JWT 类型 | JWE（加密），payload 完全不可见 | 自己决定加密或签名 |
| 密钥处理 | HKDF-SHA256 从 NEXTAUTH_SECRET 派生 AES-256 密钥 | 直接用 secret |
| 唯一标识 | 每次签发带 `uuid.v4()` 作为 `jti` | 需自己生成 |

**推荐自定义方案选 `jose`**，原因：Edge 兼容、API 更现代、NextAuth 自己就用它。

### 2.2 Cookie 管理

| 维度 | NextAuth | 自定义 |
|------|---------|--------|
| Cookie 名称 | `next-auth.session-token`（http 环境）/ `__Secure-next-auth.session-token`（https） | 自定义，如 `session` |
| Cookie 属性 | `HttpOnly; SameSite=Lax; Path=/` | 自己设置 |
| 过期控制 | JWT 内部 `exp` 字段控制，默认 30 天 | 自己设 `maxAge` 对应 JWT 过期 |
| 清除方式 | `signOut()` POST 请求清空 cookie | API 返回 `Set-Cookie` 置空 |

**没有本质差异**，NextAuth 只是把这些细节封装好了。自定义时需要自己注意 `Secure`（生产）、`SameSite`、`Path` 等属性。

### 2.3 CSRF 防护

| 维度 | NextAuth | 自定义 |
|------|---------|--------|
| 实现模式 | 双重提交 Cookie（Double Submit Cookie） | 同样用双重提交 Cookie |
| Token 获取 | `GET /api/auth/csrf` 返回 token + 写入 cookie | 自己写接口，逻辑相同 |
| 自动携带 | `signIn()` 内部先调 `getCsrfToken()` 再 POST | 需手动先请求 token 再携带 |
| 校验位置 | handler 内部对所有写操作自动校验 | 需在登录/登出 API 中手动校验 |

**NextAuth 的优势是不用你写代码，但原理完全透明**。自定义时就是把 NextAuth 自动做的事显式写出来，代码量约 30 行。

### 2.4 Session 传递

| 维度 | NextAuth | 自定义 |
|------|---------|--------|
| 基础方案 | React Context（`SessionProvider` + `useSession`） | 自定义 Context Provider 或服务端直传 props |
| 首屏优化 | Provider 支持 `session` prop，服务端传数据免首屏请求 | 可以同样实现 |
| 跨标签同步 | `localStorage` + `storage` 事件 | 可实现，约 20 行 |
| 页面切回刷新 | `visibilitychange` 事件，`refetchOnWindowFocus` 控制 | 可实现，约 10 行 |
| 定时轮询 | `refetchInterval` 可选配置 | 可实现 |
| 状态暴露 | `{ data, status: "loading" \| "authenticated" \| "unauthenticated", update }` | 自定义 API |

**NextAuth 这个模块最复杂**。但它提供的很多能力（跨标签同步、轮询、切回刷新）对当前这个 Todo 项目来说属于「过度设计」。一个简单的服务端直传 props 就够了。

### 2.5 路由守卫

| 维度 | NextAuth | 自定义 |
|------|---------|--------|
| 代码量 | 3 行（re-export `next-auth/middleware`） | ~20 行 |
| 实现 | 内置 JWT 解析 + redirect | 手写 cookie 解析 → JWT 验证 → redirect |
| matcher 配置 | 直接复用 | 相同写法 |

### 2.6 总体差异

| 维度 | NextAuth | 自定义 |
|------|---------|--------|
| 包体积 | `next-auth` 本身 + `jose` + `@panva/hkdf` + `uuid` + `preact` + `preact-render-to-string` + `openid-client` + `oauth` + `cookie` ≈ 500KB+ | 仅 `jose`（或 `jsonwebtoken`）≈ 50KB |
| 黑盒程度 | authorize/callback 之外全是黑盒，出问题难以调试 | 全部白盒，每行都可追踪 |
| 升级风险 | NextAuth v5（Auth.js）breaking changes 大，v4→v5 需大幅改动 | 自己维护，无外部依赖变更风险 |
| 扩展灵活性 | 受限于 NextAuth API 设计 | 任何需求直接改代码 |
| 开发成本 | 低，配置即可 | 中，需写约 200-300 行新代码 |
| 安全成熟度 | 社区验证，大量项目使用 | 自己负责，有遗漏的风险 |

---

## 三、替换方案：逐步实施计划

### 总体步骤：6 步，预计涉及 10 个文件

```
第1步  ── 新建 JWT 工具            src/lib/jwt.ts           (~30 行)
第2步  ── 新建 CSRF 工具            src/lib/csrf.ts          (~15 行)
第3步  ── 替换 API 路由             3 个新文件 + 删除 1 个旧文件
第4步  ── 替换 Middleware           src/middleware.ts        (重写 ~20 行)
第5步  ── 替换 Session 传递         删除 SessionProvider，改 layout
第6步  ── 改造前端组件               LoginForm、TodoPageClient
```

---

### 第 1 步：新建 `src/lib/jwt.ts` — JWT 工具函数

```typescript
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "your-secret-key-change-in-production"
);
const COOKIE_NAME = "session";
const MAX_AGE = 30 * 24 * 60 * 60; // 30 天

/** 登录成功时调用：生成 JWT 并写入 cookie */
export async function createSession(userId: string) {
  const token = await new SignJWT({ id: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + MAX_AGE)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** 服务端读取 session：从 cookie 中解析 JWT，返回 userId */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.id as string) || null;
  } catch {
    return null;
  }
}

/** 登出：清除 cookie */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

**说明：** 此处用 JWS（签名）而非 JWE（加密）。payload 中的 `{ id }` 是 base64 明文可见的，不可放敏感信息。如果你偏好和 NextAuth 一样的 JWE 加密方式，可改用 `EncryptJWT` / `jwtDecrypt`，代码几乎相同，只是把 `SignJWT` 换成 `EncryptJWT` 系列 API。

---

### 第 2 步：新建 `src/lib/csrf.ts` — CSRF 工具函数

```typescript
import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_COOKIE = "csrf-token";

/** 生成 CSRF token 并写入 cookie */
export async function setCsrfCookie(): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 小时有效
  });
  return token;
}

/** 校验 CSRF token：比对请求体中的 token 和 cookie 中的 token */
export async function verifyCsrf(bodyToken: string): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken || !bodyToken) return false;

  // 用 timingSafeEqual 防止时序攻击
  try {
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(bodyToken);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
```

---

### 第 3 步：替换 API 路由

#### 3.1 删除旧文件

```
删除: src/app/api/auth/[...nextauth]/route.ts
```

#### 3.2 新建 `src/app/api/auth/login/route.ts`

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/jwt";
import { verifyCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  const { username, password, csrfToken } = await req.json();

  // CSRF 校验
  if (!(await verifyCsrf(csrfToken))) {
    return NextResponse.json({ error: "无效的请求" }, { status: 403 });
  }

  if (!username || !password) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  await createSession(String(user.id));
  return NextResponse.json({ ok: true });
}
```

#### 3.3 新建 `src/app/api/auth/logout/route.ts`

```typescript
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
```

#### 3.4 新建 `src/app/api/auth/csrf/route.ts`

```typescript
import { NextResponse } from "next/server";
import { setCsrfCookie } from "@/lib/csrf";

export async function GET() {
  const token = await setCsrfCookie();
  return NextResponse.json({ csrfToken: token });
}
```

#### 3.5 新建 `src/app/api/auth/session/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/jwt";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(null, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(userId)),
  });

  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    user: { id: String(user.id), name: user.username },
  });
}
```

---

### 第 4 步：重写 `src/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "your-secret-key-change-in-production"
);
const COOKIE_NAME = "session";

// 哪些路由需要登录保护
const PROTECTED = ["/todos", "/api/todos"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否命中保护路由
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/todos", "/api/todos/:path*"],
};
```

---

### 第 5 步：替换 Session 传递

#### 5.1 删除 `src/components/SessionProvider.tsx`

#### 5.2 简化 `src/app/layout.tsx`

```tsx
// 去掉 SessionProvider 的 import 和使用
// 直接渲染 {children}
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

#### 5.3 服务端页面直接调 `getSessionUserId()`

之前用 `getServerSession(authOptions)` 的地方改为：

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/jwt";

export default async function Home() {
  const userId = await getSessionUserId();
  if (userId) redirect("/todos");
  redirect("/login");
}
```

```typescript
// src/app/todos/page.tsx
import { getSessionUserId } from "@/lib/jwt";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function TodosPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(userId)),
  });

  // ... 后续用 user.username 和 userId 查询 todos
}
```

API 路由同理，把 `getServerSession(authOptions)` 换成 `getSessionUserId()`。

---

### 第 6 步：改造前端组件

#### 6.1 `LoginForm.tsx` — 核心改造

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const username = form.get("username") as string;
    const password = form.get("password") as string;

    // 1. 先拿 CSRF token
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    // 2. 用拿到的 token 登录（替代 signIn）
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, csrfToken }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "用户名或密码错误");
      return;
    }

    router.push("/todos");
    router.refresh();
  }

  // render 部分不变...
}
```

**对比变化：** `signIn("credentials", {...})` → `GET /api/auth/csrf` + `POST /api/auth/login`。

#### 6.2 `TodoPageClient.tsx` — 登出改造

```tsx
// 之前: signOut({ redirect: false })
// 之后:
async function handleLogout() {
  const csrfRes = await fetch("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  await fetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken }),
  });

  router.push("/login");
  router.refresh();
}
```

#### 6.3 用户名传递

之前通过 `session.user.name` 获取用户名。改为在 `todos/page.tsx` 服务端直接查数据库拿 `user.username`，通过 props 传给 `TodoPageClient`。这个改动最小——因为当前项目本来就是把 username 当 props 传的。

---

### 第四步：清理

改动完成后执行：

```bash
npm uninstall next-auth
```

删除文件：
```
src/lib/auth.ts
src/app/api/auth/[...nextauth]/route.ts
src/components/SessionProvider.tsx
src/types/next-auth.d.ts
```

---

## 四、方案决策矩阵

| 考量因素 | 倾向 NextAuth | 倾向自定义 |
|---------|--------------|-----------|
| 后续可能加 OAuth（GitHub/Google 登录） | ✅ provider 体系完善 | ❌ 需自己对接 OAuth |
| 只需要用户名密码登录 | 杀鸡用牛刀 | ✅ 刚好够用 |
| 团队有 NextAuth 经验 | ✅ 快速上手 | — |
| 追求最小依赖 | ❌ 9 个依赖 | ✅ 1 个依赖（jose） |
| 需要完全掌控鉴权细节 | ❌ 受限于框架 | ✅ 自由度高 |
| 代码调试透明 | ❌ 黑盒 | ✅ 白盒 |
| 短期开发速度 | ✅ 配置即用 | ❌ 需写 200-300 行 |

---

## 五、建议

**如果只做用户名密码登录，自定义更合适。** NextAuth 的主要价值在于多 provider 切换（GitHub / Google / 邮箱链接等）和社区生态（各种 adapter）。对于这个 Todo 项目仅有的 Credentials 登录，NextAuth 提供的能力远超实际需要，带来的包体积和维护负担是不必要的成本。

**如果后续明确要加 OAuth 或 Magic Link，保留 NextAuth。** 自己对接 OAuth 协议的工作量远大于写 JWT 和 CSRF 工具函数。