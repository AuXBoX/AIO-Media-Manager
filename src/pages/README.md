# Pages

This directory contains page-level components for the AIO Media Manager application.

## AuthenticationPage

The `AuthenticationPage` component orchestrates the complete PIN-based OAuth authentication flow with Plex.

### Features

- **Automatic PIN Generation**: Generates a 4-character PIN on component mount
- **Visual PIN Display**: Shows the PIN in a large, readable format using the `PinDisplay` component
- **Automatic Polling**: Polls PIN status every 2 seconds until authenticated or expired
- **Token Management**: Stores authentication token securely after successful authentication
- **User Info Retrieval**: Fetches and stores user information after authentication
- **Navigation**: Automatically navigates to server selection page after successful authentication
- **Error Handling**: Displays clear error messages with retry options
- **PIN Expiration**: Handles PIN expiration with refresh functionality

### Usage

```tsx
import { AuthenticationPage } from '@/pages/AuthenticationPage';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthenticationPage />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Authentication Flow

1. User navigates to the authentication page
2. Component generates a PIN automatically
3. User visits `app.plex.tv/auth` and enters the PIN
4. Component polls PIN status every 2 seconds
5. When user authenticates, component:
   - Retrieves authentication token
   - Fetches user information
   - Stores token securely
   - Updates app state
   - Navigates to `/servers`

### Dependencies

- `@/components/auth/PinDisplay` - Displays the PIN code
- `@/managers/AuthenticationManager` - Handles authentication logic
- `@/store/appStore` - Global app state management
- `react-router-dom` - Navigation

### Error Scenarios

The component handles several error scenarios:

- **PIN Generation Failure**: Shows error message with "Try Again" button
- **PIN Expiration**: Shows "Refresh PIN" button when PIN expires
- **Authentication Failure**: Continues polling (transient errors) or shows error message
- **User Info Retrieval Failure**: Shows specific error message without navigating

### Testing

Comprehensive test coverage includes:

- PIN generation on mount
- Loading states
- Error states and retry functionality
- Polling behavior (start, interval, stop)
- Successful authentication flow
- PIN expiration handling
- Error handling for various failure scenarios

Run tests:

```bash
npm test -- src/pages/AuthenticationPage.test.tsx
```

### State Management

The component uses:

- **Local State**: PIN data, loading, error, polling status
- **Global State**: User authentication (via `useAppStore`)
- **Navigation**: React Router's `useNavigate` hook

### Performance Considerations

- Polling interval is set to 2 seconds (configurable)
- Polling automatically stops when:
  - Authentication succeeds
  - PIN expires
  - Component unmounts
- Cleanup is handled properly to prevent memory leaks
