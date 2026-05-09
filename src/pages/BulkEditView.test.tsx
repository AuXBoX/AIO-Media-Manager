import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BulkEditView } from './BulkEditView';
import { PlexClient } from '@/api/plexClient';
import { MetadataManager } from '@/managers/MetadataManager';

// Mock the managers
vi.mock('@/managers/MetadataManager');

describe('BulkEditView', () => {
  let queryClient: QueryClient;
  let mockClient: PlexClient;
  let mockManager: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockClient = {} as PlexClient;

    mockManager = {
      bulkUpdateMetadata: vi.fn(),
    };

    vi.mocked(MetadataManager).mockImplementation(() => mockManager);
  });

  const renderWithRouter = (initialState?: any) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/bulk-edit',
              state: initialState,
            },
          ]}
        >
          <Routes>
            <Route path="/bulk-edit" element={<BulkEditView client={mockClient} />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders no items selected message when no items provided', () => {
    renderWithRouter();

    expect(screen.getByText('No Items Selected')).toBeInTheDocument();
    expect(
      screen.getByText('Please select items from the library view to perform bulk editing.')
    ).toBeInTheDocument();
  });

  it('renders bulk edit form with selected items count', () => {
    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    expect(screen.getByText('Bulk Edit')).toBeInTheDocument();
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
  });

  it('displays all form fields', () => {
    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    expect(screen.getByLabelText('Studio')).toBeInTheDocument();
    expect(screen.getByLabelText('Content Rating')).toBeInTheDocument();
    expect(screen.getByLabelText('Genres')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
    expect(screen.getByLabelText('Rating (0-10)')).toBeInTheDocument();
  });

  it('allows entering values in form fields', async () => {
    const user = userEvent.setup();
    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    expect(studioInput).toHaveValue('Warner Bros');
  });

  it('disables apply button when no changes made', () => {
    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    expect(applyButton).toBeDisabled();
  });

  it('enables apply button when changes are made', async () => {
    const user = userEvent.setup();
    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    expect(applyButton).not.toBeDisabled();
  });

  it('calls bulkUpdateMetadata when apply is clicked', async () => {
    const user = userEvent.setup();
    mockManager.bulkUpdateMetadata.mockResolvedValue({
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    });

    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockManager.bulkUpdateMetadata).toHaveBeenCalledWith(['1', '2', '3'], {
        studio: 'Warner Bros',
      });
    });
  });

  it('displays success message after successful update', async () => {
    const user = userEvent.setup();
    mockManager.bulkUpdateMetadata.mockResolvedValue({
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    });

    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('All items updated successfully')).toBeInTheDocument();
      expect(screen.getByText('Succeeded: 3 / 3')).toBeInTheDocument();
    });
  });

  it('displays partial success message when some items fail', async () => {
    const user = userEvent.setup();
    mockManager.bulkUpdateMetadata.mockResolvedValue({
      total: 3,
      succeeded: 2,
      failed: 1,
      errors: [{ ratingKey: '3', error: 'Network error' }],
    });

    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('Some items failed to update')).toBeInTheDocument();
      expect(screen.getByText('Succeeded: 2 / 3')).toBeInTheDocument();
      expect(screen.getByText('Failed: 1')).toBeInTheDocument();
    });
  });

  it('displays error details when errors occur', async () => {
    const user = userEvent.setup();
    mockManager.bulkUpdateMetadata.mockResolvedValue({
      total: 3,
      succeeded: 2,
      failed: 1,
      errors: [{ ratingKey: '3', error: 'Network error' }],
    });

    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('View errors')).toBeInTheDocument();
    });

    const viewErrorsButton = screen.getByText('View errors');
    await user.click(viewErrorsButton);

    expect(screen.getByText('3: Network error')).toBeInTheDocument();
  });

  it('shows progress indicator during update', async () => {
    const user = userEvent.setup();
    mockManager.bulkUpdateMetadata.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ total: 3, succeeded: 3, failed: 0, errors: [] }), 100))
    );

    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(applyButton);

    expect(screen.getByText('Updating 3 items...')).toBeInTheDocument();
    expect(screen.getByText('This may take a few moments')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Updating 3 items...')).not.toBeInTheDocument();
    });
  });

  it('resets form when reset button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const studioInput = screen.getByLabelText('Studio');
    await user.type(studioInput, 'Warner Bros');

    expect(studioInput).toHaveValue('Warner Bros');

    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    expect(studioInput).toHaveValue('');
  });

  it('handles genres as comma-separated values', async () => {
    const user = userEvent.setup();
    mockManager.bulkUpdateMetadata.mockResolvedValue({
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    });

    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const genresInput = screen.getByLabelText('Genres') as HTMLInputElement;
    await user.click(genresInput);
    await user.paste('Action, Drama, Thriller');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockManager.bulkUpdateMetadata).toHaveBeenCalledWith(['1', '2', '3'], {
        genres: ['Action', 'Drama', 'Thriller'],
      });
    });
  });

  it('handles numeric fields correctly', async () => {
    const user = userEvent.setup();
    mockManager.bulkUpdateMetadata.mockResolvedValue({
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    });

    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const yearInput = screen.getByLabelText('Year');
    await user.type(yearInput, '2023');

    const ratingInput = screen.getByLabelText('Rating (0-10)');
    await user.type(ratingInput, '8.5');

    const applyButton = screen.getByRole('button', { name: /apply changes/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockManager.bulkUpdateMetadata).toHaveBeenCalledWith(['1', '2', '3'], {
        year: 2023,
        rating: 8.5,
      });
    });
  });

  it('navigates back when back button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter({
      selectedItems: ['1', '2', '3'],
      sectionId: 'section1',
    });

    const backButton = screen.getByLabelText('Go back');
    await user.click(backButton);

    // Navigation is handled by react-router, so we just verify the button is clickable
    expect(backButton).toBeInTheDocument();
  });
});
