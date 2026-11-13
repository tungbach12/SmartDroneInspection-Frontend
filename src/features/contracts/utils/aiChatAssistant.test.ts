import { describe, expect, it } from 'vitest';
import { type ServiceRequest, type ServiceRequestMessage } from '../api/contractApi';
import { generateContextualAiBotReply, shouldAiBotAutoReply } from './aiChatAssistant';

describe('aiChatAssistant', () => {
  const dummyRequest: ServiceRequest = {
    id: 'req-001',
    ownerCustomerId: 'org-001',
    assetId: 'asset-001',
    description: 'Khảo sát vết nứt mố cầu',
    requestedFrom: '2026-11-05T08:00:00Z',
    requestedUntil: '2026-11-05T17:00:00Z',
    timezone: 'Asia/Ho_Chi_Minh',
    windowStart: '08:00',
    windowEnd: '17:00',
    requestType: 'ONE_TIME',
    recurrenceUnit: null,
    recurrenceInterval: null,
    occurrenceCount: 1,
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
    createdAt: '2026-11-01T10:00:00Z',
    currentQuote: null,
    occurrences: [],
    messages: [],
  };

  describe('shouldAiBotAutoReply logic', () => {
    it('returns false when Manager/Admin has already posted in the thread', () => {
      const messagesWithManager: ServiceRequestMessage[] = [
        {
          id: 'm1',
          authorUserId: 'cust-1',
          authorRole: 'CUSTOMER',
          authorName: 'Khách hàng',
          body: 'Cho hỏi về thiết bị',
          createdAt: '2026-11-01T10:05:00Z',
        },
        {
          id: 'm2',
          authorUserId: 'mgr-1',
          authorRole: 'MANAGER',
          authorName: 'Quản lý sàn',
          body: 'Chào bạn, mình là Quản lý, mình sẽ phụ trách đơn này nhé.',
          createdAt: '2026-11-01T10:06:00Z',
        },
      ];

      // Customer sends a follow-up message
      const shouldReply = shouldAiBotAutoReply(messagesWithManager, 'Drone có camera nhiệt không?', false);
      expect(shouldReply).toBe(false);
    });

    it('returns false if the sender is Manager or Admin role', () => {
      const shouldReply = shouldAiBotAutoReply([], 'Chào bạn!', true);
      expect(shouldReply).toBe(false);
    });

    it('returns false for conversational closures (ok, dạ, cảm ơn)', () => {
      expect(shouldAiBotAutoReply([], 'ok', false)).toBe(false);
      expect(shouldAiBotAutoReply([], 'dạ', false)).toBe(false);
      expect(shouldAiBotAutoReply([], 'cảm ơn', false)).toBe(false);
      expect(shouldAiBotAutoReply([], 'vâng', false)).toBe(false);
    });

    it('returns true when Manager has not participated yet and customer asks a question', () => {
      const shouldReply = shouldAiBotAutoReply([], 'Giá kiểm định là bao nhiêu?', false);
      expect(shouldReply).toBe(true);
    });
  });

  describe('generateContextualAiBotReply intelligence', () => {
    it('responds politely and professionally to non-business romantic/joke messages like "tôi yêu bạn"', () => {
      const reply = generateContextualAiBotReply('tôi yêu bạn', dummyRequest);
      expect(reply).toContain('cảm ơn tình cảm');
      expect(reply).toContain('Trợ lý AI túc trực hỗ trợ giải đáp kỹ thuật');
    });

    it('answers greeting messages with clear suggestions', () => {
      const reply = generateContextualAiBotReply('xin chào', dummyRequest);
      expect(reply).toContain('Xin chào bạn');
      expect(reply).toContain('Thiết bị bay & Cảm biến nhiệt');
      expect(reply).toContain('Dự toán đơn giá');
    });

    it('answers equipment and drone inquiries with detailed specs (DJI M30T, zoom, thermal)', () => {
      const reply = generateContextualAiBotReply('Công trình này dùng drone gì và có camera nhiệt không?', dummyRequest);
      expect(reply).toContain('DJI Matrice 30T hoặc Matrice 350 RTK');
      expect(reply).toContain('Zoom quang học 16x - 200x');
      expect(reply).toContain('Thermal Sensor 640x512');
    });

    it('answers pricing and quote inquiries with cost mechanism', () => {
      const reply = generateContextualAiBotReply('Báo giá chi phí bay hết bao nhiêu tiền?', dummyRequest);
      expect(reply).toContain('1.500.000đ – 3.500.000đ / đợt bay');
      expect(reply).toContain('Bảng báo giá chi tiết');
      expect(reply).toContain('Chấp thuận báo giá');
    });

    it('answers schedule and timing inquiries with optimal lighting and weather windows', () => {
      const reply = generateContextualAiBotReply('Thời gian nào bay thì thích hợp nhất?', dummyRequest);
      expect(reply).toContain('07:00 – 10:30');
      expect(reply).toContain('14:30 – 17:00');
      expect(reply).toContain('sức gió < 12m/s');
    });

    it('answers contract procedure inquiries with 3-step offline contract workflow', () => {
      const reply = generateContextualAiBotReply('Quy trình ký hợp đồng như thế nào?', dummyRequest);
      expect(reply).toContain('1. Duyệt báo giá');
      expect(reply).toContain('2. Ký kết hợp đồng giấy (Offline)');
      expect(reply).toContain('3. Kích hoạt phân công');
    });

    it('answers flight permit inquiries with Military airspace and Decree 36 guidance', () => {
      const reply = generateContextualAiBotReply('Có cần xin giấy phép bay quân sự Cục Tác chiến không?', dummyRequest);
      expect(reply).toContain('Cục Tác chiến - Bộ Tổng Tham mưu');
      expect(reply).toContain('Nghị định 36/2008/NĐ-CP');
    });

    it('quotes customer exact query and marks priority for Manager when query is out-of-scope/uncommon', () => {
      const customQuery = 'Công trình có địa chất đá vôi và gần đường dây điện cao thế 220kV';
      const reply = generateContextualAiBotReply(customQuery, dummyRequest);
      expect(reply).toContain(customQuery);
      expect(reply).toContain('đánh dấu ưu tiên cho Quản lý sàn phụ trách');
    });
  });
});
