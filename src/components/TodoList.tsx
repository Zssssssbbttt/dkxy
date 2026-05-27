"use client";

import { useState } from "react";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

interface Props {
  todos: Todo[];
  type: "pending" | "done";
  onRefresh: () => void;
}

export default function TodoList({ todos, type, onRefresh }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleComplete(todo: Todo) {
    setLoadingId(todo.id);
    await fetch(`/api/todos/${todo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    setLoadingId(null);
    onRefresh();
  }

  async function deleteTodo(id: string) {
    setLoadingId(id);
    await fetch(`/api/todos/${id}`, {
      method: "DELETE",
    });
    setLoadingId(null);
    onRefresh();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-700 mb-3">
        {type === "pending" ? "待办事项" : "已完成事项"}
      </h2>
      {todos.length === 0 ? (
        <p className="text-gray-400 text-sm">
          {type === "pending" ? "暂无待办事项" : "暂无已完成事项"}
        </p>
      ) : (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
            >
              {type === "pending" && (
                <input
                  type="checkbox"
                  disabled={loadingId === todo.id}
                  onChange={() => toggleComplete(todo)}
                  className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                />
              )}
              <span
                className={`flex-1 ${
                  todo.completed
                    ? "line-through text-gray-400"
                    : "text-gray-800"
                }`}
              >
                {todo.title}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                disabled={loadingId === todo.id}
                className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
