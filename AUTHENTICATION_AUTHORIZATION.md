# Authentication & Authorization

## 1. Current Implementation
- **Internal Access**: "The chatbot" is currently designed for use within a secure local network.
- **Database Auth**: Access is controlled via credentials stored in the `.env` file.

## 2. Authorization (Future)
We plan to implement role-based access control (RBAC) to distinguish between:
- **Judges**: Full access to case files and data-changing actions.
- **Clerks**: Read-only access to most data, limited action capabilities.
- **Administrative Staff**: Access to dashboard metrics but not sensitive case narratives.

## 3. JWT Integration (Future)
Future versions will include a login screen that generates JSON Web Tokens (JWT) to secure API requests between the React frontend and Node.js backend.
