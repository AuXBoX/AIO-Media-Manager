import { describe, it, expect } from 'vitest';
import { render, screen } from '../tests/utils/test-utils';
import App from './App';

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('AIO Media Manager')).toBeInTheDocument();
  });

  it('renders the app description', () => {
    render(<App />);
    expect(
      screen.getByText(/View and edit metadata for movies, TV shows, and music/)
    ).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(<App />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });
});
