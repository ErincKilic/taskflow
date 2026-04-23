export interface Board {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
  position: number;
  due_date: string | null;
  label: string | null;
  created_at: string;
}

export interface BoardData {
  board: Board;
  columns: Column[];
  cards: Card[];
}
