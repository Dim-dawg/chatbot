# API Specification

All endpoints are hosted on Port 3000 by default.

## 1. Chat & AI
### `POST /api/chat`
Handles conversational AI and database actions.
- **Body**: `{ message: string, schemaContext: object }`
- **Returns**: `{ reply: string, sql?: string, data?: array, success: boolean }`

### `POST /api/schema`
Fetches the filtered database schema for AI context.
- **Returns**: `{ schema: object, database: string }`

## 2. Dashboard
### `POST /api/dashboard/summary`
Returns high-level case counts.
- **Returns**: `{ total: int, open: int, pending: int, closed: int }`

### `POST /api/dashboard/upcoming-hearings`
Returns 15 most recently scheduled hearings.
- **Returns**: `Array<{ claim_number, casename, hearing_type, assigned_start_date, start_time, judge_name }>`

### `POST /api/dashboard/recent-judgments`
Returns 10 most recently finalized cases.
- **Returns**: `Array<{ claim_number, CaseName, case_outcome, DateFinalized }>`

### `GET /api/dashboard/monthly-case-counts`
Returns case volume trend for the last 12 months.
- **Returns**: `Array<{ month: string, count: int }>`

## 3. Case Operations
### `POST /api/cases/detail`
Fetches full case file details.
- **Body**: `{ claim_number: string }`
- **Returns**: `{ info: object, parties: array, history: array }`

### `POST /api/cases/finalize`
Triggers the `sp_finalize_case` stored procedure.
- **Body**: `{ claim_number: string, outcome: string }`
- **Returns**: `{ success: boolean }`
