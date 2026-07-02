"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";

export default function DepartmentCreatePage() {
  const router = useRouter();
  const [allDepts, setAllDepts] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    parentId: "",
    sort: "",
    remark: "",
  });

  useEffect(() => {
    apiGet("/api/departments")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data))
          setAllDepts(data.map((d: { id: string; name: string }) => ({ id: d.id, name: d.name })));
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    if (!form.name || !form.code) return;
    setSaving(true);
    try {
      const res = await apiPost("/api/departments", {
        ...form,
        parentId: form.parentId || null,
        sort: form.sort || "0",
        remark: form.remark || null,
      });
      if (res.ok) {
        router.push("/departmentManage");
      } else {
        const data = await res.json();
        alert(data.error || "保存失败");
      }
    } catch (e) {
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
    <div className="bg-white rounded-card border h-full flex flex-col" style={{ borderColor: "#d6e0ff" }}>
      <h2
        className="text-lg font-semibold px-4 py-3 border-b flex items-center gap-2 shrink-0"
        style={{ borderColor: "#d6e0ff", color: "#333" }}
      >
        <span className="inline-block w-[3px] h-[14px] rounded" style={{ backgroundColor: "#2853e0" }} />
        新建部门
      </h2>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
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
            {allDepts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
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
        <div className="flex justify-end gap-2 pt-3">
          <button
            onClick={() => router.back()}
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