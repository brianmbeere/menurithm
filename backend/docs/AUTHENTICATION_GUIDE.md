# 🔐 Menurithm API Authentication Strategy

## Overview

Menurithm implements a comprehensive authentication strategy using Firebase Authentication with role-based access control (RBAC), rate limiting, and enhanced security features.

## 🏗️ Architecture

### Authentication Flow
```
Client → Firebase Auth → JWT Token → FastAPI → Role Check → API Access
```

### Security Layers
1. **Firebase JWT Verification** - Token validation and user identity
2. **Role-Based Access Control** - User permissions by role
3. **Rate Limiting** - Request throttling per user/IP
4. **Security Headers** - CORS, XSS protection, etc.
5. **Audit Logging** - Track sensitive operations

## 🎭 User Roles & Permissions

### Role Hierarchy
- **Viewer** (Level 1): Read-only access
- **User** (Level 2): Read + Write own data
- **Manager** (Level 3): Read + Write + Delete + Manage team
- **Admin** (Level 4): Full system access

### Permission Matrix
| Operation | Viewer | User | Manager | Admin |
|-----------|--------|------|---------|-------|
| Read data | ✅ | ✅ | ✅ | ✅ |
| Write own data | ❌ | ✅ | ✅ | ✅ |
| Write any data | ❌ | ❌ | ✅ | ✅ |
| Delete own data | ❌ | ❌ | ✅ | ✅ |
| Delete any data | ❌ | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ | ✅ |
| System admin | ❌ | ❌ | ❌ | ✅ |

## 🚀 Implementation Guide

### Step 1: Frontend Authentication

```typescript
// Example: React/TypeScript authentication
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const authenticateUser = async (email: string, password: string) => {
  const auth = getAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  
  // Store token for API calls
  localStorage.setItem('authToken', token);
  return token;
};

// Making authenticated API calls
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': \`Bearer \${token}\`,
      'Content-Type': 'application/json'
    }
  });
};
```

### Step 2: Backend Route Protection

```python
from app.utils.auth_enhanced import get_current_user, require_role, UserRole

# Basic authentication
@router.get("/protected-endpoint")
async def protected_route(
    current_user: User = Depends(get_current_user)
):
    return {"message": "You are authenticated!", "user": current_user.email}

# Role-based protection
@router.post("/admin-only")
async def admin_only_route(
    current_user: User = Depends(get_current_admin)
):
    return {"message": "Admin access granted"}

# Using decorators
@router.put("/manager-operation")
@require_role([UserRole.MANAGER, UserRole.ADMIN])
async def manager_operation(
    current_user: User = Depends(get_current_user)
):
    return {"message": "Manager operation completed"}
```

### Step 3: API Key Authentication (Service-to-Service)

```python
# For internal services or integrations
@router.post("/internal-api")
async def internal_endpoint(
    valid_key: bool = Depends(verify_api_key)
):
    return {"message": "Internal API access granted"}

# Flexible authentication (Firebase OR API Key)
@router.get("/flexible-auth")
async def flexible_endpoint(
    auth_info: dict = Depends(flexible_auth)
):
    if auth_info["auth_type"] == "api_key":
        return {"message": "Authenticated via API key"}
    else:
        return {"message": f"Authenticated via Firebase: {auth_info['user'].email}"}
```

## 📝 API Endpoints

### Public Endpoints (No Auth)
- `GET /` - API information
- `GET /health` - Health check  
- `GET /docs` - API documentation
- `GET /redoc` - Alternative docs

### User Level (Basic Auth)
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `GET /inventory` - View inventory
- `POST /dishes` - Create dishes
- `GET /sales` - View sales data

### Manager Level (Elevated Auth)
- `GET /auth/users` - List all users
- `PUT /auth/users/{id}/role` - Update user roles
- `DELETE /sales/{id}` - Delete sales records
- `POST /inventory/bulk` - Bulk inventory operations

### Admin Level (Full Access)
- `DELETE /auth/users/{id}` - Delete users
- `POST /admin/system-settings` - System configuration
- `GET /admin/audit-logs` - View audit logs

## 🛡️ Security Features

### Rate Limiting
- **Default**: 100 requests per 60 seconds per user
- **AI Endpoints**: 50 requests per 60 seconds (resource intensive)
- **Admin Endpoints**: 500 requests per 60 seconds (higher limit)

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

### Request Validation
- JWT token signature verification
- Token expiration validation
- User role verification
- Rate limit enforcement

## 🔧 Configuration

### Environment Variables
```bash
# Firebase
FIREBASE_PROJECT_ID=menurithm
FIREBASE_CREDENTIALS_PATH=path/to/credentials.json

# Security
VALID_API_KEYS=key1,key2,key3
CORS_ORIGINS=http://localhost:3000,https://app.menurithm.com
RATE_LIMIT_CALLS=100
RATE_LIMIT_PERIOD=60

# Session
SESSION_TIMEOUT=60
REQUIRE_HTTPS=false
```

### Role Assignment
```python
# Assign roles programmatically
user = db.query(User).filter(User.email == "manager@example.com").first()
user.role = UserRole.MANAGER.value
db.commit()
```

## 📊 Monitoring & Logging

### Authentication Events
- User login/logout
- Token refresh
- Permission denied attempts
- Rate limit violations

### Audit Logging
```python
# Automatic logging for sensitive operations
logger.info(f"User {user.email} performed admin operation: {operation}")
```

### Metrics Tracking
- Authentication success/failure rates
- Most accessed endpoints
- User activity patterns
- Security violations

## 🚨 Error Handling

### Authentication Errors
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Insufficient permissions
- `429 Too Many Requests` - Rate limit exceeded

### Error Response Format
```json
{
  "detail": "Authentication failed",
  "error_type": "authentication_error",
  "timestamp": "2025-07-26T10:30:00Z"
}
```

## 🔄 Migration from Basic Auth

### Database Migration
```bash
# Run user enhancement migration
cd backend
python -m alembic upgrade head
```

### Update Existing Routes
1. Replace `get_current_user` imports with enhanced version
2. Add role decorators where needed
3. Update API documentation

### Frontend Updates
1. Handle new user fields (role, is_active, etc.)
2. Implement role-based UI components
3. Add error handling for permission errors

## 🎯 Best Practices

### For Developers
1. **Always use dependencies** - Don't manually verify tokens
2. **Principle of least privilege** - Assign minimal required permissions
3. **Log sensitive operations** - Track important actions
4. **Handle errors gracefully** - Provide meaningful error messages

### For Security
1. **Rotate API keys regularly**
2. **Monitor failed authentication attempts**
3. **Review user permissions periodically**
4. **Keep Firebase credentials secure**

### For Performance
1. **Cache user role checks**
2. **Use appropriate rate limits**
3. **Monitor endpoint performance**
4. **Optimize database queries**

## 📚 Additional Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [FastAPI Security Docs](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

**Next Steps**: Run the database migration, test the authentication flow, and start implementing role-based features in your frontend! 🚀
