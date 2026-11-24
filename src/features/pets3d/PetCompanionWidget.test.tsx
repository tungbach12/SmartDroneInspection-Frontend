import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorModeContext } from '@/app/layouts/ColorModeContext';
import { theme } from '@/app/theme/theme';
import PetCompanionWidget from './PetCompanionWidget';

describe('PetCompanionWidget', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('supports dragging the pet cleanly without floating overlay buttons or tooltip bars', () => {
    render(
      <ThemeProvider theme={theme} defaultMode="light" modeStorageKey="sdi-mode">
        <ColorModeContext.Provider value={{ mode: 'light', toggle: vi.fn() }}>
          <PetCompanionWidget petId="drone-buddy" />
        </ColorModeContext.Provider>
      </ThemeProvider>,
    );

    const widget = screen.getByTestId('pet-companion-widget');
    const stage = screen.getByRole('button', { name: /Drone Buddy/i });

    expect(screen.queryByTestId('pet-companion-close')).toBeNull();

    fireEvent.pointerDown(stage, { button: 0, pointerId: 1, clientX: 900, clientY: 700 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 780, clientY: 620 });
    fireEvent.pointerUp(stage, { pointerId: 1, clientX: 780, clientY: 620 });

    expect(widget.style.transform).toContain('translate3d(-120px, -80px, 0)');
    expect(window.localStorage.getItem('sdi_pet_widget_pos_v1:guest')).toContain('-120');
  });
});
