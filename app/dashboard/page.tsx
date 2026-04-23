import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard-client";
import { getBoards } from "@/actions/boards";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const boards = await getBoards();

  return (
    <DashboardClient
      user={{ id: user.id, name: user.user_metadata?.full_name || user.email || "User" }}
      initialBoards={boards}
    />
  );
}
