"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api-client";

interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  sort: string;
  status: string;
  employeeCount: number;
  remark?: string | null;
}

interface TreeNode extends Department {
  children: TreeNode[];
}

function buildTree(list: Department[], parentId: string | null): TreeNode[] {
  return list
    .filter((d) => d.parentId === parentId)
    .sort((a, b) => a.sort.localeCompare(b.sort))
    .map((d) => ({
      ...d,
      children: buildTree(list, d.id),
    }));
}

export default function DepartmentManagePage() {
  const router = useRouter();
  const [list, setList] = useState<Department[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await apiGet("/api/departments");
      const data = await res.json();
      if (Array.isArray(data)) setList(data);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const tree = buildTree(list, null);

  function renderRow(node: TreeNode, depth: number) {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 border-b border-gray-100"
          style={{ paddingLeft: `${12 + depth * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="text-gray-400 text-xs w-4"
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <span className="flex-1 text-sm" style={{ color: "#333" }}>
            {node.name}
            <span className="text-gray-400 ml-2 text-xs">
              {node.employeeCount}人
            </span>
          </span>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map((child) => renderRow(child, depth + 1))}</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: "#333" }}>
          <span className="inline-block w-[3px] h-4 rounded" style={{ backgroundColor: "#2853e0" }} />
          部门管理
        </h1>
        <button
          onClick={() => router.push("/departmentManage/create")}
          className="h-[26px] px-3 text-xs rounded text-white hover:opacity-90"
          style={{ backgroundColor: "#2853e0" }}
        >
          新建部门
        </button>
      </div>

      <div className="bg-white rounded-card border" style={{ borderColor: "#d6e0ff" }}>
        {tree.length === 0 ? (
          <p className="text-center py-8 text-xs" style={{ color: "#9ba6cc" }}>
            暂无部门
          </p>
        ) : (
          tree.map((node) => renderRow(node, 0))
        )}
      </div>
    </div>
  );
}