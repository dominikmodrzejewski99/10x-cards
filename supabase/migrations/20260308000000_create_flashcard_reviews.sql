-- Migracja: Tabela flashcard_reviews dla systemu Spaced Repetition (SM-2)
-- Przechowuje dane algorytmu SM-2: ease_factor, interval, repetitions, next_review_date

create table public.flashcard_reviews (
    id serial primary key,
    flashcard_id integer not null references public.flashcards(id) on delete cascade,
    user_id uuid not null references public.users(id),
    ease_factor numeric(4,2) not null default 2.50,
    interval integer not null default 0,
    repetitions integer not null default 0,
    next_review_date timestamptz not null default now(),
    last_reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(flashcard_id, user_id)
);

-- Włączenie RLS dla tabeli flashcard_reviews
alter table public.flashcard_reviews enable row level security;

-- Polityki RLS dla flashcard_reviews
create policy "Użytkownicy mogą widzieć tylko swoje recenzje"
    on public.flashcard_reviews for select
    using (auth.uid() = user_id);

create policy "Użytkownicy mogą tworzyć tylko swoje recenzje"
    on public.flashcard_reviews for insert
    with check (auth.uid() = user_id);

create policy "Użytkownicy mogą aktualizować tylko swoje recenzje"
    on public.flashcard_reviews for update
    using (auth.uid() = user_id);

create policy "Użytkownicy mogą usuwać tylko swoje recenzje"
    on public.flashcard_reviews for delete
    using (auth.uid() = user_id);

-- Indeksy
create index flashcard_reviews_user_id_next_review_idx
    on public.flashcard_reviews(user_id, next_review_date);
create index flashcard_reviews_flashcard_id_idx
    on public.flashcard_reviews(flashcard_id);

-- Trigger do automatycznej aktualizacji updated_at
create trigger handle_flashcard_reviews_updated_at
    before update on public.flashcard_reviews
    for each row
    execute function public.handle_updated_at();
