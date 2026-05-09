import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionErrorPage } from './ConnectionErrorPage';

describe('ConnectionErrorPage', () => {
  let onlineGetter: any;
  let addEventListenerSpy: any;
  let removeEventListenerSpy: any;

  beforeEach(() => {
    // Mock navigator.onLine
    onlineGetter = vi.spyOn(window.navigator, 'onLine', 'get');
    onlineGetter.mockReturnValue(true);

    // Spy on event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders connection error message', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    expect(screen.getByText('Cannot Connect to Server')).toBeInTheDocument();
  });

  it('shows server name when provided', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} serverName="My Plex Server" />);
    expect(screen.getByText(/My Plex Server/)).toBeInTheDocument();
  });

  it('shows offline message when isOffline is true', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} isOffline />);
    expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
  });

  it('shows offline message when navigator.onLine is false', () => {
    onlineGetter.mockReturnValue(false);
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    expect(screen.getByText('No Internet Connection')).toBeInTheDocument();
  });

  it('displays connection status', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    expect(screen.getByText('Internet Connection')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('displays server status when server name provided', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} serverName="Test Server" />);
    expect(screen.getByText('Plex Server')).toBeInTheDocument();
    expect(screen.getByText('Unreachable')).toBeInTheDocument();
  });

  it('shows retry button', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const onRetry = vi.fn();
    render(<ConnectionErrorPage onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    retryButton.click();
    
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalled();
    });
  });

  it('shows reload button when offline', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} isOffline />);
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('does not show reload button when online', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /reload page/i })).not.toBeInTheDocument();
  });

  it('shows troubleshooting tips', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    expect(screen.getByText('Troubleshooting Tips')).toBeInTheDocument();
  });

  it('shows offline mode notice when offline', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} isOffline />);
    expect(screen.getByText('Offline Mode Available')).toBeInTheDocument();
  });

  it('does not show offline mode notice when online', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    expect(screen.queryByText('Offline Mode Available')).not.toBeInTheDocument();
  });

  it('registers online/offline event listeners', () => {
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(<ConnectionErrorPage onRetry={vi.fn()} />);
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('updates connection status when online event fires', async () => {
    onlineGetter.mockReturnValue(false);
    render(<ConnectionErrorPage onRetry={vi.fn()} />);
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    
    // Simulate going online
    onlineGetter.mockReturnValue(true);
    const onlineHandler = addEventListenerSpy.mock.calls.find(
      (call: any) => call[0] === 'online'
    )?.[1];
    onlineHandler?.();
    
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });
});
