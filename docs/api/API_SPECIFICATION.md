# API Specification

## Base URL
`http://localhost:3000/api`

## Authentication
All protected endpoints require a `chatbot_auth` Cookie (HttpOnly) containing a valid JWT.

---

## 1. Chat & AI
### `POST /chat`
The primary interface for reasoning and SQL generation.
- **Body**: `{ "message": "string", "context": {} }`
- **Response**: `{ "reply": "string", "data": [], "vectorData": [] }`
- **Logic**: Orchestrates Intent Detection -> SQL/Vector Search -> RRF Fusion -> Summarization.

## 2. Dashboard Data
### `POST /dashboard/summary`
- **Returns**: `{ "total": int, "open": int, "closed": int, "pending": int }`

### `POST /dashboard/upcoming-hearings`
- **Returns**: `[ { "claim_number": "...", "date": "...", "type": "..." } ]`

## 3. Case Management
### `POST /cases/search`
- **Body**: `{ "query": "string" }`
- **Returns**: List of matching cases by name or number.

### `POST /cases/detail`
- **Body**: `{ "claim_number": "string" }`
- **Returns**: Full case object, hearing history, and parties.

### `POST /cases/finalize`
- **Requires Role**: `judge` or `admin`
- **Body**: `{ "claim_number": "...", "outcome": "..." }`
- **Effect**: Updates status to 'FINALIZED', sets `DateFinalized`, logs audit event.

## 4. Admin & System
### `GET /ai/health`
- **Returns**: Status of MySQL, FAISS, and Ollama connections.

### `GET /admin/audit-log`
- **Requires Role**: `admin`
- **Returns**: Recent security events.

### `POST /admin/maintenance/reindex`
- **Requires Role**: `admin`
- **Effect**: Triggers the Python background worker to rebuild the FAISS index from MySQL data.
