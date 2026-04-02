import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContractModule } from '@/components/modules/ContractModule';
import type { Contract } from '@/types/domain';

const contracts: Contract[] = [
  {
    id: 'contract-1',
    reservationId: 'reservation-1',
    customerId: 'customer-1',
    status: 'signed',
    signedAt: '2026-03-25',
    documentUrl: 'https://example.com/contracts/contract-1.pdf',
  },
  {
    id: 'contract-2',
    reservationId: 'reservation-2',
    customerId: 'customer-2',
    status: 'draft',
  },
];

describe('ContractModule', () => {
  it('renders an accessible contracts table and filters rows by status', () => {
    render(<ContractModule contracts={contracts} />);

    expect(screen.getByRole('table', { name: 'Contracts' })).toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'signed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'draft' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'signed' }));

    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('2026-03-25')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download contract/i })).toHaveAttribute(
      'href',
      'https://example.com/contracts/contract-1.pdf',
    );
    expect(screen.queryByRole('button', { name: 'Contract document unavailable' })).not.toBeInTheDocument();
  });

  it('renders the unavailable action when a contract document is missing', () => {
    render(<ContractModule contracts={contracts} />);

    fireEvent.click(screen.getByRole('button', { name: 'draft' }));

    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contract document unavailable' })).toBeDisabled();
  });
});
