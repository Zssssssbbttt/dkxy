"use client";

import { useState, useEffect } from "react";
import { apiPost, apiPut } from "@/lib/api-client";

interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  sort: string;
  remark?: string | null;
}

interface Props {
  open: boolean;
  dept: Department | null;
  parentId: string | null;
  allDepts: { id: string; name: string }[];
  onClose: () => void;
  onSave: () => void;
}

export default function DepartmentModal({
  open,
  dept,
  parentId,
  allDepts,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    parentId: "",
    sort: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dept) {
      setForm({
        name: dept.name,
        code: dept.code,
        parentId: dept.parentId || "",
        sort: dept.sort,
        remark: dept.remark || "",
      });
    } else {
      setForm({
        name: "",
        code: "",
        parentId: parentId || "",
        sort: "",
        remark: "",
      });
    }
  }, [dept, parentId, open]);

  if (!open) return null;

  const isEdit = !!dept;

  async function handleSave() {
    if (!form.name || !form.code) return;
    setSaving(true);

    const body = {
      name: form.name,
      code: form.code,
      parentId: form.parentId || null,
      sort: form.sort || "0",
      remark: form.remark || null,
    };

    try {
      const res = isEdit
        ? await apiPut(`/api/departments/${dept!.id}`, body)
        : await apiPost("/api/departments", body);

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (e: unknown) {
      alert((e as Error).message || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    height: "26px",
    padding: "0 8px",
    fontSize: "12px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    outline: "none",
  };

  const labelStyle = {
    width: "150px",
    flexShrink: 0,
    textAlign: "right" as const,
    fontSize: "12px",
    color: "#333",
    paddingRight: "12px",
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-modal shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "#333" }}>
          {isEdit ? "编辑部门" : "新建部门"}
        </h2>

        <div className="space-y-3">
          <div className="flex items-center">
            <label style={labelStyle}>
              <span style={{ color: "#f56c6c" }}>*</span>部门名称
            </label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex items-center">
            <label style={labelStyle}>
              <span style={{ color: "#f56c6c" }}>*</span>部门编号
            </label>
            <input
              style={inputStyle}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div className="flex items-center">
            <label style={labelStyle}>上级部门</label>
            <select
              style={inputStyle}
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">无（一级部门）</option>
              {allDepts
                .filter((d) => d.id !== dept?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-center">
            <label style={labelStyle}>排序</label>
            <input
              style={inputStyle}
              value={form.sort}
              onChange={(e) => setForm({ ...form, sort: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="flex items-center">
            <label style={labelStyle}>备注</label>
            <input
              style={inputStyle}
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="h-[26px] px-3 text-xs border border-gray-300 rounded hover:bg-gray-50"
            style={{ color: "#333" }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-[26px] px-3 text-xs rounded text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#2853e0" }}
          >
            {saving ? "保存中..." : "修改"}
          </button>
        </div>
      </div>
    </div>
  );
}