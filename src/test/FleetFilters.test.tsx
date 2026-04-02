import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FleetFilters } from '@/components/FleetFilters';

describe('FleetFilters', () => {
  it('renders filter options correctly', () => {
    const mockSetFilters = vi.fn();
    const filters = {
      carType: 'all',
      transmission: 'all',
      availability: 'all',
      maxPrice: 500,
    };

    render(<FleetFilters filters={filters} setFilters={mockSetFilters} />);

    expect(screen.getByText('Car Type')).toBeInTheDocument();
    expect(screen.getByText('Transmission')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Max Price ($/day)')).toBeInTheDocument();
  });

  it('calls setFilters when a filter is changed', () => {
    const mockSetFilters = vi.fn();
    const filters = {
      carType: 'all',
      transmission: 'all',
      availability: 'all',
      maxPrice: 500,
    };

    render(<FleetFilters filters={filters} setFilters={mockSetFilters} />);

    fireEvent.change(screen.getByLabelText('Car Type'), { target: { value: 'suv' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, carType: 'suv' });

    fireEvent.change(screen.getByLabelText('Transmission'), { target: { value: 'automatic' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, transmission: 'automatic' });

    fireEvent.change(screen.getByLabelText('Availability'), { target: { value: 'available' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, availability: 'available' });

    fireEvent.change(screen.getByLabelText('Max Price ($/day)'), { target: { value: '1000' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, maxPrice: 1000 });
  });
});
