import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FleetFilters } from '../components/FleetFilters';

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

    // Since the label is not associated with the select via htmlFor, we find it by role and name
    const selects = screen.getAllByRole('combobox');
    
    // The first combobox is Car Type
    fireEvent.change(selects[0], { target: { value: 'suv' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, carType: 'suv' });

    // The second combobox is Transmission
    fireEvent.change(selects[1], { target: { value: 'automatic' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, transmission: 'automatic' });

    // The third combobox is Availability
    fireEvent.change(selects[2], { target: { value: 'available' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, availability: 'available' });

    // The range input is Max Price
    const rangeInput = screen.getByRole('slider');
    fireEvent.change(rangeInput, { target: { value: '1000' } });
    expect(mockSetFilters).toHaveBeenCalledWith({ ...filters, maxPrice: 1000 });
  });
});
