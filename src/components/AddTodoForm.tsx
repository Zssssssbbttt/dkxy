"use client";

import { useRef, useState } from "react";

interface Props {
  onAdd: () => void;
}

export default function AddTodoForm({ onAdd }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;

    if (!title.trim()) {
      setError("请输入待办事项");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });

    if (!res.ok) {
      setError("添加失败");
      setLoading(false);
      return;
    }

    formRef.current?.reset();
    setLoading(false);
    onAdd();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <input
        name="title"
        type="text"
        required
        maxLength={200}
        placeholder="输入新的待办事项..."
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {loading ? "添加中..." : "添加"}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
