import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GlassAiFindingsIcon,
  GlassAirspaceIcon,
  GlassAssetIcon,
  GlassBellIcon,
  GlassCatalogIcon,
  GlassChartsIcon,
  GlassChatIcon,
  GlassChecklistIcon,
  GlassContractIcon,
  GlassDashboardIcon,
  GlassDroneIcon,
  GlassIconBadge,
  GlassIconGradientDefs,
  GlassInspectionIcon,
  GlassPaymentIcon,
  GlassPermitIcon,
  GlassReportIcon,
  GlassScheduleIcon,
  GlassSecurityIcon,
  GlassSettingsIcon,
  GlassUserIcon,
  GlassUsersIcon,
  GlassWarningIcon,
} from './GradientGlassIcons';

describe('GradientGlassIcons (Style 5)', () => {
  afterEach(() => cleanup());

  it('renders all domain gradient glass SVG icons with unique linearGradient IDs', () => {
    const { container } = render(
      <div>
        <GlassIconGradientDefs />
        <GlassIconBadge tone="blue">
          <GlassDashboardIcon />
        </GlassIconBadge>
        <GlassDroneIcon />
        <GlassPermitIcon />
        <GlassInspectionIcon />
        <GlassAiFindingsIcon />
        <GlassReportIcon />
        <GlassPaymentIcon />
        <GlassWarningIcon />
        <GlassAirspaceIcon />
        <GlassAssetIcon />
        <GlassContractIcon />
        <GlassScheduleIcon />
        <GlassChatIcon />
        <GlassBellIcon />
        <GlassUserIcon />
        <GlassUsersIcon />
        <GlassSecurityIcon />
        <GlassSettingsIcon />
        <GlassChartsIcon />
        <GlassChecklistIcon />
        <GlassCatalogIcon />
      </div>,
    );

    const glassSvgs = container.querySelectorAll('svg[data-glass-icon="true"]');
    expect(glassSvgs.length).toBe(21);

    const gradIds = Array.from(container.querySelectorAll('linearGradient[id^="sdi-glass-"]')).map(
      (node) => node.getAttribute('id'),
    );
    expect(gradIds.length).toBeGreaterThanOrEqual(21);
    expect(new Set(gradIds).size).toBe(gradIds.length);
  });

  it('renders global MUI gradient definitions', () => {
    render(<GlassIconGradientDefs />);
    expect(document.getElementById('sdi-glass-blue')).toBeTruthy();
    expect(document.getElementById('sdi-glass-cyan')).toBeTruthy();
    expect(document.getElementById('sdi-glass-emerald')).toBeTruthy();
    expect(document.getElementById('sdi-glass-amber')).toBeTruthy();
    expect(document.getElementById('sdi-glass-indigo')).toBeTruthy();
    expect(document.getElementById('sdi-glass-rose')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
