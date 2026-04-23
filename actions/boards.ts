"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { POS_GAP } from "@/lib/utils";

export async function getBoards() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("boards")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createBoard(title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Create board
  const { data: board, error } = await supabase
    .from("boards")
    .insert({ title, user_id: user.id })
    .select()
    .single();

  if (error) throw error;

  // Create default columns
  await supabase.from("columns").insert([
    { board_id: board.id, title: "Yapılacak", position: POS_GAP },
    { board_id: board.id, title: "Devam Ediyor", position: POS_GAP * 2 },
    { board_id: board.id, title: "Tamamlandı", position: POS_GAP * 3 },
  ]);

  revalidatePath("/dashboard");
  return board;
}

export async function deleteBoard(boardId: string) {
  const supabase = await createClient();
  await supabase.from("boards").delete().eq("id", boardId);
  revalidatePath("/dashboard");
}

export async function getBoardData(boardId: string) {
  const supabase = await createClient();

  const [boardRes, colsRes, cardsRes] = await Promise.all([
    supabase.from("boards").select("*").eq("id", boardId).single(),
    supabase
      .from("columns")
      .select("*")
      .eq("board_id", boardId)
      .order("position"),
    supabase
      .from("cards")
      .select("*")
      .in(
        "column_id",
        (
          await supabase
            .from("columns")
            .select("id")
            .eq("board_id", boardId)
        ).data?.map((c) => c.id) ?? []
      )
      .order("position"),
  ]);

  return {
    board: boardRes.data,
    columns: colsRes.data ?? [],
    cards: cardsRes.data ?? [],
  };
}
