import type { FleetFilterOptions, PersonaType, PricingRule, Reservation, Vehicle, MaintenanceRecord } from '@/types/domain';

interface RentalPromptSnapshot {
  fleet: Vehicle[];
  reservations: Reservation[];
  maintenance: MaintenanceRecord[];
  pricingRules: PricingRule[];
}

export function buildModelPrompt(
  rawInput: string,
  activePersona: PersonaType,
  rentalFilters: FleetFilterOptions,
  snapshot: RentalPromptSnapshot,
) {
  if (activePersona !== 'rentalAgent') {
    return rawInput;
  }

  const availableFleet = snapshot.fleet.filter((vehicle) => vehicle.status === 'available').length;
  const pendingReservations = snapshot.reservations.filter((reservation) => reservation.status === 'pending').length;
  const activeMaintenance = snapshot.maintenance.filter((entry) => entry.status !== 'completed').length;
  const activePricingRules = snapshot.pricingRules.filter((rule) => rule.isActive).length;

  return [
    `[Search Filters - Type: ${rentalFilters.carType}, Transmission: ${rentalFilters.transmission}, Max Price: $${rentalFilters.maxPrice}/day, Availability: ${rentalFilters.availability}]`,
    `[Fleet: ${snapshot.fleet.length} vehicles, ${availableFleet} available]`,
    `[Reservations: ${snapshot.reservations.length} total, ${pendingReservations} pending]`,
    `[Maintenance: ${activeMaintenance} active records]`,
    `[Pricing: ${activePricingRules} active rules]`,
    '',
    rawInput,
  ].join('\n');
}
