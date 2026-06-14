# API Integration Guide

## Overview
This project includes a comprehensive API integration system with NextAuth.js for authentication and a custom API client for making requests to your backend.

## API Configuration

### Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://api.gogocash.co
NEXTAUTH_SECRET=your-jwt-secret
NEXTAUTH_URL=http://localhost:3000
```

## API Client Usage

### 1. Direct API Client
```typescript
import { apiClient } from '@/lib/api';

// Login
const loginData = await apiClient.login({
  email: 'user@example.com',
  password: 'password'
});

// Register
const registerData = await apiClient.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password',
  password_confirmation: 'password'
});

// Make authenticated requests
const profile = await apiClient.getProfile(token);
```

### 2. React Hooks (Recommended)
```typescript
import { useAuth, useApi } from '@/hooks/useApi';

function MyComponent() {
  const { session, loading, error, register } = useAuth();
  const { get, post, put, delete: del, getProfile } = useApi();

  // Register new user
  const handleRegister = async () => {
    try {
      await register({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password',
        password_confirmation: 'password'
      });
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  // Get user profile
  const handleGetProfile = async () => {
    try {
      const profile = await getProfile();
      console.log(profile);
    } catch (error) {
      console.error('Failed to get profile:', error);
    }
  };

  // Make API requests
  const handleApiCall = async () => {
    try {
      const data = await get('/some-endpoint');
      const result = await post('/another-endpoint', { key: 'value' });
    } catch (error) {
      console.error('API call failed:', error);
    }
  };
}
```

## Available API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `POST /auth/refresh` - Refresh token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### User Management
- `PUT /user/profile` - Update user profile
- `POST /user/change-password` - Change user password

### Generic Methods
- `GET /endpoint` - Get data
- `POST /endpoint` - Create data
- `PUT /endpoint` - Update data
- `DELETE /endpoint` - Delete data

## Error Handling

All API calls return proper error objects with:
```typescript
interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}
```

### Using with React Hooks
```typescript
const { loading, error, clearError } = useApi();

// Display error
{error && (
  <div className="error-message">
    {error}
    <button onClick={clearError}>Clear</button>
  </div>
)}

// Show loading state
{loading && <div>Loading...</div>}
```

## NextAuth Integration

The API client is fully integrated with NextAuth.js:

1. **Authentication**: Login credentials are sent to your API
2. **Session Management**: User data and tokens are stored in NextAuth session
3. **Automatic Token Handling**: API requests automatically include authentication tokens
4. **Protected Routes**: Use `AuthGuard` component to protect pages

### Protected Route Example
```typescript
import AuthGuard from '@/components/auth/AuthGuard';

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <div>This content is only visible to authenticated users</div>
    </AuthGuard>
  );
}
```

## API Response Format

Your API should return responses in these formats:

### Login Response
```json
{
  "id": "user_id",
  "name": "User Name",
  "email": "user@example.com",
  "avatar": "avatar_url",
  "token": "jwt_token"
}
```

### Error Response
```json
{
  "message": "Error message",
  "errors": {
    "field": ["Field specific error"]
  }
}
```

## Security Features

1. **JWT Tokens**: Secure token-based authentication
2. **Automatic Token Refresh**: Built-in token refresh mechanism
3. **Request Interceptors**: Automatic authentication headers
4. **Error Handling**: Comprehensive error handling with user-friendly messages
5. **Type Safety**: Full TypeScript support for all API operations

## Testing API Integration

Use the `ApiExample` component to test your API integration:

```typescript
import ApiExample from '@/components/example/ApiExample';

// Add to any page to test API functionality
<ApiExample />
```

This provides buttons to test:
- GET Profile
- Generic GET requests
- Generic POST requests
- Error handling
- Loading states