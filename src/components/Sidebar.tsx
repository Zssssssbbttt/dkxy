"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface MenuItem {
  id: string;
  name: string;
  path: string | null;
  icon: string | null;
  children: MenuItem[];
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [activeFirst, setActiveFirst] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // 加载菜单
  useEffect(() => {
    function findMenuByPath(menu: MenuItem, target: string): boolean {
      if (menu.path === target) return true;
      return menu.children.some((c) => findMenuByPath(c, target));
    }

    fetch("/api/menus")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMenus(data);
          for (const first of data) {
            if (findMenuByPath(first, pathname)) {
              setActiveFirst(first.id);
              break;
            }
          }
        }
      })
      .catch(() => {});
  }, [pathname]);

  const handleFirstClick = useCallback(
    (menu: MenuItem) => {
      setActiveFirst(menu.id);
      if (menu.children.length > 0) return;
      if (menu.path) router.push(menu.path);
    },
    [router]
  );

  const handleChildClick = useCallback(
    (menu: MenuItem) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(menu.id)) next.delete(menu.id);
        else next.add(menu.id);
        return next;
      });
      if (menu.path) router.push(menu.path);
    },
    [router]
  );

  const activeMenu = menus.find((m) => m.id === activeFirst);
  const showSecondLevel = !collapsed && activeMenu && activeMenu.children.length > 0;

  // 收起状态：只显示展开按钮
  if (collapsed) {
    return (
      <aside className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col items-center pt-2 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="展开菜单"
        >
          ▶
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex bg-gray-50 border-r border-gray-200 shrink-0">
      {/* 一级菜单列 */}
      <div className="w-16 flex flex-col items-center shrink-0 border-r border-gray-200">
        {/* 收起按钮 - 顶部 */}
        <button
          onClick={() => setCollapsed(true)}
          className="w-10 h-10 mt-2 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          title="收起菜单"
        >
          ◀
        </button>

        {/* 一级菜单列表 */}
        <div className="flex-1 flex flex-col items-center py-2 gap-1">
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => handleFirstClick(menu)}
              className={`w-12 h-12 flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                activeFirst === menu.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
              title={menu.name}
            >
              <span className="text-lg">{menu.icon || "📁"}</span>
              <span className="truncate w-full text-center">
                {menu.name.slice(0, 2)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 二级菜单列 - 仅当一级菜单有子菜单时才显示 */}
      {showSecondLevel && (
        <div className="w-44 overflow-y-auto py-2">
          <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase">
            {activeMenu!.name}
          </div>
          {activeMenu!.children.map((child) => (
            <MenuTree
              key={child.id}
              menu={child}
              depth={0}
              expanded={expanded}
              onToggle={handleChildClick}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function MenuTree({
  menu,
  depth,
  expanded,
  onToggle,
  pathname,
}: {
  menu: MenuItem;
  depth: number;
  expanded: Set<string>;
  onToggle: (menu: MenuItem) => void;
  pathname: string;
}) {
  const isExpanded = expanded.has(menu.id);
  const isActive = pathname === menu.path;
  const hasChildren = menu.children.length > 0;

  return (
    <div>
      <button
        onClick={() => onToggle(menu)}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
          isActive
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren && (
          <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
        )}
        <span>{menu.icon || "📄"}</span>
        <span className="truncate">{menu.name}</span>
      </button>
      {isExpanded &&
        hasChildren &&
        menu.children.map((child) => (
          <MenuTree
            key={child.id}
            menu={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            pathname={pathname}
          />
        ))}
    </div>
  );
}