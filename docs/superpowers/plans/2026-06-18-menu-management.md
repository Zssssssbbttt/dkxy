# 菜单管理页面 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现菜单管理页面，超管可在页面上增删改菜单，配置菜单名称、编号、类型、URL 等字段。

**Architecture:** menus 表新增 3 个字段（nameEn、code、type），API 增加 flat 模式返回平铺列表，前端页面展示树形列表 + 弹窗表单。

**Tech Stack:** Next.js 14 + Drizzle ORM + PostgreSQL + Tailwind CSS

---

### Task 1: menus 表新增字段

**Files:**
- Modify: `src/db/schema/menus.ts`
- Modify: `src/db/schema/users.ts`（新增 menuTypeEnum）

- [ ] **Step 1: 在 users.ts 新增 menuTypeEnum**

在 `src/db/schema/users.ts` 的 `statusEnum` 下方添加：

```ts
export const menuTypeEnum = pgEnum("menu_type", ["menu", "button"]);
```

- [ ] **Step 2: 在 menus.ts 新增 3 个字段**

修改 `src/db/schema/menus.ts`，import 中加入 `menuTypeEnum`，表中新增 nameEn、code、type：

```ts
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { statusEnum, menuTypeEnum } from "./users";

export const menus = pgTable("menus", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  nameEn: varchar("name_en", { length: 50 }),
  code: varchar("code", { length: 50 }),
  type: menuTypeEnum("type").notNull().default("menu"),
  path: varchar("path", { length: 200 }),
  icon: varchar("icon", { length: 50 }),
  parentId: uuid("parent_id"),
  sort: varchar("sort", { length: 10 }).notNull().default("0"),
  status: statusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

- [ ] **Step 3: 更新 index.ts 导出**

在 `src/db/schema/index.ts` 中导出 `menuTypeEnum`：

```ts
export { users, roleEnum, statusEnum, menuTypeEnum } from "./users";
```

- [ ] **Step 4: 生成并运行迁移**

```bash
npx drizzle-kit generate && npx drizzle-kit migrate
```

- [ ] **Step 5: 更新 seed 数据**

修改 `scripts/seed.ts`，seed 菜单时加上 type 字段：

```ts
await db.insert(menus).values({ name: "后台管理", sort: "1", type: "menu" });
// ...
await db.insert(menus).values({
  name: "菜单配置",
  path: "/admin/menus",
  parentId: admin.id,
  sort: "1",
  type: "menu",
});
```

运行 `npm run db:seed` 验证。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: menus 表新增 nameEn、code、type 字段"
```

---

### Task 2: menus API 更新

**Files:**
- Modify: `src/app/api/menus/route.ts`
- Modify: `src/app/api/menus/[id]/route.ts`

- [ ] **Step 1: GET 增加 flat 模式**

修改 `src/app/api/menus/route.ts` 的 GET，支持 `?flat=true` 返回平铺列表（管理页用），默认返回树形（侧边栏用）：

```ts
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const flat = searchParams.get("flat") === "true";

  const list = await db
    .select()
    .from(menus)
    .orderBy(asc(menus.sort));

  if (flat) {
    return NextResponse.json(list);
  }

  const activeList = list.filter((m) => m.status === "active");
  const tree = buildTree(activeList, null);
  return NextResponse.json(tree);
}
```

- [ ] **Step 2: 更新 MenuTree 接口和 buildTree**

在 `buildTree` 返回的 MenuTree 中增加新字段：

```ts
interface MenuTree {
  id: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  type: "menu" | "button";
  path: string | null;
  icon: string | null;
  children: MenuTree[];
}

function buildTree(
  list: typeof menus.$inferSelect[],
  parentId: string | null
): MenuTree[] {
  return list
    .filter((m) => m.parentId === parentId)
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map((m) => ({
      id: m.id,
      name: m.name,
      nameEn: m.nameEn ?? null,
      code: m.code ?? null,
      type: m.type as "menu" | "button",
      path: m.path ?? null,
      icon: m.icon ?? null,
      children: buildTree(list, m.id),
    }));
}
```

- [ ] **Step 3: POST 支持新字段**

修改 POST handler，接收 nameEn、code、type：

