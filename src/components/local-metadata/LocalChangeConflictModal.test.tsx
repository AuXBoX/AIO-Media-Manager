import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalChangeConflictModal } from './LocalChangeConflictModal';
import { LocalChangeDetection } from '../../managers/LocalMetadataManager';

describe('LocalChangeConflictModal', () => {
  const mockOnClose = vi.fn();
  const mockOnResolve = vi.fn();

  const mockConflicts: LocalChangeDetection = {
    hasLocalChanges: true,
    nfoExists: true,
    nfoModifiedAt: Date.now(),
    plexModifiedAt: Date.now() - 10000,
    conflicts: [
      {
        field: 'title',
        plexValue: 'Plex Title',
        localValue: 'Local Title',
      },
      {
        field: 'year',
        plexValue: 2023,
        localValue: 2024,
      },
      {
        field: 'summary',
        plexValue: 'Plex summary text',
        localValue: 'Local summary text',
      },
    ],
  };

  it('should not render when isOpen is false', () => {
    render(
      <LocalChangeConflictModal
        isOpen={false}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(screen.queryByText('Metadata Conflict Detected')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Metadata Conflict Detected')).toBeInTheDocument();
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('should display conflict information', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(
      screen.getByText(/Local metadata files have been modified more recently/i)
    ).toBeInTheDocument();
  });

  it('should display all conflicts in table', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Plex Title')).toBeInTheDocument();
    expect(screen.getByText('Local Title')).toBeInTheDocument();

    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Plex summary text')).toBeInTheDocument();
    expect(screen.getByText('Local summary text')).toBeInTheDocument();
  });

  it('should show resolution strategy options', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByLabelText(/Keep Plex values/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Keep local values/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Manual selection/i)).toBeInTheDocument();
  });

  it('should call onResolve with plex strategy', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByLabelText(/Keep Plex values/i));
    fireEvent.click(screen.getByText('Resolve Conflicts'));

    expect(mockOnResolve).toHaveBeenCalledWith('plex');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onResolve with local strategy', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByLabelText(/Keep local values/i));
    fireEvent.click(screen.getByText('Resolve Conflicts'));

    expect(mockOnResolve).toHaveBeenCalledWith('local');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show manual selection buttons when manual strategy is selected', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByLabelText(/Manual selection/i));

    // Should show Plex/Local buttons for each conflict
    const plexButtons = screen.getAllByText('Plex');
    const localButtons = screen.getAllByText('Local');

    expect(plexButtons.length).toBeGreaterThan(0);
    expect(localButtons.length).toBeGreaterThan(0);
  });

  it('should call onResolve with manual values', () => {
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    fireEvent.click(screen.getByLabelText(/Manual selection/i));

    // Click "Local" button for the first conflict (title)
    const localButtons = screen.getAllByText('Local');
    fireEvent.click(localButtons[0]);

    fireEvent.click(screen.getByText('Resolve Conflicts'));

    expect(mockOnResolve).toHaveBeenCalledWith('manual', {
      title: 'Local Title',
      year: 2023, // Default to plex
      summary: 'Plex summary text', // Default to plex
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel is clicked', () => {
    const freshMockOnClose = vi.fn();
    const freshMockOnResolve = vi.fn();
    
    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={freshMockOnClose}
        conflicts={mockConflicts}
        itemTitle="Test Movie"
        onResolve={freshMockOnResolve}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(freshMockOnClose).toHaveBeenCalled();
    expect(freshMockOnResolve).not.toHaveBeenCalled();
  });

  it('should display message when no conflicts exist', () => {
    const noConflicts: LocalChangeDetection = {
      hasLocalChanges: true,
      nfoExists: true,
      nfoModifiedAt: Date.now(),
      plexModifiedAt: Date.now() - 10000,
      conflicts: [],
    };

    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={noConflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(
      screen.getByText(/No field conflicts detected/i)
    ).toBeInTheDocument();
  });

  it('should format field names correctly', () => {
    const conflicts: LocalChangeDetection = {
      hasLocalChanges: true,
      nfoExists: true,
      nfoModifiedAt: Date.now(),
      plexModifiedAt: Date.now() - 10000,
      conflicts: [
        {
          field: 'originalTitle',
          plexValue: 'Original Plex',
          localValue: 'Original Local',
        },
      ],
    };

    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={conflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Original Title')).toBeInTheDocument();
  });

  it('should format array values correctly', () => {
    const conflicts: LocalChangeDetection = {
      hasLocalChanges: true,
      nfoExists: true,
      nfoModifiedAt: Date.now(),
      plexModifiedAt: Date.now() - 10000,
      conflicts: [
        {
          field: 'genres',
          plexValue: ['Action', 'Adventure'],
          localValue: ['Drama', 'Thriller'],
        },
      ],
    };

    render(
      <LocalChangeConflictModal
        isOpen={true}
        onClose={mockOnClose}
        conflicts={conflicts}
        itemTitle="Test Movie"
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Action, Adventure')).toBeInTheDocument();
    expect(screen.getByText('Drama, Thriller')).toBeInTheDocument();
  });
});
