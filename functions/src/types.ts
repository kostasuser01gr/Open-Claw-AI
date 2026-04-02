import type { SharedPersonaType } from '../../shared/aiContracts';

export type PersonaType = SharedPersonaType;
export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  image?: string;
}

export interface GroundingLink {
  uri: string;
  title?: string;
}

export interface GroundingChunk {
  web?: GroundingLink;
  maps?: GroundingLink;
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
}

export interface ChatConfig {
  model?: string;
  systemInstruction?: string;
  useSearch?: boolean;
  useMaps?: boolean;
  highThinking?: boolean;
  persona?: PersonaType;
}

export interface DamageAssessment {
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedRepairCost: number;
  description: string;
  aiAssessment: string;
}

// --- Booking rules ---

export interface BookingRule {
  id: string;
  minDurationDays: number;
  maxDurationDays: number;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  allowSameDayPickup: boolean;
  blockedDates: string[];
  isActive: boolean;
}

export const DEFAULT_BOOKING_RULE: Omit<BookingRule, 'id'> = {
  minDurationDays: 1,
  maxDurationDays: 90,
  minAdvanceHours: 2,
  maxAdvanceDays: 365,
  allowSameDayPickup: true,
  blockedDates: [],
  isActive: true,
};

// --- Reservation creation ---

export interface CreateReservationRequest {
  vehicleId: string;
  pickupDate: string;
  dropoffDate: string;
  notes?: string;
}

export interface CreateReservationResult {
  reservationId: string;
  status: 'pending';
}

// --- GDPR ---

export interface GdprExportResult {
  profile: Record<string, unknown>;
  reservations: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  damageReports: Record<string, unknown>[];
}

export interface GdprDeletionResult {
  deletedCollections: string[];
  deletedDocumentCount: number;
}

// --- User management ---

export interface CreateUserRequest {
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'staff' | 'driver' | 'customer';
  branchId?: string;
}

export interface UpdateUserRoleRequest {
  targetUid: string;
  role: 'admin' | 'manager' | 'staff' | 'driver' | 'customer';
}

// --- Payments ---

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentRecord {
  id: string;
  reservationId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripeSessionId?: string;
  createdAt: string;
}

// --- Email notifications ---

export type EmailTemplate = 'reservation_confirmed' | 'reservation_cancelled' | 'reservation_reminder' | 'payment_receipt';

export interface EmailNotification {
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  sentAt?: string;
  status: 'queued' | 'sent' | 'failed';
}
