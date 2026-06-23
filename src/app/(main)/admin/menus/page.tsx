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
    if (res.ok) {
      loadMenus();
    } else {
      const data = await res.json();
      alert(data.error);
    }
  }

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
        {menus.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">暂无菜单</p>
        ) : (
          menus.map((menu) => renderRow(menu, 0))
        )}
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