import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/jwt";

export default async function Home() {
  const userId = await getSessionUserId();
  if (userId) redirect("/todos");
  redirect("/login");
}
