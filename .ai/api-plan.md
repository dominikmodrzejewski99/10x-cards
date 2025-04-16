# REST API Plan

## 1. Resources

- **Users**: Corresponds to the `users` table. Manages user profiles and authentication data.
- **Flashcards**: Corresponds to the `flashcards` table. Represents flashcards with fields such as `front`, `back`, `source`, and relationships to generation records.
- **Generations**: Corresponds to the `generation` table. Stores metadata about AI-generated flashcards including model used, count of generated and accepted flashcards, and source text information.
- **Generation Error Logs**: Corresponds to the `generation_error_logs` table. Contains logs for any errors encountered during the AI flashcard generation process.

## 2. Endpoints

### Flashcards Endpoints

- **GET /flashcards**
  - Description: Retrieves a paginated list of the user's flashcards.
  - Query Parameters:
    - `limit` (optional, default 10)
    - `offset` (optional, default 0)
    - `sort` (e.g., by `created_at`)
    - `order` (asc/desc)
  - Response Codes:
    - 200: Returns a list of flashcards.
    - 401: Unauthorized access.

- **GET /flashcards/{id}**
  - Description: Retrieves a specific flashcard by its ID.
  - Response Codes:
    - 200: Returns flashcard details.
    - 404: Flashcard not found.

- **POST /flashcards**
  - Description: Creates new flashcards. This endpoint supports both single and batch creation of flashcards, catering for manual entry as well as AI-generated flashcards (e.g., "ai-full" and "ai-edited").
  - Request Payload (single object):
    ```json
    {
      "front": "Question text",
      "back": "Answer text",
      "source": "manual"
    }
    ```
  - Request Payload (batch request):
    ```json
    [
      {
        "front": "Question text 1",
        "back": "Answer text 1",
        "source": "ai-full"
      },
      {
        "front": "Question text 2",
        "back": "Answer text 2",
        "source": "ai-edited"
      }
    ]
    ```
  - Response Codes:
    - 201: Flashcard(s) created successfully.
    - 400: Validation errors (e.g., missing required fields, invalid source value, or invalid request format).

- **PUT /flashcards/{id}** or **PATCH /flashcards/{id}**
  - Description: Updates an existing flashcard.
  - Request Payload:
    ```json
    {
      "front": "Updated question text",
      "back": "Updated answer text",
      "source": "manual"  // Can be updated if applicable
    }
    ```
  - Response Codes:
    - 200: Flashcard updated successfully.
    - 400: Validation errors.
    - 404: Flashcard not found.

- **DELETE /flashcards/{id}**
  - Description: Deletes a flashcard.
  - Response Codes:
    - 200: Flashcard deleted successfully.
    - 404: Flashcard not found.

### Generation Endpoints (AI Flashcard Generation)

- **POST /generations**
  - Description: Initiate the AI generation process for flashcards based on user-provided text.
  - Request Payload:
    ```json
    {
      "text": "Input text between 1000 and 10000 characters",
      "model": "chosen-model-name"  // optional if a default is provided
    }
    ```
  - Business Logic:
    - Call the AI service to generate flashcards
    - Store the generation metadata and associated generated flashcards
    - Validates that the input text length is within the allowed range.
  - Response Codes:
    - 200: Returns generated flashcard suggestions along with metadata (e.g., generated_count).
    - 400: Validation error (e.g., input text length out of bounds).
    - 500: AI generation or API error.

- **GET /generations**
  - Description: Retrieves a list of past generation attempts for the user.
  - Query Parameters:
    - `limit`, `offset` for pagination.
  - Response Codes:
    - 200: List of generation records.
    - 401: Unauthorized.

- **GET /generations/{id}**
  - Description: Retrieves details of a specific generation attempt.
  - Response Codes:
    - 200: Returns generation record details.
    - 404: Generation record not found.

### Generation Error Logs Endpoints

- **GET /generation-error-logs**
  - Description: Retrieves error logs for AI generation attempts associated with the authenticated user.
  - Query Parameters:
    - `limit`, `offset` for pagination.
  - Response Codes:
    - 200: List of error log records.
    - 401: Unauthorized.


## 3. Authentication and Authorization

- The API uses JWT tokens issued via Supabase authentication.
- All endpoints (except registration and login) require the `Authorization` header with a valid JWT token as `Bearer <token>`.
- Row-Level Security (RLS) is enforced at the database level, ensuring that users only have access to their own data.

## 4. Validation and Business Logic

- **Input Validation:**
  - For flashcards, the `source` field must be one of `['ai-full', 'ai-edited', 'manual']`.
  - For flashcard generation, the input text must be between 1000 and 10000 characters.
- **Business Logic:**
  - The `/generations` endpoint leverages an AI model to generate flashcard suggestions, which users can review, edit, and selectively save.
  - Manual creation, updating, and deletion of flashcards are handled via the `/flashcards` endpoints.
- **Pagination, Filtering, and Sorting:**
  - List endpoints support pagination via `limit` and `offset` parameters, along with sorting and filtering options to efficiently retrieve data.
- **Performance:**
  - Database indexes on fields such as `user_id` in multiple tables ensure optimized queries and high performance under load.
- **Error Handling:**
  - Standard HTTP status codes (200, 201, 400, 401, 404, 500) are used consistently with JSON responses containing descriptive error messages. 