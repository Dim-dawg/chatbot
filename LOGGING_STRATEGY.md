# Logging Strategy

## 1. Console Logging (Development)
- Server-side logs for every incoming API request.
- Logging of generated SQL queries for manual accuracy review.
- Error stack traces for database connection failures.

## 2. Audit Logging (Judicial Requirement)
- Every data-changing action (like `finalize_case`) must be logged.
- Recommended format: `TIMESTAMP | ACTION | USER_ID | TARGET_ID | SUCCESS_STATUS`.

## 3. Storage
- Logs are currently output to the server console.
- Future versions will support writing logs to a local file system or a dedicated `security_audit_log` table in MySQL.
