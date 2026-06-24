"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";

export default function EmployeeListPage() {
  const router = useRouter();
  const [list, setList] = useState<
    {
      id: string;
      employeeId: string;
      name: string;
      departmentId: string;
      position: string;
      phone: string;
    }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search) params.set("search", search);
    if (departmentId) params.set("departmentId", departmentId);
    const res = await fetch(`/api/employee/profiles?${params}`);
    const data = await res.json();
    if (data.list) {
      setList(data.list);
      setTotal(data.total);
    }
  }, [page, search, departmentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setDepartments(d);
      })
      .catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <PageHeader
        title="员工列表"
        extra={
          <button
            onClick={() => router.push("/employee/register")}
            className="h-[26px] px-3 text-xs rounded text-white hover:opacity-90"
            style={{ backgroundColor: "#2853e0" }}
          >
            添加员工
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="搜索姓名/工号..."
          className="h-[26px] w-48 px-2 text-xs border rounded focus:outline-none"
          style={{ borderColor: "#ccc" }}
        />
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
          className="h-[26px] px-2 text-xs border rounded"
          style={{ borderColor: "#ccc" }}
        >
          <option value="">全部部门</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className="bg-white rounded-card border"
        style={{ borderColor: "#d6e0ff" }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: "#d6e0ff" }}
            >
              <th
                className="text-left px-3 py-2 font-semibold"
                style={{ color: "#333" }}
              >
                工号
              </th>
              <th
                className="text-left px-3 py-2 font-semibold"
                style={{ color: "#333" }}
              >
                姓名
              </th>
              <th
                className="text-left px-3 py-2 font-semibold"
                style={{ color: "#333" }}
              >
                部门
              </th>
              <th
                className="text-left px-3 py-2 font-semibold"
                style={{ color: "#333" }}
              >
                岗位
              </th>
              <th
                className="text-left px-3 py-2 font-semibold"
                style={{ color: "#333" }}
              >
                手机号
              </th>
              <th
                className="text-left px-3 py-2 font-semibold"
                style={{ color: "#333" }}
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr
                key={item.id}
                className="border-b hover:bg-gray-50"
                style={{ borderColor: "#d6e0ff" }}
              >
                <td className="px-3 py-2" style={{ color: "#333" }}>
                  {item.employeeId}
                </td>
                <td className="px-3 py-2" style={{ color: "#333" }}>
                  {item.name}
                </td>
                <td className="px-3 py-2" style={{ color: "#333" }}>
                  {item.departmentId}
                </td>
                <td className="px-3 py-2" style={{ color: "#333" }}>
                  {item.position}
                </td>
                <td className="px-3 py-2" style={{ color: "#333" }}>
                  {item.phone}
                </td>
                <td className="px-3 py-2">
                  <button
                    className="text-xs hover:underline"
                    style={{ color: "#2853e0" }}
                  >
                    查看
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && (
          <p
            className="text-center py-8 text-xs"
            style={{ color: "#9ba6cc" }}
          >
            暂无数据
          </p>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-end mt-3 gap-2 text-xs">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="h-[26px] px-2 border rounded disabled:opacity-40"
            style={{ color: "#333" }}
          >
            上一页
          </button>
          <span style={{ color: "#9ba6cc" }}>
            第 {page} 页 / 共 {totalPages} 页
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="h-[26px] px-2 border rounded disabled:opacity-40"
            style={{ color: "#333" }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}