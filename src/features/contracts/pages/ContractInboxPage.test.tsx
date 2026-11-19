import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import ContractInboxPage from './ContractInboxPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import * as contractsHook from '../hooks/useContracts';

vi.mock('../hooks/useContracts');

function renderInbox(initialEntries = ['/manager/messages']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ContractInboxPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ContractInboxPage', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['MANAGER'],
      user: {
        id: 'mgr-1',
        email: 'manager@test.local',
        fullName: 'Test Manager',
        roles: ['MANAGER'],
      } as any,
      userId: 'mgr-1',
      userName: 'Test Manager',
      email: 'manager@test.local',
    });
  });

  it('filters conversations by search and unread tab, and sends a message', () => {
    const postMutate = vi.fn().mockResolvedValue({});
    const markReadMutate = vi.fn();

    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-1',
          ownerCustomerId: 'cust-1',
          assetId: 'asset-1',
          description: 'Bridge inspection A',
          requestedFrom: '2026-12-10',
          requestedUntil: '2026-12-10',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'OPEN',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-11-14T01:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [
            {
              id: 'msg-1',
              authorUserId: 'cust-1',
              authorName: 'Customer Alpha',
              authorRole: 'CUSTOMER',
              body: 'Can we schedule morning flight?',
              createdAt: '2026-11-14T02:00:00Z',
              readAt: null,
            },
          ],
        },
        {
          id: 'req-2',
          ownerCustomerId: 'cust-2',
          assetId: 'asset-2',
          description: 'Tower inspection B',
          requestedFrom: '2026-12-15',
          requestedUntil: '2026-12-15',
          timezone: 'Asia/Ho_Chi_Minh',
          windowStart: '08:00',
          windowEnd: '17:00',
          requestType: 'ONE_TIME',
          recurrenceUnit: null,
          recurrenceInterval: null,
          occurrenceCount: null,
          recurrenceEndDate: null,
          status: 'QUOTED',
          acceptedQuoteId: null,
          acceptedAt: null,
          acceptedByUserId: null,
          acceptedTermsSnapshot: null,
          contractFileName: null,
          contractContentType: null,
          contractSizeBytes: null,
          contractUploadedAt: null,
          createdAt: '2026-11-14T01:00:00Z',
          currentQuote: null,
          occurrences: [],
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(contractsHook, 'usePostRequestMessage').mockReturnValue({
      mutateAsync: postMutate,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useMarkMessagesRead').mockReturnValue({
      mutate: markReadMutate,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useInspectionChatThreads').mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'usePostInspectionMessage').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useMarkInspectionMessagesRead').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    renderInbox();

    expect(screen.getByText('Bridge inspection A')).toBeTruthy();
    expect(screen.getByText('Tower inspection B')).toBeTruthy();
    expect(screen.getAllByText('Can we schedule morning flight?').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Unread/ }));
    expect(screen.getByText('Bridge inspection A')).toBeTruthy();
    expect(screen.queryByText('Tower inspection B')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'Tower' } });
    expect(screen.queryByText('Bridge inspection A')).toBeNull();
    expect(screen.getByText('Tower inspection B')).toBeTruthy();

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Confirmed for 08:00.' } });
    expect(screen.getByText('20/4000')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(postMutate).toHaveBeenCalledWith({ body: 'Confirmed for 08:00.', files: [] });
  });
});
