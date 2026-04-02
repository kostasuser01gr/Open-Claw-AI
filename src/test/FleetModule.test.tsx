import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FleetModule } from '@/components/modules/FleetModule';
import type { DamageReport, FleetFilterOptions, MaintenanceRecord, Vehicle } from '@/types/domain';

const {
  docMock,
  getDownloadURLMock,
  refMock,
  updateDocMock,
  uploadBytesMock,
} = vi.hoisted(() => ({
  docMock: vi.fn(),
  getDownloadURLMock: vi.fn(),
  refMock: vi.fn(),
  updateDocMock: vi.fn(),
  uploadBytesMock: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  updateDoc: updateDocMock,
}));

vi.mock('@/firebase', () => ({
  db: {},
  storage: {},
  ref: refMock,
  uploadBytes: uploadBytesMock,
  getDownloadURL: getDownloadURLMock,
  handleFirestoreError: vi.fn(() => ({ userMessage: 'Vehicle update failed.' })),
  OperationType: {
    UPDATE: 'update',
  },
}));

const vehicles: Vehicle[] = [
  {
    id: 'veh-1',
    make: 'Toyota',
    model: 'RAV4',
    type: 'SUV',
    transmission: 'Automatic',
    status: 'available',
    branchId: 'HQ',
    dailyRate: 120,
    photoUrls: [],
    images: [],
    name: 'Toyota RAV4',
  },
  {
    id: 'veh-2',
    make: 'Ford',
    model: 'Focus',
    type: 'Compact',
    transmission: 'Manual',
    status: 'maintenance',
    branchId: 'Airport',
    dailyRate: 90,
    photoUrls: [],
    images: [],
    name: 'Ford Focus',
  },
];

const maintenance: MaintenanceRecord[] = [
  {
    id: 'maint-1',
    vehicleId: 'veh-1',
    type: 'inspection',
    cost: 50,
    date: '2026-03-30',
  },
];

const damageReports: DamageReport[] = [
  {
    id: 'damage-1',
    vehicleId: 'veh-1',
    description: 'Scratch on bumper',
    severity: 'medium',
    estimatedRepairCost: 300,
    photoUrls: [],
    createdAt: '2026-03-27T10:00:00Z',
  },
];

const filters: FleetFilterOptions = {
  carType: 'SUV',
  transmission: 'all',
  availability: 'all',
  maxPrice: 200,
};

describe('FleetModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    docMock.mockReturnValue({ id: 'veh-1' });
    refMock.mockReturnValue({ fullPath: 'vehicles/veh-1/photo.jpg' });
    uploadBytesMock.mockResolvedValue({});
    getDownloadURLMock.mockResolvedValue('https://example.com/photo.jpg');
    updateDocMock.mockResolvedValue(undefined);
  });

  it('shows filtered results and resets vehicle filters', () => {
    const setFilters = vi.fn();

    render(
      <FleetModule
        vehicles={vehicles}
        maintenance={maintenance}
        damageReports={damageReports}
        filters={filters}
        setFilters={setFilters}
        onNotify={vi.fn()}
      />,
    );

    expect(screen.getByText(/Filtered: 1/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset vehicle filters' }));

    expect(setFilters).toHaveBeenCalledWith({
      carType: 'all',
      transmission: 'all',
      maxPrice: 200,
      availability: 'all',
    });
  });

  it('opens the vehicle details drawer and allows it to close', async () => {
    render(
      <FleetModule
        vehicles={vehicles}
        maintenance={maintenance}
        damageReports={damageReports}
        filters={{ ...filters, carType: 'all' }}
        setFilters={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Toyota RAV4'));
    expect(screen.getByRole('button', { name: 'Close vehicle details' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close vehicle details' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Close vehicle details' })).not.toBeInTheDocument();
    });
  });

  it('uploads a vehicle photo and notifies on success', async () => {
    const onNotify = vi.fn();
    const { container } = render(
      <FleetModule
        vehicles={vehicles}
        maintenance={maintenance}
        damageReports={damageReports}
        filters={{ ...filters, carType: 'all' }}
        setFilters={vi.fn()}
        onNotify={onNotify}
      />,
    );

    const uploadInput = container.querySelector('input[type="file"]');
    expect(uploadInput).not.toBeNull();

    const file = new File(['vehicle-image'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(uploadInput!, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadBytesMock).toHaveBeenCalled();
    });

    expect(refMock).toHaveBeenCalled();
    expect(getDownloadURLMock).toHaveBeenCalled();
    expect(updateDocMock).toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith('Vehicle image uploaded', 'Photo added to vehicle Toyota RAV4.', 'success');
  });
});
