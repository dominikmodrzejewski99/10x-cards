-- Tabela zestawów fiszek
create table public.flashcard_sets (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null,
  description varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flashcard_sets_user_id_idx on public.flashcard_sets(user_id);

alter table public.flashcard_sets enable row level security;

create policy "Users can view own sets"
  on public.flashcard_sets for select
  using (auth.uid() = user_id);

create policy "Users can create own sets"
  on public.flashcard_sets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sets"
  on public.flashcard_sets for update
  using (auth.uid() = user_id);

create policy "Users can delete own sets"
  on public.flashcard_sets for delete
  using (auth.uid() = user_id);

-- Dodanie kolumny set_id do flashcards (nullable — istniejące fiszki zostają bez zestawu)
alter table public.flashcards
  add column set_id integer references public.flashcard_sets(id) on delete set null;

create index flashcards_set_id_idx on public.flashcards(set_id);
