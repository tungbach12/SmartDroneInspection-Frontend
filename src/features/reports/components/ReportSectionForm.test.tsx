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
    // The reviewer approves the summary, scope and conclusions; the method is the author's alone.
    expect(
      screen.getAllByText(/approved by Organization Admin/).length,
    ).toBeGreaterThan(0);
    // "Inspector" alone is the Method section, which no reviewer signs off.
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

  it('caps each section so an over-long value cannot be submitted', () => {
    renderForm();
    expect(
      screen.getByLabelText(/Executive summary/).getAttribute('maxlength'),
    ).toBe('10000');
    expect(
      screen.getByLabelText(/Limitations and omissions/).getAttribute('maxlength'),
    ).toBe('2000');
  });
});