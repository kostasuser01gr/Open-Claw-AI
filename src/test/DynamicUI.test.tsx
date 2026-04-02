import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DynamicUI, type DynamicUIData } from '@/components/DynamicUI';

const { executeDynamicActionMock, submitDynamicFormMock } = vi.hoisted(() => ({
  executeDynamicActionMock: vi.fn(),
  submitDynamicFormMock: vi.fn(),
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

vi.mock('@/services/dynamicActions', () => ({
  executeDynamicAction: executeDynamicActionMock,
  submitDynamicForm: submitDynamicFormMock,
}));

describe('DynamicUI', () => {
  it('renders a button correctly and handles send_message', async () => {
    executeDynamicActionMock.mockResolvedValueOnce('test_action');
    const onSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'button',
      label: 'Click Me',
      action: 'send_message',
      message: 'test_action',
    };

    render(<DynamicUI data={data} onSendMessage={onSendMessage} />);

    fireEvent.click(screen.getByRole('button', { name: /click me/i }));

    await waitFor(() => {
      expect(executeDynamicActionMock).toHaveBeenCalledWith('send_message', 'test_action');
      expect(onSendMessage).toHaveBeenCalledWith('test_action');
    });
  });

  it('renders a button correctly and handles sync_ical action', async () => {
    executeDynamicActionMock.mockResolvedValueOnce('Successfully synced iCal calendars. No conflicts found.');
    const onSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'button',
      label: 'Sync iCal',
      action: 'sync_ical',
    };

    render(<DynamicUI data={data} onSendMessage={onSendMessage} />);

    fireEvent.click(screen.getByRole('button', { name: /sync ical/i }));

    await waitFor(() => {
      expect(executeDynamicActionMock).toHaveBeenCalledWith('sync_ical', undefined);
      expect(onSendMessage).toHaveBeenCalledWith('Successfully synced iCal calendars. No conflicts found.');
    });
  });

  it('renders a form correctly and handles submit through the whitelist', async () => {
    submitDynamicFormMock.mockResolvedValueOnce('Successfully submitted reservation details for vehicle veh_123.');
    const onSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'form',
      title: 'Test Form',
      collection: 'reservations',
      fields: [
        { name: 'vehicleId', label: 'Vehicle ID', type: 'text', required: true },
        { name: 'pickupDate', label: 'Pickup Date', type: 'date', required: true },
      ],
      submitLabel: 'Submit Form',
    };

    render(<DynamicUI data={data} onSendMessage={onSendMessage} />);

    fireEvent.change(screen.getByLabelText('Vehicle ID'), { target: { value: 'veh_123' } });
    fireEvent.change(screen.getByLabelText('Pickup Date'), { target: { value: '2026-03-27' } });
    fireEvent.click(screen.getByRole('button', { name: /submit form/i }));

    await waitFor(() => {
      expect(submitDynamicFormMock).toHaveBeenCalledWith('reservations', {
        vehicleId: 'veh_123',
        pickupDate: '2026-03-27',
      });
      expect(onSendMessage).toHaveBeenCalledWith('Successfully submitted reservation details for vehicle veh_123.');
    });
  });

  it('renders a card correctly', () => {
    render(
      <DynamicUI
        data={{
          type: 'card',
          title: 'Test Card',
          content: 'This is a test card content.',
        }}
        onSendMessage={vi.fn()}
      />,
    );

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('This is a test card content.')).toBeInTheDocument();
  });

  it('renders a table correctly', () => {
    render(
      <DynamicUI
        data={{
          type: 'table',
          title: 'Test Table',
          columns: ['Name', 'Age'],
          rows: [
            ['John', 30],
            ['Jane', 25],
          ],
        }}
        onSendMessage={vi.fn()}
      />,
    );

    expect(screen.getByText('Test Table')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders a chart correctly', () => {
    render(
      <DynamicUI
        data={{
          type: 'chart',
          title: 'Test Chart',
          chartType: 'bar',
          data: [
            { name: 'A', value: 10 },
            { name: 'B', value: 20 },
          ],
        }}
        onSendMessage={vi.fn()}
      />,
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    expect(screen.getByText('Test Chart').nextElementSibling).toBeInTheDocument();
  });

  it('renders unsupported type message', () => {
    const invalidData = { type: 'unknown_type' };

    render(<DynamicUI data={invalidData as never} onSendMessage={vi.fn()} />);
    expect(screen.getByText(/Unsupported UI type:/)).toBeInTheDocument();
  });
});
