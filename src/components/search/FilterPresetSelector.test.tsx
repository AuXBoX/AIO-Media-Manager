import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPresetSelector } from './FilterPresetSelector';
import { FilterPreset } from '../../managers/SearchManager';

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('FilterPresetSelector', () => {
  const mockPresets: FilterPreset[] = [
    {
      id: 'preset-1',
      name: 'Action Movies',
      criteria: {
        sectionId: '1',
        type: 'movie',
        filters: { genre: 'action' },
      },
      createdAt: 1609459200000,
    },
    {
      id: 'preset-2',
      name: 'Recent Albums',
      criteria: {
        sectionId: '2',
        type: 'album',
        filters: { 'addedAt>=': '-30d', year: 2020 },
      },
      createdAt: 1609459300000,
    },
  ];

  const defaultProps = {
    presets: mockPresets,
    onSelectPreset: vi.fn(),
    onDeletePreset: vi.fn(),
  };

  beforeEach(() => {
    mockConfirm.mockClear();
  });

  it('should not render when no presets', () => {
    const { container } = render(<FilterPresetSelector {...defaultProps} presets={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('should render preset selector button', () => {
    render(<FilterPresetSelector {...defaultProps} />);

    expect(screen.getByText('Filter Presets')).toBeInTheDocument();
  });

  it('should open dropdown when button clicked', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    expect(screen.getByText('Action Movies')).toBeInTheDocument();
    expect(screen.getByText('Recent Albums')).toBeInTheDocument();
  });

  it('should close dropdown when backdrop clicked', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    expect(screen.getByText('Action Movies')).toBeInTheDocument();

    // Click backdrop (the fixed inset div)
    const backdrop = document.querySelector('.fixed.inset-0');
    await userEvent.click(backdrop!);

    expect(screen.queryByText('Action Movies')).not.toBeInTheDocument();
  });

  it('should display preset names', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    expect(screen.getByText('Action Movies')).toBeInTheDocument();
    expect(screen.getByText('Recent Albums')).toBeInTheDocument();
  });

  it('should display filter counts', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    expect(screen.getByText(/1 filter/)).toBeInTheDocument();
    expect(screen.getByText(/2 filters/)).toBeInTheDocument();
  });

  it('should display creation dates', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const date1 = new Date(1609459200000).toLocaleDateString();
    const date2 = new Date(1609459300000).toLocaleDateString();

    expect(screen.getAllByText(new RegExp(date1))[0]).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(date2))[0]).toBeInTheDocument();
  });

  it('should call onSelectPreset when preset clicked', async () => {
    const onSelectPreset = vi.fn();
    render(<FilterPresetSelector {...defaultProps} onSelectPreset={onSelectPreset} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const preset = screen.getByText('Action Movies');
    await userEvent.click(preset);

    expect(onSelectPreset).toHaveBeenCalledWith(mockPresets[0]);
  });

  it('should close dropdown after selecting preset', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const preset = screen.getByText('Action Movies');
    await userEvent.click(preset);

    expect(screen.queryByText('Recent Albums')).not.toBeInTheDocument();
  });

  it('should show selected preset name in button', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const preset = screen.getByText('Action Movies');
    await userEvent.click(preset);

    expect(screen.getByText('Action Movies')).toBeInTheDocument();
  });

  it('should show checkmark for selected preset', async () => {
    const { container } = render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const preset = screen.getByText('Action Movies');
    await userEvent.click(preset);

    // Reopen dropdown
    await userEvent.click(button);

    // Check for checkmark SVG
    const checkmark = container.querySelector('svg[fill="currentColor"]');
    expect(checkmark).toBeInTheDocument();
  });

  it('should show delete button for each preset', async () => {
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const deleteButtons = screen.getAllByLabelText('Delete preset');
    expect(deleteButtons).toHaveLength(2);
  });

  it('should show confirmation dialog when delete clicked', async () => {
    mockConfirm.mockReturnValue(false);
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const deleteButtons = screen.getAllByLabelText('Delete preset');
    await userEvent.click(deleteButtons[0]!);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this preset?');
  });

  it('should call onDeletePreset when confirmed', async () => {
    mockConfirm.mockReturnValue(true);
    const onDeletePreset = vi.fn();
    render(<FilterPresetSelector {...defaultProps} onDeletePreset={onDeletePreset} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const deleteButtons = screen.getAllByLabelText('Delete preset');
    await userEvent.click(deleteButtons[0]!);

    expect(onDeletePreset).toHaveBeenCalledWith('preset-1');
  });

  it('should not call onDeletePreset when cancelled', async () => {
    mockConfirm.mockReturnValue(false);
    const onDeletePreset = vi.fn();
    render(<FilterPresetSelector {...defaultProps} onDeletePreset={onDeletePreset} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const deleteButtons = screen.getAllByLabelText('Delete preset');
    await userEvent.click(deleteButtons[0]!);

    expect(onDeletePreset).not.toHaveBeenCalled();
  });

  it('should clear selection when selected preset is deleted', async () => {
    mockConfirm.mockReturnValue(true);
    render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    // Select preset
    const preset = screen.getByText('Action Movies');
    await userEvent.click(preset);

    // Reopen and delete
    await userEvent.click(button);
    const deleteButtons = screen.getAllByLabelText('Delete preset');
    await userEvent.click(deleteButtons[0]!);

    // Button should show default text
    expect(screen.getByText('Filter Presets')).toBeInTheDocument();
  });

  it('should disable button when loading', () => {
    render(<FilterPresetSelector {...defaultProps} isLoading={true} />);

    const button = screen.getByRole('button', { name: /Filter Presets/i });
    expect(button).toBeDisabled();
  });

  it('should rotate arrow icon when opened', async () => {
    const { container } = render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    
    let arrow = container.querySelectorAll('svg')[1]; // Second SVG is the arrow
    expect(arrow).not.toHaveClass('rotate-180');

    await userEvent.click(button);
    
    arrow = container.querySelectorAll('svg')[1];
    expect(arrow).toHaveClass('rotate-180');
  });

  it('should highlight selected preset', async () => {
    const { container } = render(<FilterPresetSelector {...defaultProps} />);

    const button = screen.getByText('Filter Presets');
    await userEvent.click(button);

    const preset = screen.getByText('Action Movies');
    await userEvent.click(preset);

    // Reopen dropdown
    await userEvent.click(button);

    // Check for highlight class on the container div
    const presetContainer = container.querySelector('div.bg-primary-50');
    expect(presetContainer).not.toBeNull();
  });
});