```ts
const { name, nameEn, code, type, path, icon, parentId, sort } = await req.json();

if (!name || !code || !type) {
  return NextResponse.json({ error: "菜单名称、编号、类型不能为空" }, { status: 400 });
}

const [menu] = await db
  .insert(menus)
  .values({
    name,
    nameEn: nameEn || null,
    code,
    type,
    path: path || null,
    icon: icon || null,
    parentId: parentId || null,
    sort: sort || "0",
  })
  .returning();
```

- [ ] **Step 4: PUT 支持新字段**

修改 `src/app/api/menus/[id]/route.ts` 的 PUT，set 中增加新字段：

```ts
const { name, nameEn, code, type, path, icon, parentId, sort, status } = await req.json();

const [updated] = await db
  .update(menus)
  .set({
    name: name ?? menu.name,
    nameEn: nameEn !== undefined ? nameEn : menu.nameEn,
    code: code ?? menu.code,
    type: type ?? menu.type,
    path: path !== undefined ? path : menu.path,
    icon: icon !== undefined ? icon : menu.icon,
    parentId: parentId !== undefined ? parentId : menu.parentId,
    sort: sort ?? menu.sort,
    status: status ?? menu.status,
  })
  .where(eq(menus.id, params.id))
  .returning();
```

- [ ] **Step 5: 构建验证**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: menus API 支持新字段和 flat 模式"
```

---

### Task 3: 菜单管理页面

**Files:**
- Create: `src/app/(main)/admin/menus/page.tsx`
- Create: `src/components/MenuModal.tsx`

- [ ] **Step 1: 创建 MenuModal 组件**

`src/components/MenuModal.tsx` — 添加/编辑弹窗：

```tsx
"use client";

import { useState, useEffect } from "react";

interface MenuItem {
  id: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  type: "menu" | "button";
  path: string | null;
  parentId: string | null;
}

interface Props {
  open: boolean;
  menu: MenuItem | null; // null = 新增
  parentId: string | null; // 新增时的默认上级
  allMenus: { id: string; name: string }[];
  onClose: () => void;
  onSave: () => void;
}

