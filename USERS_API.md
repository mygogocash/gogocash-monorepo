# Users API Integration

## API Endpoint
```bash
curl -X 'GET' \
  'http://localhost:8080/user?limit=12&page=1&search=y' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Usage Examples

### 1. Using Direct API Client
```typescript
import { apiClient } from '@/lib/api';

// Get users with pagination and search
const response = await apiClient.getUsers({
  limit: 12,
  page: 1,
  search: 'y'
}, token);

console.log(response.data); // Array of users
console.log(response.pagination); // Pagination info
```

### 2. Using React Hook (Recommended)
```typescript
import { useApi } from '@/hooks/useApi';

function UserComponent() {
  const { getUsers, loading, error } = useApi();
  
  const fetchUsers = async () => {
    try {
      const response = await getUsers({
        limit: 12,
        page: 1,
        search: 'y'
      });
      
      console.log('Users:', response.data);
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

### UsersQuery Interface
```typescript
interface UsersQuery {
  limit?: number;        // Number of users per page (default: 12)
  page?: number;         // Page number (default: 1)
  search?: string;       // Search term for username/email
  role?: string;         // Filter by role
  status?: string;       // Filter by status
  sort?: string;         // "newest" | "name" | "tier" | "membership" (see lib/userSort)
  tier?: string;         // Credit tier id: "bronze" | "silver" | "gold" | "platinum"
  membership?: string;   // Membership tier name, e.g. "Basic" | "GoGoPass Plus"
  subscription?: string; // "monthly" | "annual" | "none" (see lib/userFilter)
}
```

### Example Queries
```typescript
// Get first 12 users
await getUsers({ limit: 12, page: 1 });

// Search for users with 'y' in username/email
await getUsers({ search: 'y' });

// Get active users only
await getUsers({ status: 'active' });

// Combine filters
await getUsers({ 
  limit: 10, 
  page: 2, 
  search: 'user', 
  status: 'active' 
});
```

## Response Format

### UsersResponse
```typescript
interface UsersResponse {
  data: RegularUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### RegularUser
```typescript
interface RegularUser {
  _id: string;
  address: string;
  __v: number;
  email: string;
  id_crossmint: string;
  id_twitter: string;
  username: string;
  mobile?: string;
  id_firebase: string;
  createdAt: Date;
  updatedAt: Date;
  birthdate: Date | null;
  country: string | null;
  gender: string | null;
  membershipTier?: string;   // e.g. "Basic", "GoGoPass Plus"
  subscriptionPlan?: string; // e.g. "Monthly Premium"; absent if not subscribed
  creditScore?: number;      // 0–1000; drives the credit tier
}
```

## Available User Operations

### 1. Get All Users
```typescript
const { getUsers } = useApi();
const response = await getUsers({ limit: 12, page: 1, search: 'y' });
```

### 2. Get Single User
```typescript
const { getUser } = useApi();
const user = await getUser('user_id');
```

### 3. Create User
```typescript
const { createUser } = useApi();
const newUser = await createUser({
  username: 'newuser',
  email: 'user@example.com',
  address: '0x...',
  id_crossmint: '',
  id_twitter: '',
  id_firebase: '',
  birthdate: null,
  country: null,
  gender: null,
});
```

### 4. Update User
```typescript
const { updateUser } = useApi();
const updatedUser = await updateUser('user_id', {
  username: 'updatedname',
  country: 'TH'
});
```

### 5. Delete User
```typescript
const { deleteUser } = useApi();
const result = await deleteUser('user_id');
```

## Authentication

All user operations require authentication. The API client automatically includes the JWT token from your NextAuth session:

```typescript
// Token is automatically included from session
const { session } = useSession();
const response = await getUsers(); // Token added automatically
```

## Example cURL Request
```bash
curl -X 'GET' \
  'http://localhost:8080/user?limit=12&page=1&search=y' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer ***REMOVED***'
```

## Demo Component

A complete demo component is available at:
- Component: `src/components/user/UsersTable.tsx`
- Page: `src/app/(admin)/(others-pages)/users/page.tsx`

Access it at: `/users`

## Error Handling

All API calls return proper error objects:
```typescript
try {
  const response = await getUsers({ search: 'y' });
} catch (error) {
  console.error('Error:', error.message);
  console.error('Status:', error.status);
  if (error.errors) {
    console.error('Field errors:', error.errors);
  }
}
```

## Configuration

Ensure your environment variables are set:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXTAUTH_SECRET=your-jwt-secret
NEXTAUTH_URL=http://localhost:3000
```

## Comparison with Admin Users API

| Feature | Users API (`/user`) | Admin Users API (`/admin`) |
|---------|-------------------|---------------------------|
| Endpoint | `http://localhost:8080/user` | `http://localhost:8080/admin` |
| Target Users | Regular users | Admin users only |
| Fields | Includes firstName, lastName, phone | Basic admin fields |
| Response Format | `{ data: [], pagination: {} }` | `{ users: [], pagination: {} }` |
| Authentication | Required (Bearer token) | Required (Bearer token) |

## Features

- 🔍 **Search functionality** - Search by username/email
- 📄 **Pagination** - Navigate through user pages
- 🗑️ **Delete users** - With confirmation dialog
- ✏️ **Edit users** - Button ready for implementation
- 🔄 **Auto-refresh** - Updates after operations
- ⚡ **Loading states** - User feedback during API calls
- 🚨 **Error handling** - Display API errors
- 🎨 **Responsive UI** - Works on all devices
- 🖼️ **Avatar support** - Display user avatars
- 🌙 **Dark mode** - Full theme support