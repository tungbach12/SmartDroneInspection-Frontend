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
    vi.spyOn(contractsHook, 'usePartnerChatThreads').mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'usePostPartnerMessage').mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useMarkPartnerMessagesRead').mockReturnValue({
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

  it('lets an Inspector switch between Customer and Manager channels and send a partner message', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['INSPECTOR'],
      user: {
        id: 'insp-1',
        email: 'inspector@test.local',
        fullName: 'Le Inspector',
        roles: ['INSPECTOR'],
      } as any,
      userId: 'insp-1',
      userName: 'Le Inspector',
      email: 'inspector@test.local',
    });

    const postPartnerMutate = vi.fn().mockResolvedValue({});
    const markPartnerReadMutate = vi.fn();

    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'usePostRequestMessage').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useMarkMessagesRead').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useInspectionChatThreads').mockReturnValue({
      data: [
        {
          inspectionId: 'insp-exec-1',
          assetId: 'asset-1',
          assetName: 'Can Tho Bridge',
          status: 'SCHEDULED',
          assignmentStatus: 'ACCEPTED',
          plannedStartAt: '2026-12-26T01:00:00Z',
          plannedEndAt: '2026-12-26T03:00:00Z',
          counterpartUserId: 'cust-1',
          counterpartName: 'Saigon Customer',
          counterpartRole: 'CUSTOMER',
          counterpartAvatarUrl: 'data:image/jpeg;base64,CUSTAVATAR',
          messages: [],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'usePostInspectionMessage').mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useMarkInspectionMessagesRead').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'usePartnerChatThreads').mockReturnValue({
      data: [
        {
          requestId: 'req-1',
          inspectorId: 'insp-1',
          managerId: 'mgr-1',
          ownerCustomerId: 'cust-1',
          customerName: 'Saigon Customer',
          assetId: 'asset-1',
          assetName: 'Can Tho Bridge',
          assetCode: 'CTB-01',
          requestDescription: 'Bridge thermal survey',
          requestStatus: 'ASSIGNED',
          counterpartUserId: 'mgr-1',
          counterpartName: 'Tran Manager',
          counterpartRole: 'MANAGER',
          counterpartAvatarUrl: 'data:image/jpeg;base64,MGRAVATAR',
          occurrenceCount: 1,
          nextPlannedStartAt: '2026-12-26T01:00:00Z',
          nextPlannedEndAt: '2026-12-26T03:00:00Z',
          messages: [
            {
              id: 'pm-1',
              requestId: 'req-1',
              inspectorId: 'insp-1',
              authorUserId: 'mgr-1',
              authorName: 'Tran Manager',
              authorRole: 'MANAGER',
              body: 'Please verify permit before takeoff.',
              readAt: null,
              createdAt: '2026-11-23T08:00:00Z',
              attachments: [],
            },
          ],
        },
      ],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'usePostPartnerMessage').mockReturnValue({
      mutateAsync: postPartnerMutate,
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useMarkPartnerMessagesRead').mockReturnValue({
      mutate: markPartnerReadMutate,
      isPending: false,
    } as any);

    renderInbox(['/operations/messages']);

    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 1, name: 'Messages' })).toBeNull();
    expect(screen.getAllByText(/Scheduled/).length).toBeGreaterThan(0);
    const customerAvatars = document.querySelectorAll('img[src="data:image/jpeg;base64,CUSTAVATAR"]');
    expect(customerAvatars.length).toBe(2);

    expect(screen.getAllByText('Saigon Customer').length).toBeGreaterThan(0);
    const managerTab = screen.getByRole('button', { name: /Manager/ });
    fireEvent.click(managerTab);

    const managerAvatars = document.querySelectorAll('img[src="data:image/jpeg;base64,MGRAVATAR"]');
    expect(managerAvatars.length).toBe(2);
    expect(screen.getAllByText('Tran Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Please verify permit before takeoff.').length).toBeGreaterThan(0);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Permit verified and ready.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(postPartnerMutate).toHaveBeenCalledWith({
      body: 'Permit verified and ready.',
      files: [],
    });
  });

  it('renders the assigned service manager avatar for Customer request threads', () => {
    useAuthStore.setState({
      status: 'authenticated',
      roles: ['CUSTOMER'],
      user: {
        id: 'cust-1',
        email: 'customer@test.local',
        fullName: 'Saigon Customer',
        roles: ['CUSTOMER'],
      } as any,
      userId: 'cust-1',
      userName: 'Saigon Customer',
      email: 'customer@test.local',
    });

    vi.spyOn(contractsHook, 'useServiceRequests').mockReturnValue({
      data: [
        {
          id: 'req-cust-1',
          ownerCustomerId: 'cust-1',
          assetId: 'asset-1',
          description: 'Solar farm survey',
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
          serviceManager: {
            id: 'mgr-1',
            fullName: 'Primary Manager',
            avatarUrl: 'data:image/jpeg;base64,SVCMGRAVATAR',
          },
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
      mutateAsync: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useMarkMessagesRead').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.spyOn(contractsHook, 'useInspectionChatThreads').mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    vi.spyOn(contractsHook, 'usePartnerChatThreads').mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderInbox(['/client/messages']);

    const svcManagerAvatars = document.querySelectorAll(
      'img[src="data:image/jpeg;base64,SVCMGRAVATAR"]',
    );
    expect(svcManagerAvatars.length).toBe(2);
  });
});
