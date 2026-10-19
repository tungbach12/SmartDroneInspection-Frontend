import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_SECTION_VALUES,
  ReportSectionForm,
} from './ReportSectionForm';

afterEach(cleanup);

type FormProps = React.ComponentProps<typeof ReportSectionForm>;

const SECTION_TITLES = [
  'Executive summary',
  'Purpose, scope and criteria',
  'Method, equipment and conditions',
  'Limitations and omissions',
  'Conclusions and recommendations',
];

function renderForm(overrides: Partial<FormProps> = {}) {
  const props: FormProps = {
    sections: EMPTY_SECTION_VALUES,
    onChange: vi.fn(),
    disabled: false,
    saving: false,
    hasChanges: false,
    ...overrides,
  };
  render(<ReportSectionForm {...props} />);
  return props;
}

describe('ReportSectionForm', () => {
  it('renders every authored Report 3 §3.7.2 section the Inspector is accountable for', () => {
    renderForm();
    // Asserted as headings: a section title also labels its field, so a text match alone is ambiguous.
    for (const title of SECTION_TITLES) {
      expect(screen.getByRole('heading', { name: title, level: 2 })).toBeTruthy();
    }
  });

  it('names the accountable human on each section', () => {
    renderForm();
    // Summary, conclusions, and the complete report are approved as one report-level decision.
    expect(screen.getAllByText(/approved with report/).length).toBeGreaterThan(0);
    expect(screen.getByText(/SYSTEM records · Inspector may annotate/)).toBeTruthy();
    expect(screen.getAllByText('Inspector').length).toBeGreaterThan(0);
  });

  it('reports an unsaved-changes state only when there is one', () => {
    const { unmount } = render(
      <ReportSectionForm
        sections={EMPTY_SECTION_VALUES}
        onChange={vi.fn()}
        disabled={false}
        saving={false}
        hasChanges={false}
      />,
    );
    expect(screen.queryByText(/Unsaved section changes/)).toBeNull();
    unmount();

    render(
      <ReportSectionForm
        sections={EMPTY_SECTION_VALUES}
        onChange={vi.fn()}
        disabled={false}
        saving={false}
        hasChanges
      />,
    );
    expect(screen.getByText(/Unsaved section changes/)).toBeTruthy();
  });

  it('clears the overall condition when the selected value is chosen again', () => {
    const onChange = vi.fn();
    render(
      <ReportSectionForm
        sections={{ ...EMPTY_SECTION_VALUES, overallCondition: 'FAIR' }}
        onChange={onChange}
        disabled={false}
        saving={false}
        hasChanges={false}
      />,
    );

    fireEvent.click(screen.getByText('Fair'));

    expect(onChange).toHaveBeenCalledWith('overallCondition', '');
  });

  it('does not edit a section when authoring is not permitted', () => {
    renderForm({ disabled: true });
    expect(
      screen.getByLabelText(/Executive summary/).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('keeps each authored section separate and shows duplicate-free field labels', () => {
    renderForm();
    expect(screen.getByRole('heading', { name: 'Purpose, scope and criteria', level: 2 })).toBeTruthy();
    expect(screen.getByLabelText(/Purpose scope and criteria from inspection records/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Method, equipment and conditions', level: 2 })).toBeTruthy();
    expect(screen.getByLabelText(/Method, equipment and conditions text/)).toBeTruthy();
    expect(screen.queryByText(/^0 \/ 4000$/)).toBeNull();
  });

  it('caps each section so an over-long value cannot be submitted', () => {
    renderForm();
    expect(
      screen.getByLabelText(/Executive summary/).getAttribute('maxlength'),
    ).toBe('4000');
    expect(
      screen.getByLabelText(/Limitations and omissions text/).getAttribute('maxlength'),
    ).toBe('2000');
  });
});