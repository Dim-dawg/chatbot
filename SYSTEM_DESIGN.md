# System Design

## Component Interaction Overview

```text
[ React Frontend ]
       |
       | (HTTP POST /api/chat)
       v
[ Node.js Backend ] <------> [ Mistral AI API ]
       |                      (Intent & SQL Gen)
       | (SQL Execution)
       v
[ MySQL Database ]
       |
       | (Fetch Case Details)
       v
[ Dashboard Views ]
```

## AI Data Flow
1. **Input**: User natural language query.
2. **Context**: Node.js appends the filtered database schema to the query.
3. **Intent Detection**: The backend calls the Mistral AI API, which identifies if the user wants to `QUERY` data or perform an `ACTION` (like finalize_case).
4. **Execution**:
    - **QUERY**: Node.js runs the SQL returned by Mistral and sends the results back to the API for summarization.
    - **ACTION**: Node.js calls a MySQL Stored Procedure (`sp_finalize_case`).
5. **Output**: Conversational professional reply to the judge.

## Dashboard Synchronization
- The dashboard calls three distinct endpoints: `/summary`, `/upcoming-hearings`, and `/recent-judgments`.
- These endpoints query pre-defined MySQL views (`ai_caseload_summary`, etc.) to ensure high-performance data retrieval without complex frontend logic.
