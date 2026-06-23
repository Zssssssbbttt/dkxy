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
  menu: MenuItem | null;
  parentId: string | null;
  allMenus: { id: string; name: string }[];
  onClose: () => void;
  onSave: () => void;
}

export default function MenuModal({
  open,
  menu,
  parentId,
  allMenus,
  onClose,
  onSave,
}: Props) {
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
        name: form.name,
        nameEn: form.nameEn || null,
        code: form.code,
        type: form.type,
        path: form.type === "button" ? form.path : null,
        parentId: form.parentId || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      onSave();
    } else {
      const data = await res.json();
      alert(data.error || "保存失败");
    }
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
                  checked={form.type === "menu"}
                  onChange={() => setForm({ ...form, type: "menu", path: "" })}
                />
                是
              </label>
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
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