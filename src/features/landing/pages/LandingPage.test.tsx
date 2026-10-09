import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LandingPage from './LandingPage';

describe('landing page', () => {
  it('explains the drone and AI offer and presents illustrative AI review', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /clearer asset inspections\s*with drones and AI\./i,
    );
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /one platform for the assets you’re responsible for/i,
      }).textContent,
    ).toMatch(/one platform for the assets/i);

    const image = screen.getByRole('img', {
      name: /illustrative ai-assisted inspection/i,
    });
    expect(image.getAttribute('src')).toBe('/images/landing/ai-defect-review.jpg');

    const aboutSection = document.querySelector('#about');
    expect(aboutSection).not.toBeNull();
    expect(
      within(aboutSection as HTMLElement).getByText(/illustrative ai confidence — not a risk score/i).textContent,
    ).toMatch(/not a risk score/i);
    expect(screen.getAllByRole('link', { name: /get a consultation/i })).toHaveLength(3);
    expect(
      screen.getAllByRole('link', { name: /get a consultation/i }).every(
        (link) => link.getAttribute('href') === '/register',
      ),
    ).toBe(true);
  });
});
