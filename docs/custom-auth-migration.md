# 自定义登录迁移步骤

## 策略

- **保留** NextAuth 旧文件（加 `.nextauth` 后缀），不删除、不卸载包
- **新建** 自定义鉴权文件
- **修改** 依赖 NextAuth 的业务文件，切换到自定义方案

## 步骤总览

```
第 1 步  保留旧文件（5 个重命名）
第 2 步  新建 src/lib/jwt.ts       JWT 签发/校验/销毁
第 3 步  新建 src/lib/csrf.ts      CSRF 双重提交 Cookie
第 4 步  新建 4 个 API 路由        csrf / login / logout / session
第 5 步  重写 src/middleware.ts    自定义路由守卫
第 6 步  修改 7 个业务文件         去掉 next-auth 引用
```

---

## 第 1 步：保留 NextAuth 旧文件（重命名）

| 原文件 | 重命名为 |
|--------|---------|
| `src/lib/auth.ts` | `src/lib/auth.nextauth.ts` |
| `src/middleware.ts` | `src/middleware.nextauth.ts` |
| `src/components/SessionProvider.tsx` | `src/components/SessionProvider.nextauth.tsx` |

以下两个文件保留原位不动：
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/types/next-auth.d.ts`

---

## 第 2 步：新建 `src/lib/jwt.ts`

三个导出函数：

| 函数 | 用途 | 调用的地方 |
|------|------|-----------|
| `createSession(userId)` | 签发 JWT → 写入 http-only cookie | `POST /api/auth/login` |
| `getSessionUserId()` | 从 cookie 解密 JWT → 返回 userId | page.tsx、todos/page.tsx、API routes |
| `destroySession()` | 清除 cookie | `POST /api/auth/logout` |

技术选型：
- 用 `jose` 库（next-auth 已经安装了这个依赖），`SignJWT` + `jwtVerify`
- JWT 类型：JWS 签名（`alg: HS256`），payload 存 `{ id: userId }`
- Cookie 名 `session`，httpOnly + sameSite lax，生产环境加 secure
- 过期时间 30 天

---

## 第 3 步：新建 `src/lib/csrf.ts`

两个导出函数：

| 函数 | 用途 |
|------|------|
| `setCsrfCookie()` | 生成 32 字节随机 hex → 写入 cookie → 返回 token |
| `verifyCsrf(bodyToken)` | 比对请求体 token 与 cookie token，用 `crypto.timingSafeEqual` |

Cookie 名 `csrf-token`，1 小时有效，httpOnly。

---

## 第 4 步：新建 4 个 API 路由

| 路由 | 方法 | 依赖 | 功能 |
|------|------|------|------|
| `/api/auth/csrf` | GET | `setCsrfCookie` | 返回 `{ csrfToken }` |
| `/api/auth/login` | POST | `verifyCsrf` + drizzle + bcrypt + `createSession` | 验证凭证 → 签发 JWT |
| `/api/auth/logout` | POST | `verifyCsrf` + `destroySession` | 清除 JWT cookie |
| `/api/auth/session` | GET | `getSessionUserId` + drizzle | 返回 `{ user }` 或 null |

login 路由复用现有 `authorize` 逻辑：查 `users` 表 → `bcrypt.compare` → 统一错误返回。

---

## 第 5 步：重写 `src/middleware.ts`

旧文件已重命名为 `middleware.nextauth.ts`。

新 middleware 逻辑：
```
取 request.cookies 中的 "session"
  → 无 → 302 redirect /login
  → 有 → jose.jwtVerify(token, SECRET)
         → 成功 → NextResponse.next()
         → 失败 → 302 redirect /login
```

保护路由不变：`/todos`、`/api/todos/:path*`

---

## 第 6 步：修改 7 个业务文件

### 6.1 `src/app/layout.tsx`
- 删除 `import SessionProvider from "@/components/SessionProvider"`
- `<SessionProvider>{children}</SessionProvider>` → `{children}`

### 6.2 `src/app/page.tsx`
- `getServerSession` / `authOptions` → `getSessionUserId`
- `if (session)` → `if (userId)`

### 6.3 `src/app/todos/page.tsx`
- `getServerSession` / `authOptions` → `getSessionUserId`
- 用 `userId` 查 `users` 表取 `username`
- `session.user.id` → `userId`

### 6.4 `src/app/todos/TodoPageClient.tsx`
- 删除 `signOut` import，改为 fetch 调用 `/api/auth/logout`
- 登出流程：GET csrf → POST logout → router.push("/login")

### 6.5 `src/components/LoginForm.tsx`
- 删除 `signIn` import，改为 fetch 调用 `/api/auth/login`
- 登录流程：GET csrf → POST login → router.push("/todos")

### 6.6 `src/app/api/todos/route.ts`
- `getServerSession(authOptions)` → `getSessionUserId()`

### 6.7 `src/app/api/todos/[id]/route.ts`
- `getServerSession(authOptions)` → `getSessionUserId()`