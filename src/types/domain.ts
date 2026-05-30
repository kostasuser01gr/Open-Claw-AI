import type { SharedPersonaType } from '../../shared/aiContracts';

export type ViewMode =
  | 'chat'
  | 'fleet'
  | 'reservations'
  | 'crm'
  | 'ops'
  | 'kpi'
  | 'maintenance'
  | 'damage'
  | 'pricing'
  | 'contracts'
  | 'corporate'
  | 'audit'
  | 'users';

export type ThemeMode = 'dark' | 'light' | 'sepia';
export type UserRole = 'admin' | 'manager' | 'staff' | 'driver' | 'customer';
export type PersonaType = SharedPersonaType;

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  time: string;
}

export type ProjectFileType = 'document' | 'code' | 'data' | 'gallery' | 'kpi';

export interface ProjectFile {
  id: string;
  type: ProjectFileType;
  content: string;
  title: string;
  createdAt: string;
}

export interface CanvasState {
  isOpen: boolean;
  activeFileId: string | null;
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

export interface ToolCallRecord {
  name: string;
  ok?: boolean;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  image?: string;
  audio?: string;
  thinking?: string;
  groundingMetadata?: GroundingMetadata;
}

export interface AppUserProfile {
  uid: string;
  email: string | null;
  displayName?: string;
  role: UserRole;
  branchId?: string;
  createdAt?: string;
}

export type VehicleStatus = 'available' | 'available soon' | 'rented' | 'maintenance' | 'incident';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year?: number;
  plate?: string;
  type: string;
  transmission: string;
  status: VehicleStatus;
  branchId?: string;
  dailyRate: number;
  lastService?: string;
  photoUrls: string[];
  images: string[];
  name: string;
  view360?: boolean;
}

export interface Reservation {
  id: string;
  customerId: string;
  customerName?: string;
  vehicleId: string;
  vehicleName?: string;
  pickupDate: string;
  dropoffDate: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  totalPrice: number;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  notes?: string;
  loyaltyPoints?: number;
  loyaltyTier?: 'none' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo?: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: string;
  relatedId?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: string;
  description?: string;
  cost: number;
  date: string;
  nextServiceDue?: string;
  status?: 'scheduled' | 'in-progress' | 'completed';
}

export interface DamageReport {
  id: string;
  reservationId?: string;
  customerId?: string;
  vehicleId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedRepairCost: number;
  photoUrls: string[];
  aiAssessment?: string;
  createdAt: string;
  status?: 'pending' | 'reviewed' | 'resolved';
}

export interface PricingRule {
  id: string;
  name: string;
  vehicleType?: string;
  multiplier: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface Contract {
  id: string;
  reservationId: string;
  customerId: string;
  status: 'draft' | 'signed' | 'expired' | 'terminated';
  signedAt?: string;
  documentUrl?: string;
}

export interface DamageAssessment {
  severity: DamageReport['severity'];
  estimatedRepairCost: number;
  description: string;
  aiAssessment: string;
}

export interface FleetFilterOptions {
  carType: string;
  transmission: string;
  availability: string;
  maxPrice: number;
}

export interface AppDataState {
  userProfile: AppUserProfile | null;
  fleet: Vehicle[];
  reservations: Reservation[];
  customers: Customer[];
  tasks: Task[];
  maintenance: MaintenanceRecord[];
  damageReports: DamageReport[];
  pricingRules: PricingRule[];
  contracts: Contract[];
  isStaff: boolean;
}

// --- Booking Rules ---

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

// --- GDPR ---

export interface GdprRequest {
  id: string;
  uid: string;
  type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

// --- Email Notifications ---

export type EmailTemplate = 'reservation_confirmed' | 'reservation_cancelled' | 'reservation_reminder' | 'payment_receipt';

export interface EmailNotification {
  id: string;
  to: string;
  template: EmailTemplate;
  data: Record<string, unknown>;
  sentAt?: string;
  status: 'queued' | 'sent' | 'failed';
}
