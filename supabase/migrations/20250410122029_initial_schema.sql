-- Migracja: Inicjalny schemat bazy danych dla projektu 10x-cards
-- Opis: Tworzy podstawowe tabele: users, flashcards, generation oraz generation_error_logs
-- wraz z odpowiednimi relacjami, indeksami i politykami bezpieczeństwa.

-- Tabela users
create table public.users (
    id uuid primary key,
    email varchar(255) not null unique,
    encrypted_password varchar not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Włączenie RLS dla tabeli users
alter table public.users enable row level security;

-- Polityki RLS dla users
create policy "Użytkownicy mogą widzieć tylko swoje dane"
    on public.users for select
    using (auth.uid() = id);

create policy "Użytkownicy mogą aktualizować tylko swoje dane"
    on public.users for update
    using (auth.uid() = id);

-- Tabela generation
create table public.generation (
    id bigserial primary key,
    user_id uuid not null references public.users(id),
    model varchar not null,
    generated_count integer not null,
    accepted_unedited_count integer,
    accepted_edited_count integer,
    source_text_hash varchar not null,
    generation_duration integer not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Włączenie RLS dla tabeli generation
alter table public.generation enable row level security;

-- Polityki RLS dla generation
create policy "Użytkownicy mogą widzieć tylko swoje generacje"
    on public.generation for select
    using (auth.uid() = user_id);

create policy "Użytkownicy mogą tworzyć tylko swoje generacje"
    on public.generation for insert
    with check (auth.uid() = user_id);

create policy "Użytkownicy mogą aktualizować tylko swoje generacje"
    on public.generation for update
    using (auth.uid() = user_id);

create policy "Użytkownicy mogą usuwać tylko swoje generacje"
    on public.generation for delete
    using (auth.uid() = user_id);

-- Tabela flashcards
create table public.flashcards (
    id serial primary key,
    front varchar(200) not null,
    back varchar(500) not null,
    source varchar(20) not null check (source in ('ai-full', 'ai-edited', 'manual')),
    user_id uuid not null references public.users(id),
    generation_id bigint references public.generation(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Włączenie RLS dla tabeli flashcards
alter table public.flashcards enable row level security;

-- Polityki RLS dla flashcards
create policy "Użytkownicy mogą widzieć tylko swoje fiszki"
    on public.flashcards for select
    using (auth.uid() = user_id);

create policy "Użytkownicy mogą tworzyć tylko swoje fiszki"
    on public.flashcards for insert
    with check (auth.uid() = user_id);

create policy "Użytkownicy mogą aktualizować tylko swoje fiszki"
    on public.flashcards for update
    using (auth.uid() = user_id);

create policy "Użytkownicy mogą usuwać tylko swoje fiszki"
    on public.flashcards for delete
    using (auth.uid() = user_id);

-- Tabela generation_error_logs
create table public.generation_error_logs (
    id bigserial primary key,
    user_id uuid not null references public.users(id),
    model varchar not null,
    source_text_hash varchar not null,
    source_text_length integer not null check (source_text_length between 1000 and 10000),
    error_code varchar(100) not null,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Włączenie RLS dla tabeli generation_error_logs
alter table public.generation_error_logs enable row level security;

-- Polityki RLS dla generation_error_logs
create policy "Użytkownicy mogą widzieć tylko swoje logi błędów"
    on public.generation_error_logs for select
    using (auth.uid() = user_id);

create policy "Użytkownicy mogą tworzyć tylko swoje logi błędów"
    on public.generation_error_logs for insert
    with check (auth.uid() = user_id);

-- Indeksy
create index flashcards_user_id_idx on public.flashcards(user_id);
create index flashcards_generation_id_idx on public.flashcards(generation_id);
create index generation_user_id_idx on public.generation(user_id);
create index generation_error_logs_user_id_idx on public.generation_error_logs(user_id);

-- Triggery do automatycznej aktualizacji updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger handle_users_updated_at
    before update on public.users
    for each row
    execute function public.handle_updated_at();

create trigger handle_flashcards_updated_at
    before update on public.flashcards
    for each row
    execute function public.handle_updated_at();

create trigger handle_generation_updated_at
    before update on public.generation
    for each row
    execute function public.handle_updated_at();

create trigger handle_generation_error_logs_updated_at
    before update on public.generation_error_logs
    for each row
    execute function public.handle_updated_at(); 