import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryState } from './QueryState';

describe('QueryState', () => {
  it('announces a loading state', () => {
    render(
      <QueryState isLoading loadingLabel="Loading inspections…">
        <div>Loaded</div>
      </QueryState>,
    );

    expect(screen.getByRole('status').textContent).toContain('Loading inspections…');
    expect(screen.queryByText('Loaded')).toBeNull();
  });

  it('offers retry for an error and invokes the retry action', () => {
    const onRetry = vi.fn();
    render(
      <QueryState isLoading={false} error={new Error('offline')} onRetry={onRetry}>
        <div>Loaded</div>
      </QueryState>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert').textContent).toContain('We could not load this information.');
  });

  it('renders a contextual empty state', () => {
    render(
      <QueryState isLoading={false} isEmpty empty={<div>No assigned inspections</div>}>
        <div>Loaded</div>
      </QueryState>,
    );

    expect(screen.getByText('No assigned inspections')).not.toBeNull();
    expect(screen.queryByText('Loaded')).toBeNull();
  });
});
