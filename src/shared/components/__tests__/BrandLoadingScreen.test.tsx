import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '@/app/theme/theme';
import { BrandLoadingScreen } from '../BrandLoadingScreen';

describe('BrandLoadingScreen', () => {
  it('renders accessible status and SDI optical iris loader', () => {
    render(
      <ThemeProvider theme={theme}>
        <BrandLoadingScreen label="Checking your session" />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('status', { name: 'Checking your session' }),
    ).toBeTruthy();
    expect(screen.getByText('SDI')).toBeTruthy();
    expect(screen.getByText('Checking your session')).toBeTruthy();
  });
});
