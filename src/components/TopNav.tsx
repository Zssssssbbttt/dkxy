"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  role: string;
  departmentId: string | null;
}

export default function TopNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
      {/* Logo + 名称 */}
      <div className="flex items-center gap-2 font-bold text-lg text-gray-800 shrink-0">
        {/*<span className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm">*/}
        {/*  ERP*/}
        {/*</span>*/}
        <span>企业管理系统</span>
      </div>

      {/* 工作台标签 */}
      <nav className="flex items-center gap-1 ml-4">
        <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-md font-medium">
          工作台
        </button>
      </nav>

      {/* 搜索框 */}
      <div className="flex-1 max-w-md mx-auto">
        <input
          type="text"
          placeholder="搜索员工或应用..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 头像 + 姓名 */}
      {user && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm text-gray-600">
            {user.name.charAt(0)}
          </span>
          <span className="text-sm text-gray-700">{user.name}</span>
        </div>
      )}
    </header>
  );
}