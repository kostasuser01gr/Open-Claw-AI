import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CRMModule } from '@/components/modules/CRMModule';
import type { Customer } from '@/types/domain';

const customers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Alex Doe',
    email: 'alex@example.com',
    phone: '+30 555 0101',
    loyaltyPoints: 120,
    loyaltyTier: 'Gold',
  },
  {
    id: 'cust-2',
    name: 'Maria Stone',
    loyaltyPoints: 0,
    loyaltyTier: 'none',
  },
];

describe('CRMModule', () => {
  it('renders summary stats and customer cards', () => {
    render(<CRMModule customers={customers} />);

    expect(screen.getByText('Total Customers')).toBeInTheDocument();
    expect(screen.getByText('Loyalty Members')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Customer CRM entries' })).toBeInTheDocument();
    expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Points: 120')).toBeInTheDocument();
  });

  it('renders an empty state when there are no customers', () => {
    render(<CRMModule customers={[]} />);

    expect(screen.getByRole('status')).toHaveTextContent('No customers found.');
    expect(screen.getByRole('list', { name: 'Customer CRM entries' })).toBeInTheDocument();
  });
});
