import { describe, expect, it } from 'vitest';
import { buildModelPrompt } from '@/services/chatPrompt';
import type { FleetFilterOptions } from '@/types/domain';

const rentalFilters: FleetFilterOptions = {
  carType: 'suv',
  transmission: 'automatic',
  availability: 'available',
  maxPrice: 180,
};

describe('buildModelPrompt', () => {
  it('returns the raw input for non-rental personas', () => {
    const result = buildModelPrompt('Summarize the fleet outlook.', 'analyst', rentalFilters, {
      fleet: [],
      reservations: [],
      maintenance: [],
      pricingRules: [],
    });

    expect(result).toBe('Summarize the fleet outlook.');
  });

  it('adds rental operational context for the rental agent persona', () => {
    const result = buildModelPrompt('Find me the best SUV option.', 'rentalAgent', rentalFilters, {
      fleet: [
        {
          id: 'veh-1',
          make: 'Toyota',
          model: 'RAV4',
          type: 'suv',
          transmission: 'automatic',
          status: 'available',
          dailyRate: 120,
          photoUrls: [],
          images: [],
          name: 'Toyota RAV4',
        },
        {
          id: 'veh-2',
          make: 'Ford',
          model: 'Focus',
          type: 'compact',
          transmission: 'manual',
          status: 'maintenance',
          dailyRate: 80,
          photoUrls: [],
          images: [],
          name: 'Ford Focus',
        },
      ],
      reservations: [
        {
          id: 'res-1',
          customerId: 'cust-1',
          vehicleId: 'veh-1',
          pickupDate: '2026-03-28T10:00:00Z',
          dropoffDate: '2026-03-29T10:00:00Z',
          status: 'pending',
          totalPrice: 120,
        },
      ],
      maintenance: [
        {
          id: 'maint-1',
          vehicleId: 'veh-2',
          type: 'inspection',
          cost: 0,
          status: 'scheduled',
          date: '2026-03-30T10:00:00Z',
        },
      ],
      pricingRules: [
        {
          id: 'rule-1',
          name: 'Weekend multiplier',
          vehicleType: 'suv',
          multiplier: 1.2,
          isActive: true,
        },
      ],
    });

    expect(result).toContain('[Search Filters - Type: suv, Transmission: automatic, Max Price: $180/day, Availability: available]');
    expect(result).toContain('[Fleet: 2 vehicles, 1 available]');
    expect(result).toContain('[Reservations: 1 total, 1 pending]');
    expect(result).toContain('[Maintenance: 1 active records]');
    expect(result).toContain('[Pricing: 1 active rules]');
    expect(result).toContain('Find me the best SUV option.');
  });
});
