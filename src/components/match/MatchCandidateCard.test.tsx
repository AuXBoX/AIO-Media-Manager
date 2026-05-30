import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchCandidateCard } from './MatchCandidateCard';
import { MatchCandidate } from '@/managers/MetadataManager';

describe('MatchCandidateCard', () => {
  const mockCandidate: MatchCandidate = {
    guid: 'plex://movie/5d776825880197001ec967c9',
    score: 95,
    title: 'The Matrix',
    year: 1999,
    thumb: 'https://example.com/poster.jpg',
    summary: 'A computer hacker learns about the true nature of reality.',
  };

  it('renders candidate information', () => {
    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText(/A computer hacker learns/)).toBeInTheDocument();
  });

  it('displays thumbnail when available', () => {
    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    const img = screen.getByAltText('The Matrix');
    expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('displays placeholder when thumbnail is missing', () => {
    const candidateWithoutThumb = { ...mockCandidate, thumb: undefined };
    
    render(
      <MatchCandidateCard
        candidate={candidateWithoutThumb}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText('🎬')).toBeInTheDocument();
  });

  it('displays confidence score', () => {
    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();
  });

  it('displays best match badge when isBestMatch is true', () => {
    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={true}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText('⭐ Best Match')).toBeInTheDocument();
  });

  it('does not display best match badge when isBestMatch is false', () => {
    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.queryByText('⭐ Best Match')).not.toBeInTheDocument();
  });

  it('calls onSelect when select button is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={onSelect}
        isSelecting={false}
      />
    );

    const selectButton = screen.getByText('Select This Match');
    await user.click(selectButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('disables select button when isSelecting is true', () => {
    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={true}
      />
    );

    const selectButton = screen.getByRole('button', { name: /Applying/i });
    expect(selectButton).toBeDisabled();
  });

  it('displays GUID information', () => {
    render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText(/ID: plex:\/\/movie/)).toBeInTheDocument();
  });

  it('handles candidate without summary', () => {
    const candidateWithoutSummary = { ...mockCandidate, summary: undefined };
    
    render(
      <MatchCandidateCard
        candidate={candidateWithoutSummary}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.queryByText(/A computer hacker/)).not.toBeInTheDocument();
  });

  it('handles candidate without year', () => {
    const candidateWithoutYear = { ...mockCandidate, year: undefined };
    
    render(
      <MatchCandidateCard
        candidate={candidateWithoutYear}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.queryByText('1999')).not.toBeInTheDocument();
  });

  it('applies green color for high confidence (>= 90)', () => {
    const { container } = render(
      <MatchCandidateCard
        candidate={{ ...mockCandidate, score: 95 }}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    const progressBar = container.querySelector('.bg-green-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies yellow color for medium confidence (70-89)', () => {
    const { container } = render(
      <MatchCandidateCard
        candidate={{ ...mockCandidate, score: 75 }}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    const progressBar = container.querySelector('.bg-yellow-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies orange color for low confidence (< 70)', () => {
    const { container } = render(
      <MatchCandidateCard
        candidate={{ ...mockCandidate, score: 50 }}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    const progressBar = container.querySelector('.bg-orange-500');
    expect(progressBar).toBeInTheDocument();
  });

  it('clamps confidence score to 0-100 range', () => {
    render(
      <MatchCandidateCard
        candidate={{ ...mockCandidate, score: 150 }}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('applies best match styling when isBestMatch is true', () => {
    const { container } = render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={true}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    const card = container.firstChild;
    expect(card).toHaveClass('border-primary-500');
  });

  it('applies default styling when isBestMatch is false', () => {
    const { container } = render(
      <MatchCandidateCard
        candidate={mockCandidate}
        isBestMatch={false}
        onSelect={vi.fn()}
        isSelecting={false}
      />
    );

    const card = container.firstChild;
    expect(card).toHaveClass('border-gray-200');
  });
});
