"use server";

import { createClient } from "@/lib/supabase/server";

export async function createColumn(boardId: string, title: string, position: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("columns")
    .insert({ board_id: boardId, title, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateColumn(id: string, updates: { title?: string; position?: number }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("columns")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteColumn(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("columns").delete().eq("id", id);
  if (error) throw error;
}
