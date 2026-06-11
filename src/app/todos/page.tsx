import { getSessionUserId } from "@/lib/jwt";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(userId)),
  });

  const [pendingTodos, doneTodos] = await Promise.all([
    prisma.todo.findMany({
      where: { userId, completed: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.todo.findMany({
      where: { userId, completed: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);


  return (
    <TodoPageClient
      initialPending={serialize(pendingTodos)}
      initialDone={serialize(doneTodos)}
      username={user?.username || ""}
    />
  );
}
