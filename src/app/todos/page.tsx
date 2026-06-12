import { getSessionUserId } from "@/lib/jwt";
import { db } from "@/lib/drizzle";
import { users, todos } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import TodoPageClient from "./TodoPageClient";

export const dynamic = "force-dynamic";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

function toClient(todo: typeof todos.$inferSelect): TodoItem {
  return {
    id: String(todo.id),
    title: todo.title,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

export default async function TodosPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const uid = Number(userId);

  const user = await db.query.users.findFirst({
    where: eq(users.id, uid),
  });

  const [pendingTodos, doneTodos] = await Promise.all([
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, uid), eq(todos.completed, false)))
      .orderBy(desc(todos.createdAt)),
    db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, uid), eq(todos.completed, true)))
      .orderBy(desc(todos.updatedAt)),
  ]);

  return (
    <TodoPageClient
      initialPending={pendingTodos.map(toClient)}
      initialDone={doneTodos.map(toClient)}
      username={user?.username || ""}
    />
  );
}
