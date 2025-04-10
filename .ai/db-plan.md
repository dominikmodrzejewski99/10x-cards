# Schemat bazy danych PostgreSQL dla projektu 10x-cards

## Tabela: users

- **id**: UUID PRIMARY KEY
- **email**: VARCHAR(255) NOT NULL UNIQUE
- **encrypted_password**: VARCHAR NOT NULL
- **created_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- **updated_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()


## Tabela: flashcards

- **id**: SERIAL PRIMARY KEY
- **front**: VARCHAR(200) NOT NULL
- **back**: VARCHAR(500) NOT NULL
- **source**: VARCHAR(20) NOT NULL CHECK (source IN ('ai-full', 'ai-edited', 'manual'))
- **created_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- **updated_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- **user_id**: UUID NOT NULL
- **generation_id**: BIGINT REFERENCES generation(id) ON DELETE SET NULL

---

## Tabela: generation

- **id**: BIGSERIAL PRIMARY KEY
- **user_id**: UUID NOT NULL REFERENCES users(id)
- **model**: VARCHAR NOT NULL
- **generated_count**: INTEGER NOT NULL
- **accepted_unedited_count**: INTEGER
- **accepted_edited_count**: INTEGER
- **source_text_hash**: VARCHAR NOT NULL
- **generation_duration**: INTEGER NOT NULL
- **source_text_length**: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)
- **created_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- **updated_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()


---


## Tabela: generation_error_logs

- **id**: BIGSERIAL PRIMARY KEY
- **user_id**: UUID NOT NULL
- **model**: VARCHAR NOT NULL
- **source_text_hash**: VARCHAR NOT NULL
- **source_text_length**: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 10000)
- **error_code**: VARCHAR(100) NOT NULL
- **error_message**: TEXT  -- opcjonalny komunikat błędu
- **created_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- **updated_at**: TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()

---

## Relacje między tabelami

- Jeden użytkownik (users) ma wiele fiszek (flashcards)
- Jeden użytkownik (users) ma wiele rekordów w tabeli generation
- Jeden użytkownik (users) ma wiele rekordów w tabeli generation_error_logs
- Każda fiszka (flashcards) może opcjonalnie odnosić się do jednej generacji (generation) poprzez generation_id

---

## Indeksy

- Indeks na kolumnie 'user_id' w tabeli flashcards
- Indeks na kolumnie 'generation_id' w tabeli flashcards
- Indeks na kolumnie 'user_id' w tabeli generation
- Indeks na kolumnie 'user_id' w tabeli generation_error_logs


---

## Mechanizmy automatycznej aktualizacji timestampu

- Trigger dla każdej z tabel, automatycznie aktualizujący kolumnę `updated_at` przy każdej modyfikacji rekordu.

---

## Zasady RLS (Row Level Security)

- Wdrożone zasady RLS opierają się na domyślnym mechanizmie identyfikacji użytkownika oferowanym przez Supabase.
- Użytkownicy mają dostęp wyłącznie do swoich danych poprzez:
  - SELECT, UPDATE oraz DELETE oparte na dopasowaniu `user_id` do identyfikatora bieżącego użytkownika.

---

## Dodatkowe uwagi

- Schemat jest zoptymalizowany pod względem wydajności dzięki zastosowaniu indeksów na kolumnie `user_id` w obu tabelach.
- W przyszłych iteracjach możliwe jest rozszerzenie indeksów (np. pełnotekstowe indeksy na kolumnach `front` i `back`).
- Rozważane jest również dodanie dodatkowych pól w tabeli `generation_logs`, np. przechowywania pełnego tekstu źródłowego lub bardziej szczegółowych komunikatów błędów. 