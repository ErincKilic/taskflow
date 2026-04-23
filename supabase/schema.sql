-- ============================================================
-- TaskFlow — Supabase Schema
-- Supabase Dashboard > SQL Editor içinde çalıştırın
-- ============================================================

-- Boards
create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now()
);

alter table public.boards enable row level security;

create policy "Users see own boards"
  on public.boards for select
  using (auth.uid() = user_id);

create policy "Users insert own boards"
  on public.boards for insert
  with check (auth.uid() = user_id);

create policy "Users update own boards"
  on public.boards for update
  using (auth.uid() = user_id);

create policy "Users delete own boards"
  on public.boards for delete
  using (auth.uid() = user_id);


-- Columns
create table public.columns (
  id          uuid primary key default gen_random_uuid(),
  board_id    uuid not null references public.boards(id) on delete cascade,
  title       text not null,
  position    float8 not null default 65536,
  created_at  timestamptz not null default now()
);

alter table public.columns enable row level security;

create policy "Users see own columns"
  on public.columns for select
  using (
    exists (
      select 1 from public.boards
      where boards.id = columns.board_id
        and boards.user_id = auth.uid()
    )
  );

create policy "Users insert own columns"
  on public.columns for insert
  with check (
    exists (
      select 1 from public.boards
      where boards.id = columns.board_id
        and boards.user_id = auth.uid()
    )
  );

create policy "Users update own columns"
  on public.columns for update
  using (
    exists (
      select 1 from public.boards
      where boards.id = columns.board_id
        and boards.user_id = auth.uid()
    )
  );

create policy "Users delete own columns"
  on public.columns for delete
  using (
    exists (
      select 1 from public.boards
      where boards.id = columns.board_id
        and boards.user_id = auth.uid()
    )
  );


-- Cards
create table public.cards (
  id          uuid primary key default gen_random_uuid(),
  column_id   uuid not null references public.columns(id) on delete cascade,
  title       text not null,
  description text not null default '',
  position    float8 not null default 65536,
  created_at  timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "Users see own cards"
  on public.cards for select
  using (
    exists (
      select 1 from public.columns
      join public.boards on boards.id = columns.board_id
      where columns.id = cards.column_id
        and boards.user_id = auth.uid()
    )
  );

create policy "Users insert own cards"
  on public.cards for insert
  with check (
    exists (
      select 1 from public.columns
      join public.boards on boards.id = columns.board_id
      where columns.id = cards.column_id
        and boards.user_id = auth.uid()
    )
  );

create policy "Users update own cards"
  on public.cards for update
  using (
    exists (
      select 1 from public.columns
      join public.boards on boards.id = columns.board_id
      where columns.id = cards.column_id
        and boards.user_id = auth.uid()
    )
  );

create policy "Users delete own cards"
  on public.cards for delete
  using (
    exists (
      select 1 from public.columns
      join public.boards on boards.id = columns.board_id
      where columns.id = cards.column_id
        and boards.user_id = auth.uid()
    )
  );


-- Indexes for performance
create index idx_boards_user on public.boards(user_id);
create index idx_columns_board on public.columns(board_id, position);
create index idx_cards_column on public.cards(column_id, position);
