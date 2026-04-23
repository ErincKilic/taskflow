"use server";

import { createClient } from "@/lib/supabase/server";

export async function createCard(
  columnId: string,
  title: string,
  position: number
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cards")
    .insert({ column_id: columnId, title, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCard(
  id: string,
  updates: {
    title?: string;
    description?: string;
    column_id?: string;
    position?: number;
    due_date?: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").update(updates).eq("id", id);
  if (error) throw error;
}

export async function moveCard(
  id: string,
  columnId: string,
  position: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ column_id: columnId, position })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCard(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}