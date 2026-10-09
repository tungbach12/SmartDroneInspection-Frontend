import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthHeroSlideshow } from './AuthHeroSlideshow';

describe('AuthHeroSlideshow', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('automatically advances through all three slides and loops', () => {
    vi.useFakeTimers();
    render(<AuthHeroSlideshow />);

    expect(
      screen.getByRole('button', { name: 'Show slide 1 of 3' }).getAttribute('aria-current'),
    ).toBe('true');

    act(() => vi.advanceTimersByTime(5_500));
    expect(
      screen.getByRole('button', { name: 'Show slide 2 of 3' }).getAttribute('aria-current'),
    ).toBe('true');

    act(() => vi.advanceTimersByTime(5_500));
    expect(
      screen.getByRole('button', { name: 'Show slide 3 of 3' }).getAttribute('aria-current'),
    ).toBe('true');

    act(() => vi.advanceTimersByTime(5_500));
    expect(
      screen.getByRole('button', { name: 'Show slide 1 of 3' }).getAttribute('aria-current'),
    ).toBe('true');
  });

  it('allows manual selection and pausing the slideshow', () => {
    vi.useFakeTimers();
    render(<AuthHeroSlideshow />);

    fireEvent.click(screen.getByRole('button', { name: 'Show slide 3 of 3' }));
    expect(
      screen.getByRole('button', { name: 'Show slide 3 of 3' }).getAttribute('aria-current'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Pause background slideshow' }));
    act(() => vi.advanceTimersByTime(11_000));
    expect(
      screen.getByRole('button', { name: 'Show slide 3 of 3' }).getAttribute('aria-current'),
    ).toBe('true');
  });

  it('does not auto-advance when reduced motion is preferred', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    render(<AuthHeroSlideshow />);

    act(() => vi.advanceTimersByTime(11_000));
    expect(
      screen.getByRole('button', { name: 'Show slide 1 of 3' }).getAttribute('aria-current'),
    ).toBe('true');
  });
});
