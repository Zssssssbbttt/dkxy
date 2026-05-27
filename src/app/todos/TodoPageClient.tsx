"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useState } from "react";
import AddTodoForm from "@/components/AddTodoForm";
import TodoList from "@/components/TodoList";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export default function TodoPageClient({
  initialPending,
  initialDone,
  username,
}: {
  initialPending: Todo[];
  initialDone: Todo[];
  username: string;
}) {
  const router = useRouter();
  const [pendingTodos, setPendingTodos] = useState<Todo[]>(initialPending);
  const [doneTodos, setDoneTodos] = useState<Todo[]>(initialDone);

  const refresh = useCallback(async () => {
    const [pendingRes, doneRes] = await Promise.all([
      fetch("/api/todos?status=pending"),
      fetch("/api/todos?status=done"),
    ]);
    if (pendingRes.ok) setPendingTodos(await pendingRes.json());
    if (doneRes.ok) setDoneTodos(await doneRes.json());
    router.refresh();
  }, [router]);

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">待办事项</h1>
            <p className="text-sm text-gray-500">欢迎, {username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            退出登录
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <AddTodoForm onAdd={refresh} />
        <TodoList todos={pendingTodos} type="pending" onRefresh={refresh} />
        <TodoList todos={doneTodos} type="done" onRefresh={refresh} />
      </main>
    </div>
  );
}
