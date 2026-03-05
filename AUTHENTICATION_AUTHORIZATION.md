# Authentication & Authorization

## 1. Current Implementation
- **Relational Auth**: User accounts are stored in the `cat_users` MySQL table.
- **JWT tokens**: Access is secured via JSON Web Tokens (JWT) stored in a `chatbot_auth` HttpOnly cookie.
- **Password Hashing**: Passwords are hashed using `scrypt` with a random salt.
- **Audit Logging**: All security-relevant actions (Login, Signup, Password Reset, Case Finalization) are recorded in the `audit_log` table.

## 2. Role-Based Access Control (RBAC)
The system supports the following roles:
- **admin**: Full system access, including fallback credentials via `.env`.
- **judge**: Access to judicial tools and case summaries.
- **clerk**: Access to document upload and data entry tools.
- **staff**: General administrative access.

## 3. Security Features
- **HttpOnly Cookies**: Prevents XSS-based token theft.
- **Timing-Safe Equality**: Prevents timing attacks during password verification.
- **Session Expiry**: Tokens automatically expire after 12 hours.
- **Fallback Admin**: A hardcoded administrator can be configured via `AUTH_USERNAME` and `AUTH_PASSWORD` for emergency access.

## 4. Audit Trail
Every major action is logged with:
- **Username**: Who performed the action.
- **Action**: What was done (e.g., `LOGIN_SUCCESS`, `FINALIZE_CASE`).
- **Target**: What object was affected.
- **Details**: Metadata about the action in JSON format.