export default function MenuModal({ open, menu, parentId, allMenus, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: "",
    nameEn: "",
    code: "",
    type: "menu" as "menu" | "button",
    path: "",
    parentId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (menu) {
      setForm({
        name: menu.name,
        nameEn: menu.nameEn || "",
        code: menu.code || "",
        type: menu.type,
        path: menu.path || "",
        parentId: menu.parentId || "",
      });
    } else {
      setForm({
        name: "",
        nameEn: "",
        code: "",
        type: "menu",
        path: "",
        parentId: parentId || "",
      });
    }
  }, [menu, parentId, open]);

  if (!open) return null;

  const isEdit = !!menu;

  async function handleSave() {
    if (!form.name || !form.code) return;
    setSaving(true);

    const url = isEdit ? `/api/menus/${menu!.id}` : "/api/menus";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        parentId: form.parentId || null,
        path: form.type === "button" ? form.path : null,
      }),
    });

    setSaving(false);
    if (res.ok) onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold mb-4">
          {isEdit ? "修改菜单" : "添加菜单"}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              菜单名称 <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              英文名称
            </label>
            <input
              value={form.nameEn}
              onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              所属菜单 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">无（一级菜单）</option>
              {allMenus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              菜单编号 <span className="text-red-500">*</span>
            </label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              是否菜单 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 mt-1.5">
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="type"
                  checked={form.type === "menu"}
                  onChange={() => setForm({ ...form, type: "menu", path: "" })}
                />
                是
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="type"
                  checked={form.type === "button"}
                  onChange={() => setForm({ ...form, type: "button" })}
                />
                否
              </label>
            </div>
          </div>
          {form.type === "button" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                菜单URL
              </label>
              <input
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                placeholder="/ITDeviceReceive/#/list"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建菜单管理页面**

`src/app/(main)/admin/menus/page.tsx`：

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import MenuModal from "@/components/MenuModal";

interface MenuItem {
  id: string;
  name: string;
  nameEn: string | null;
  code: string | null;
  type: "menu" | "button";
  path: string | null;
  parentId: string | null;
  sort: string;
  children: MenuItem[];
}

export default function MenuManagePage() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editMenu, setEditMenu] = useState<MenuItem | null>(null);
  const [addParentId, setAddParentId] = useState<string | null>(null);

  const loadMenus = useCallback(async () => {
    const res = await fetch("/api/menus");
    const data = await res.json();
    if (Array.isArray(data)) setMenus(data);
  }, []);

  useEffect(() => {
    loadMenus();
  }, [loadMenus]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd(parentId: string | null) {
    setEditMenu(null);
    setAddParentId(parentId);
    setModalOpen(true);
  }

  function handleEdit(menu: MenuItem) {
    setEditMenu(menu);
    setAddParentId(null);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该菜单吗？")) return;
    const res = await fetch(`/api/menus/${id}`, { method: "DELETE" });
    if (res.ok) loadMenus();
    else {
      const data = await res.json();
      alert(data.error);
    }
  }

  // 收集所有菜单（用于所属菜单下拉）
  function collectAll(list: MenuItem[]): { id: string; name: string }[] {
    return list.flatMap((m) => [
      { id: m.id, name: m.name },
      ...collectAll(m.children),
    ]);
  }

  function renderRow(menu: MenuItem, depth: number) {
    const isExpanded = expanded.has(menu.id);
    const hasChildren = menu.children.length > 0;
    const isMenu = menu.type === "menu";

    return (
      <div key={menu.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 border-b border-gray-100"
          style={{ paddingLeft: `${12 + depth * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(menu.id)}
              className="text-gray-400 text-xs w-4"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="flex-1 text-sm text-gray-700">
            {menu.name}
            <span className="text-gray-400 ml-2 text-xs">
              {menu.type === "button" ? "[按钮]" : ""}
            </span>
          </span>
          {isMenu && (
            <button
              onClick={() => handleAdd(menu.id)}
              className="text-blue-600 hover:text-blue-800 text-xs"
            >
              添加
            </button>
          )}
          <button
            onClick={() => handleEdit(menu)}
            className="text-blue-600 hover:text-blue-800 text-xs"
          >
            修改
          </button>
          <button
            onClick={() => handleDelete(menu.id)}
            className="text-red-500 hover:text-red-700 text-xs"
          >
            删除
          </button>
        </div>
        {isExpanded && hasChildren && (
          <div>
            {menu.children.map((child) => renderRow(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">菜单管理</h1>
        <button
          onClick={() => handleAdd(null)}
          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          添加一级菜单
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {menus.map((menu) => renderRow(menu, 0))}
      </div>

      <MenuModal
        open={modalOpen}
        menu={editMenu}
        parentId={addParentId}
        allMenus={collectAll(menus)}
        onClose={() => setModalOpen(false)}
        onSave={() => {
          setModalOpen(false);
          loadMenus();
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3: 构建验证**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: 菜单管理页面"
```

---

### Task 4: Sidebar 适配新字段

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: 更新 MenuItem 接口**

Sidebar 中的 MenuItem 接口增加 type 字段，按钮类型不参与路由跳转：

```ts
interface MenuItem {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  type: "menu" | "button";
  children: MenuItem[];
}
```

- [ ] **Step 2: 过滤按钮类型**

在 `handleFirstClick` 和 `handleChildClick` 中，按钮类型不跳转：

```ts
const handleChildClick = useCallback(
  (menu: MenuItem) => {
    if (menu.type === "button") return; // 按钮不跳转
    setExpanded((prev) => { ... });
    if (menu.path) router.push(menu.path);
  },
  [router]
);
```

- [ ] **Step 3: 构建验证并 Commit**

```bash
npm run build
git add -A && git commit -m "fix: Sidebar 适配菜单 type 字段"
```

---

### 验证清单

1. `npm run build` 无报错
2. 访问 `/admin/menus`，看到菜单管理页面
3. 点击"添加一级菜单"，弹窗正常
4. 填写必填字段，保存成功，列表刷新
5. 点击"修改"，弹窗回显数据，修改保存成功
6. 点击"删除"，确认后删除成功
7. 有子菜单时删除，提示错误
8. 按钮类型不显示"添加"按钮
9. 按钮类型弹窗显示 URL 字段
10. 侧边栏菜单正常显示和跳转