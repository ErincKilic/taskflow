import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getBoardData } from "@/actions/boards";
import KanbanBoard from "@/components/kanban-board";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { board, columns, cards } = await getBoardData(id);

  if (!board) notFound();

  return (
    <KanbanBoard
      board={board}
      initialColumns={columns}
      initialCards={cards}
    />
  );
}
