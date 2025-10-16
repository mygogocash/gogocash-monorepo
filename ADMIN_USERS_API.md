# Admin Users API Integration

## API Endpoint
```
GET http://localhost:8080/admin?limit=12&page=1&search=y
```

## Usage Examples

### 1. Using Direct API Client
```typescript
import { apiClient } from '@/lib/api';

// Get admin users with pagination and search
const response = await apiClient.getAdminUsers({
  limit: 12,
  page: 1,
  search: 'y'
});

console.log(response.users); // Array of admin users
console.log(response.pagination); // Pagination info
```

### 2. Using React Hook (Recommended)
```typescript
import { useApi } from '@/hooks/useApi';

function AdminComponent() {
  const { getAdminUsers, loading, error } = useApi();
  
  const fetchUsers = async () => {
    try {
      const response = await getAdminUsers({
        limit: 12,
        page: 1,
        search: 'y'
      });
      
      console.log('Users:', response.users);
      console.log('Pagination:', response.pagination);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };
  
  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      <button onClick={fetchUsers}>Fetch Users</button>
    </div>
  );
}
```

## API Query Parameters

### AdminUsersQuery Interface
```typescript
interface AdminUsersQuery {
  limit?: number;    // Number of users per page (default: 12)
  page?: number;     // Page number (default: 1)
  search?: string;   // Search term for username/email
  role?: string;     // Filter by role
  status?: string;   // Filter by status (active, inactive, suspended)
}
```

### Example Queries
```typescript
// Get first 12 users
await getAdminUsers({ limit: 12, page: 1 });

// Search for users with 'y' in username/email
await getAdminUsers({ search: 'y' });

// Get active users only
await getAdminUsers({ status: 'active' });

// Combine filters
await getAdminUsers({ 
  limit: 10, 
  page: 2, 
  search: 'admin', 
  status: 'active' 
});
```

## Response Format

### AdminUsersResponse
```typescript
interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### AdminUser
```typescript
interface AdminUser {
  _id: string;
  username: string;
  email: string;
  password?: string;        // Usually omitted in responses
  createdAt: string;
  updatedAt: string;
  __v?: number;
  avatar?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
}
```

## Available Admin User Operations

### 1. Get All Admin Users
```typescript
const { getAdminUsers } = useApi();
const response = await getAdminUsers({ limit: 12, page: 1, search: 'y' });
```

### 2. Get Single Admin User
```typescript
const { getAdminUser } = useApi();
const user = await getAdminUser('user_id');
```

### 3. Create Admin User
```typescript
const { createAdminUser } = useApi();
const newUser = await createAdminUser({
  username: 'newadmin',
  email: 'admin@example.com',
  password: 'password123',
  role: 'admin',
  status: 'active'
});
```

### 4. Update Admin User
```typescript
const { updateAdminUser } = useApi();
const updatedUser = await updateAdminUser('user_id', {
  username: 'updatedname',
  status: 'inactive'
});
```

### 5. Delete Admin User
```typescript
const { deleteAdminUser } = useApi();
const result = await deleteAdminUser('user_id');
```

## Error Handling

All API calls return proper error objects:
```typescript
try {
  const response = await getAdminUsers({ search: 'y' });
} catch (error) {
  console.error('Error:', error.message);
  console.error('Status:', error.status);
  if (error.errors) {
    console.error('Field errors:', error.errors);
  }
}
```

## Authentication

All admin user operations require authentication. The API client automatically includes the JWT token from your NextAuth session:

```typescript
// Token is automatically included from session
const { session } = useSession();
const response = await getAdminUsers(); // Token added automatically
```

## Demo Component

A complete demo component is available at:
- Component: `src/components/admin/AdminUsersTable.tsx`
- Page: `src/app/(admin)/(others-pages)/admin-users/page.tsx`

Access it at: `/admin-users`

## Configuration

Ensure your environment variables are set:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXTAUTH_SECRET=your-jwt-secret
NEXTAUTH_URL=http://localhost:3000
```