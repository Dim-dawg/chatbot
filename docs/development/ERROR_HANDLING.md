# Error Handling

## 1. Database Connectivity
*   **Failure**: If MySQL is unreachable, the API returns `503 Service Unavailable`.
*   **UI**: The frontend displays a full-screen "System Offline" banner with a "Retry" button.

## 2. AI Failures (Ollama)
*   **Timeout**: Requests exceeding 30 seconds are aborted.
*   **Hallucination Check**: The system validates generated SQL against a whitelist of tables before execution.
*   **Fallback**: If the AI fails to generate SQL, the system falls back to a keyword search.

## 3. Standard Error Codes
| Code | Meaning |
| :--- | :--- |
| `400` | Bad Request (Malformed JSON). |
| `401` | Unauthorized (Missing/Invalid JWT). |
| `403` | Forbidden (Role mismatch). |
| `404` | Not Found (Case or endpoint). |
| `500` | Internal Server Error (Logic bug). |
