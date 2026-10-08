import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DarkRoleConsole } from './DarkRoleConsole';

describe('landing role console', () => {
  it('shows only the four canonical roles without provider-workspace links', () => {
    render(<DarkRoleConsole />);

    for (const role of ['ADMIN', 'ORG_ADMIN', 'INSPECTOR', 'MAINTENANCE_ENGINEER']) {
      expect(screen.getByText(role)).toBeTruthy();
    }

    expect(screen.queryByText(/service manager|provider/i)).toBeNull();
    expect(
      screen.getAllByRole('link').some((link) =>
        link.getAttribute('href')?.includes('smartdroneinspection-provider'),
      ),
    ).toBe(false);
  });
});
