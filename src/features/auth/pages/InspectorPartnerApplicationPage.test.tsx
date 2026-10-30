import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { theme } from '@/app/theme/theme';
import { LocaleProvider } from '@/shared/i18n/LocaleProvider';
import InspectorPartnerApplicationPage from './InspectorPartnerApplicationPage';

describe('Inspector partner application page', () => {
  afterEach(cleanup);

  it('does not offer social registration without configured SSO flows', () => {
    render(
      <ThemeProvider theme={theme}>
        <LocaleProvider>
          <MemoryRouter>
            <InspectorPartnerApplicationPage />
          </MemoryRouter>
        </LocaleProvider>
      </ThemeProvider>,
    );

    expect(screen.queryByText('Or register with')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Google' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Apple' })).toBeNull();
  });
});
