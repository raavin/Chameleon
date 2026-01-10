# Authentication Design
## Phase 7: Offline-First Authentication

**Date:** 2026-01-10  
**Status:** Implementation

---

## Design Decision

### Approach: **Option C - Local Users + Optional Remote Sync**

This approach provides:
1. **Offline Capability**: JWT tokens work without server validation after initial login
2. **Multi-User Support**: Multiple local users can be created
3. **Role-Based Access**: ADMIN, SUPERVISOR, WORKER roles
4. **Future Sync Ready**: Can sync users to central server later

---

## User Roles

| Role | Permissions |
|------|-------------|
| ADMIN | Full access, user management, system config |
| SUPERVISOR | View all clients/submissions, approve actions |
| WORKER | Create/view own submissions, view assigned clients |

---

## Authentication Flow

### Registration
```
1. User submits: email, password, name, role
2. Server hashes password with bcrypt (12 rounds)
3. Server creates user in MongoDB
4. Server returns JWT token
5. Client stores token in localStorage
```

### Login
```
1. User submits: email, password
2. Server finds user by email
3. Server verifies password with bcrypt
4. Server generates JWT (24h expiry)
5. Client stores token in localStorage
```

### Offline Authentication
```
1. Client has valid JWT in localStorage
2. JWT contains: userId, email, role, exp
3. Client validates JWT expiry locally
4. If valid, client uses cached user info
5. If expired, redirect to login
```

---

## JWT Structure

```javascript
{
  header: { alg: "HS256", typ: "JWT" },
  payload: {
    userId: "uuid",
    email: "user@example.com",
    role: "WORKER",
    name: "Jane Doe",
    iat: 1704844800,  // issued at
    exp: 1704931200   // expires in 24h
  },
  signature: "..."
}
```

---

## Security Considerations

### Password Storage
- bcrypt with 12 salt rounds
- Never store plaintext passwords

### JWT Security
- Secret key in environment variable
- 24-hour expiry for security/usability balance
- Refresh tokens NOT implemented (MVP simplicity)

### Offline Security
- Token validated locally for expiry only
- Full re-authentication required when expired
- No sensitive data in JWT payload beyond role

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/auth/register | Create new user | No (but can require ADMIN) |
| POST | /api/auth/login | Authenticate user | No |
| GET | /api/auth/me | Get current user info | Yes |
| GET | /api/auth/users | List all users (admin) | ADMIN only |
| PATCH | /api/auth/users/:id | Update user | ADMIN only |
| DELETE | /api/auth/users/:id | Delete user | ADMIN only |

---

## MongoDB Schema

```javascript
{
  _id: ObjectId,
  id: String,           // UUID
  email: String,        // Unique
  password_hash: String,
  name: String,
  role: String,         // ADMIN, SUPERVISOR, WORKER
  domain_permissions: [String],  // Which domains user can access
  is_active: Boolean,
  last_login: Date,
  created_at: Date,
  updated_at: Date
}
```

---

## Client-Side Storage

### localStorage Keys
- `chameleon_token`: JWT token string
- `chameleon_user`: Cached user object (for offline)

### AuthContext State
```typescript
{
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  login: (email, password) => Promise<void>,
  logout: () => void,
  register: (userData) => Promise<void>
}
```

---

## Implementation Order

1. ✅ Install dependencies (bcryptjs, jsonwebtoken)
2. Create User model (MongoDB schema)
3. Create auth middleware (JWT verification)
4. Create auth routes (register, login, me)
5. Update .env with JWT_SECRET
6. Create AuthContext (React)
7. Create Login component
8. Update API client with token header
9. Create RBAC middleware
10. Apply auth to protected routes

---

**End of Auth Design**
