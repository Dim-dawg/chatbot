# Access Control & Permissions

## 1. Authentication Flow
1.  **Login**: User provides credentials.
2.  **Verification**: Backend hashes password (`scrypt`) and compares with `cat_users`.
3.  **Token**: A signed JWT is generated containing `username` and `role`.
4.  **Session**: JWT is sent as an `HttpOnly` cookie (`chatbot_auth`).

## 2. Roles & Capabilities (RBAC)

| Feature | Administrator | Judge | Clerk | Staff |
| :--- | :---: | :---: | :---: | :---: |
| **System Config** | ✅ | ❌ | ❌ | ❌ |
| **User Management** | ✅ | ❌ | ❌ | ❌ |
| **Finalize Case** | ✅ | ✅ | ❌ | ❌ |
| **View Audit Log** | ✅ | ❌ | ❌ | ❌ |
| **Re-index AI** | ✅ | ❌ | ❌ | ❌ |
| **Upload Files** | ✅ | ✅ | ✅ | ❌ |
| **Search Cases** | ✅ | ✅ | ✅ | ✅ |

## 3. Implementation
Permissions are enforced via the `requireRole` middleware in `server.ts`.
```typescript
const requireRole = (roles: string[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.sendStatus(403);
  next();
};
```
