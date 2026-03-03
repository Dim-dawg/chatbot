# Error Handling

## 1. Database Connectivity
- If the backend cannot reach MySQL, all API calls return a `503 Service Unavailable` with a descriptive message.
- The frontend displays a full-screen error state with a "Retry Connection" button.

## 2. AI Failures (Ollama)
- **JSON Parsing**: If Ollama returns malformed JSON, the backend attempts to extract SQL manually using regex or falls back to a conversational "I couldn't generate a query" response.
- **Service Down**: If Ollama is unreachable, the chat widget displays a "Librarian is currently unavailable" message.

## 3. SQL Execution Errors
- Generated SQL is wrapped in a `try...catch` block.
- Errors are logged on the server, and the user is informed politely that the data could not be retrieved.

## 4. UI Errors
- Components are wrapped in React Error Boundaries (Future) to prevent full-page crashes.
- Empty states are provided for all lists and charts when data is missing.
