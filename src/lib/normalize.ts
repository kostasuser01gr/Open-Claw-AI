import type {
  AppUserProfile,
  Contract,
  Customer,
  DamageAssessment,
  DamageReport,
  MaintenanceRecord,
  PricingRule,
  Reservation,
  Task,
  UserRole,
  Vehicle,
  VehicleStatus,
} from '@/types/domain';

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function isStaffRole(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'manager' || role === 'staff';
}

export function normalizeUserProfile(uid: string, value: unknown, email: string | null): AppUserProfile {
  const record = toRecord(value);
  const role = stringValue(record.role, 'customer') as UserRole;

  return {
    uid,
    email: stringValue(record.email, email ?? '') || email,
    displayName: optionalString(record.displayName),
    role,
    branchId: optionalString(record.branchId),
    createdAt: optionalString(record.createdAt),
  };
}

function normalizeVehicleStatus(value: unknown): VehicleStatus {
  const status = stringValue(value, 'available') as VehicleStatus;
  if (status === 'available soon' || status === 'available' || status === 'rented' || status === 'maintenance' || status === 'incident') {
    return status;
  }
  return 'available';
}

export function normalizeVehicle(id: string, value: unknown): Vehicle {
  const record = toRecord(value);
  const make = stringValue(record.make, 'Unknown');
  const model = stringValue(record.model, 'Vehicle');
  const photoUrls = stringArray(record.photoUrls);

  return {
    id,
    make,
    model,
    year: typeof record.year === 'number' ? record.year : undefined,
    plate: optionalString(record.plate),
    type: stringValue(record.type, 'sedan'),
    transmission: stringValue(record.transmission, 'automatic'),
    status: normalizeVehicleStatus(record.status),
    branchId: optionalString(record.branchId),
    dailyRate: numberValue(record.dailyRate, 0),
    lastService: optionalString(record.lastService),
    photoUrls,
    images: photoUrls,
    name: `${make} ${model}`.trim(),
    view360: typeof record.view360 === 'boolean' ? record.view360 : undefined,
  };
}

export function normalizeReservation(id: string, value: unknown): Reservation {
  const record = toRecord(value);
  const status = stringValue(record.status, 'pending') as Reservation['status'];

  return {
    id,
    customerId: stringValue(record.customerId),
    customerName: optionalString(record.customerName),
    vehicleId: stringValue(record.vehicleId),
    vehicleName: optionalString(record.vehicleName),
    pickupDate: stringValue(record.pickupDate),
    dropoffDate: stringValue(record.dropoffDate),
    status,
    totalPrice: numberValue(record.totalPrice),
    notes: optionalString(record.notes),
  };
}

export function normalizeCustomer(id: string, value: unknown): Customer {
  const record = toRecord(value);
  return {
    id,
    name: stringValue(record.name, 'Customer'),
    email: optionalString(record.email),
    phone: optionalString(record.phone),
    licenseNumber: optionalString(record.licenseNumber),
    notes: optionalString(record.notes),
    loyaltyPoints: typeof record.loyaltyPoints === 'number' ? record.loyaltyPoints : undefined,
    loyaltyTier: (optionalString(record.loyaltyTier) as Customer['loyaltyTier']) ?? 'none',
  };
}

function normalizeTaskStatus(value: unknown): Task['status'] {
  const status = stringValue(value, 'pending');
  switch (status) {
    case 'todo':
      return 'pending';
    case 'done':
      return 'completed';
    case 'completed':
    case 'in-progress':
    case 'pending':
      return status;
    default:
      return 'pending';
  }
}

export function normalizeTask(id: string, value: unknown): Task {
  const record = toRecord(value);
  const priority = stringValue(record.priority, 'medium') as Task['priority'];

  return {
    id,
    title: stringValue(record.title, 'Untitled task'),
    description: optionalString(record.description),
    assignedTo: optionalString(record.assignedTo),
    status: normalizeTaskStatus(record.status),
    dueDate: optionalString(record.dueDate),
    relatedId: optionalString(record.relatedId),
    priority: priority === 'high' || priority === 'low' ? priority : 'medium',
  };
}

export function normalizeMaintenanceRecord(id: string, value: unknown): MaintenanceRecord {
  const record = toRecord(value);
  return {
    id,
    vehicleId: stringValue(record.vehicleId),
    type: stringValue(record.type, 'routine'),
    description: optionalString(record.description),
    cost: numberValue(record.cost),
    date: stringValue(record.date),
    nextServiceDue: optionalString(record.nextServiceDue),
    status: optionalString(record.status) as MaintenanceRecord['status'],
  };
}

export function normalizeDamageReport(id: string, value: unknown): DamageReport {
  const record = toRecord(value);
  const severity = stringValue(record.severity, 'low') as DamageReport['severity'];

  return {
    id,
    reservationId: optionalString(record.reservationId),
    customerId: optionalString(record.customerId),
    vehicleId: stringValue(record.vehicleId),
    description: stringValue(record.description, 'No description provided'),
    severity,
    estimatedRepairCost: numberValue(record.estimatedRepairCost),
    photoUrls: stringArray(record.photoUrls),
    aiAssessment: optionalString(record.aiAssessment),
    createdAt: stringValue(record.createdAt),
    status: (optionalString(record.status) as DamageReport['status']) ?? 'pending',
  };
}

export function normalizePricingRule(id: string, value: unknown): PricingRule {
  const record = toRecord(value);
  return {
    id,
    name: stringValue(record.name, 'Unnamed rule'),
    vehicleType: optionalString(record.vehicleType),
    multiplier: numberValue(record.multiplier, 1),
    startDate: optionalString(record.startDate),
    endDate: optionalString(record.endDate),
    isActive: record.isActive === true,
  };
}

export function normalizeContract(id: string, value: unknown): Contract {
  const record = toRecord(value);
  const status = stringValue(record.status, 'draft') as Contract['status'];

  return {
    id,
    reservationId: stringValue(record.reservationId),
    customerId: stringValue(record.customerId),
    status,
    signedAt: optionalString(record.signedAt),
    documentUrl: optionalString(record.documentUrl),
  };
}

export function normalizeDamageAssessment(value: unknown): DamageAssessment | null {
  const record = toRecord(value);
  const severity = stringValue(record.severity) as DamageAssessment['severity'];
  const description = stringValue(record.description);
  const aiAssessment = stringValue(record.aiAssessment);

  if (!severity || !description || !aiAssessment) {
    return null;
  }

  return {
    severity,
    estimatedRepairCost: numberValue(record.estimatedRepairCost),
    description,
    aiAssessment,
  };
}
