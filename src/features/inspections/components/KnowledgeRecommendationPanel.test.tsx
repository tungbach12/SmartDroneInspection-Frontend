import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeRecommendationResponse } from '../api/inspectionApi';
import { KnowledgeRecommendationPanel } from './KnowledgeRecommendationPanel';

const data: KnowledgeRecommendationResponse = {
  retrievalMode: 'HYBRID_MATCH',
  cases: [
    {
      id: 'case-1',
      defectLabel: 'Deck spall',
      severity: 'HIGH',
      assetCategory: 'BRIDGE',
      assetLabel: 'North span',
      sameAsset: true,
      sameOrganization: false,
      similarity: 0.876,
      technicalNotes: 'Patch with non-shrink mortar after cleaning the exposed rebar.',
      outcome: 'RESOLVED',
      publishedAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'case-2',
      defectLabel: 'Hairline crack',
      severity: 'LOW',
      assetCategory: 'BUILDING',
      assetLabel: 'Warehouse B',
      sameAsset: false,
      sameOrganization: false,
      similarity: 0.61,
      technicalNotes: 'Routed and sealed with epoxy; monitored over two inspection cycles.',
      outcome: 'PUBLISHED',
      publishedAt: '2025-11-01T00:00:00Z',
    },
  ],
  guidelines: [
    {
      id: 'guide-1',
      standardCode: 'TCVN 9343:2012',
      title: 'Repair of concrete defects',
      severity: 'HIGH',
      similarity: 0.74,
      guidance: 'Remove unsound concrete and restore cover with structural repair mortar.',
      referenceUrl: 'https://example.test/tcvn-9343',
    },
  ],
};

afterEach(() => cleanup());

describe('KnowledgeRecommendationPanel', () => {
  it('renders no decorative sparkle icon alongside the compact knowledge rows', () => {
    const { container } = render(<KnowledgeRecommendationPanel data={data} />);
    const sparkle = ['Auto', 'Awesome'].join('');
    expect(screen.getByTestId('knowledge-recommendation-panel')).toBeTruthy();
    expect(container.querySelector(`[data-testid*="${sparkle}"]`)).toBeNull();
  });

  it('renders compact case and guideline rows with crisp chips only', () => {
    render(<KnowledgeRecommendationPanel data={data} />);

    expect(screen.getByTestId('knowledge-recommendation-panel')).toBeTruthy();
    expect(screen.getAllByTestId('knowledge-case-row')).toHaveLength(2);
    expect(screen.getAllByTestId('knowledge-guideline-row')).toHaveLength(1);

    // Similarity, same-building, severity, defect label and outcome are all micro-chips/tight text.
    expect(screen.getByText('88%')).toBeTruthy();
    expect(screen.getByText('Same building')).toBeTruthy();
    expect(screen.getByText('Benchmark')).toBeTruthy();
    expect(screen.getByText('Deck spall')).toBeTruthy();
    expect(screen.getByText('Resolved')).toBeTruthy();
    expect(screen.getByText('TCVN 9343:2012')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open reference' })).toBeTruthy();
    // No Apply action when the caller does not allow it.
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });

  it('offers a one-click Apply action carrying the case technical note', () => {
    const onApplyNote = vi.fn();
    render(<KnowledgeRecommendationPanel data={data} onApplyNote={onApplyNote} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Apply' })[0]!);

    expect(onApplyNote).toHaveBeenCalledTimes(1);
    expect(onApplyNote).toHaveBeenCalledWith(
      'Patch with non-shrink mortar after cleaning the exposed rebar.',
    );
  });

  it('stays invisible when there is nothing to show and shows only a spinner while loading', () => {
    const { container, rerender } = render(
      <KnowledgeRecommendationPanel data={{ retrievalMode: 'HYBRID_MATCH', cases: [], guidelines: [] }} />,
    );
    expect(container.firstChild).toBeNull();

    rerender(<KnowledgeRecommendationPanel data={null} isLoading />);
    expect(screen.getByTestId('knowledge-recommendation-panel')).toBeTruthy();
    expect(screen.queryByTestId('knowledge-case-row')).toBeNull();
  });
});
