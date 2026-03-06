# Logging Strategy

## 1. Application Logs
*   **Stdout/Stderr**: Captured by PM2 or Docker logging driver.
*   **Format**: JSON structured logs.
*   **Levels**: `INFO` (Requests), `WARN` (Slow queries), `ERROR` (Crashes).

## 2. Audit Trail (Database)
Security-critical events are stored permanently in the `audit_log` MySQL table.
*   **Scope**: Logins, failed auth, case creation, case finalization, user role changes.
*   **Retention**: 7 Years.

## 3. AI Chat Event Log
*   **File**: `logs/ai-chat-events.jsonl`
*   **Content**: Anonymized prompts, SQL generation stats, and reasoning tokens.
*   **Privacy**: PII is redacted before writing to this file. Used for debugging model hallucinations.
