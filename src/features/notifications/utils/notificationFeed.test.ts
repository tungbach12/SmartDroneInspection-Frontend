import { describe, expect, it } from 'vitest';
import {
  buildUnifiedNotificationEntries,
  resolveLocalizedNotificationText,
  resolveNotificationCategory,
} from './notificationFeed';

describe('notificationFeed', () => {
  it('selects Vietnamese or English segment when bilingual delimiter is present', () => {
    const raw = 'Có báo giá mới | New quotation available';
    expect(resolveLocalizedNotificationText(raw, 'vi')).toBe('Có báo giá mới');
    expect(resolveLocalizedNotificationText(raw, 'en')).toBe('New quotation available');
    expect(resolveLocalizedNotificationText('Inspection Assigned', 'vi')).toBe('Inspection Assigned');
  });

  it('categorizes security, expiry, refund, video, and contract events accurately', () => {
    expect(resolveNotificationCategory('SECURITY_PASSWORD_CHANGED')).toBe('warning');
    expect(resolveNotificationCategory('DRONE_REGISTRATION_EXPIRED')).toBe('warning');
    expect(resolveNotificationCategory('INSPECTION_CANCELLED')).toBe('warning');
    expect(resolveNotificationCategory('REFUND_INITIATED')).toBe('payment');
    expect(resolveNotificationCategory('PAYOUT_SETTLED')).toBe('payment');
    expect(resolveNotificationCategory('RECEIVABLE_RECOVERY_RECORDED')).toBe('payment');
    expect(resolveNotificationCategory('VIDEO_PROCESSING_READY')).toBe('mission');
    expect(resolveNotificationCategory('SIGNED_CONTRACT_UPLOADED')).toBe('mission');
  });

  it('builds channel-specific safeRoutes for request, inspection, and partner chat notifications', () => {
    const entries = buildUnifiedNotificationEntries(
      [],
      [
        {
          channel: 'requests',
          requestId: 'req-1',
          requestDescription: 'Tower request',
          unreadCount: 1,
          latestMessageBody: 'Quote ready',
          latestMessageAuthor: 'Manager',
          latestMessageTime: '2026-11-25T08:00:00Z',
        },
        {
          channel: 'inspections',
          requestId: 'insp-1',
          inspectionId: 'insp-1',
          requestDescription: 'Bridge A',
          unreadCount: 2,
          latestMessageBody: 'Flight started',
          latestMessageAuthor: 'Inspector',
          latestMessageTime: '2026-11-25T08:05:00Z',
        },
        {
          channel: 'partners',
          requestId: 'req-2',
          inspectorId: 'user-9',
          requestDescription: 'Partner dispatch',
          unreadCount: 1,
          latestMessageBody: 'Please bring thermal lens',
          latestMessageAuthor: 'Manager',
          latestMessageTime: '2026-11-25T08:10:00Z',
        },
      ],
      'operations',
      ['INSPECTOR'],
      false,
      'vi',
    );

    expect(entries.find((e) => e.chatChannel === 'requests')?.safeRoute).toBe(
      '/operations/messages?requestId=req-1',
    );
    expect(entries.find((e) => e.chatChannel === 'inspections')?.safeRoute).toBe(
      '/operations/messages?inspectionId=insp-1',
    );
    expect(entries.find((e) => e.chatChannel === 'partners')?.safeRoute).toBe(
      '/operations/messages?partnerRequestId=req-2&inspectorId=user-9',
    );
  });
});
