import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Todo } from "@prisma/client";
import TodoPageClient from "./TodoPageClient";

export const dynamic = "force-dynamic";

function serialize(todos: Todo[]) {
  return todos.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

export default async function TodosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [pendingTodos, doneTodos] = await Promise.all([
    prisma.todo.findMany({
      where: { userId: session.user.id, completed: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.todo.findMany({
      where: { userId: session.user.id, completed: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <TodoPageClient
      initialPending={serialize(pendingTodos)}
      initialDone={serialize(doneTodos)}
      username={session.user.name || ""}
    />
  );
}
