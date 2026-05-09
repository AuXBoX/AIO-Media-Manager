# Authentication Components

## PinDisplay

A React component that displays the PIN code for Plex OAuth authentication.

### Features

- Displays 4-character PIN in large, readable format
- Shows expiration countdown timer
- Provides link to Plex authentication page
- Handles expired PINs with refresh button
- Loading and error states
- Fully responsive design
- Dark mode support
- Accessible (WCAG compliant)

### Usage

```tsx
import { useState, useEffect } from 'react';
import { PinDisplay } from '@/components/auth/PinDisplay';
import { authManager } from '@/managers/AuthenticationManager';
import type { PinResponse } from '@/managers/AuthenticationManager';

function AuthenticationPage() {
  const [pin, setPin] = useState<PinResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newPin = await authManager.generatePin();
      setPin(newPin);
    } catch (err) {
      setError('Failed to generate PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePin();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <PinDisplay
        pin={pin}
        loading={loading}
        error={error}
        onRefresh={generatePin}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pin` | `PinResponse \| null` | Yes | PIN data from AuthenticationManager |
| `loading` | `boolean` | No | Shows loading spinner when true |
| `error` | `string \| null` | No | Error message to display |
| `onRefresh` | `() => void` | No | Callback when refresh button is clicked |

### PinResponse Type

```typescript
interface PinResponse {
  id: number;
  code: string;
  expiresAt: string; // ISO 8601 date string
}
```

### States

#### Loading State
Displays when `loading={true}`:
- Animated spinner
- "Generating PIN..." message

#### Error State
Displays when `error` prop is provided:
- Error icon
- Error message
- "Try Again" button (if `onRefresh` provided)

#### No PIN State
Displays when `pin={null}` and not loading:
- "No PIN available" message
- "Generate PIN" button (if `onRefresh` provided)

#### Active PIN State
Displays when valid PIN is provided:
- 4-character PIN in separate boxes
- Instructions with link to app.plex.tv/auth
- Countdown timer showing time remaining
- Additional instructions

#### Expired PIN State
Displays when PIN has expired:
- Grayed-out PIN boxes
- "PIN Expired" message
- "Refresh PIN" button (if `onRefresh` provided)

### Styling

The component uses Tailwind CSS with dark mode support. All styles are responsive and adapt to different screen sizes.

### Accessibility

- Proper heading structure
- Accessible links with `rel="noopener noreferrer"`
- Accessible buttons with descriptive labels
- Color contrast meets WCAG AA standards
- Keyboard navigable

### Testing

Comprehensive unit tests are provided in `PinDisplay.test.tsx` covering:
- All component states
- User interactions
- Timer functionality
- Accessibility
- Edge cases
