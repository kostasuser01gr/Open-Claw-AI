import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DynamicUI, DynamicUIData } from '../components/DynamicUI';
import { addDoc } from 'firebase/firestore';

// Mock recharts to avoid ResponsiveContainer warnings in tests
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

// Mock firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-id' }),
  getFirestore: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
  handleFirestoreError: vi.fn(),
  OperationType: { CREATE: 'create' },
}));

describe('DynamicUI', () => {
  it('renders a button correctly and handles action', async () => {
    const mockOnSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'button',
      label: 'Click Me',
      action: 'send_message',
      message: 'test_action',
    };

    render(<DynamicUI data={data} onSendMessage={mockOnSendMessage} />);

    const button = screen.getByText('Click Me');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('test_action');
    });
  });

  it('renders a button correctly and handles sync_ical action', async () => {
    const mockOnSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'button',
      label: 'Sync iCal',
      action: 'sync_ical',
    };

    render(<DynamicUI data={data} onSendMessage={mockOnSendMessage} />);

    const button = screen.getByText('Sync iCal');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('Successfully synced iCal calendars. No conflicts found.');
    }, { timeout: 2000 });
  });

  it('renders a form correctly and handles submit', async () => {
    const mockOnSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'form',
      title: 'Test Form',
      collection: 'test_collection',
      fields: [
        { name: 'username', label: 'Username', type: 'text', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true },
      ],
      submitLabel: 'Submit Form',
    };

    render(<DynamicUI data={data} onSendMessage={mockOnSendMessage} />);

    expect(screen.getByText('Test Form')).toBeInTheDocument();
    // Use getAllByRole to find inputs since labels aren't associated with htmlFor
    const inputs = screen.getAllByRole('textbox');
    // Password input won't be found by textbox role, so we find it by type
    const passwordInput = document.querySelector('input[type="password"]');
    
    expect(inputs[0]).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    
    const submitButton = screen.getByText('Submit Form');
    expect(submitButton).toBeInTheDocument();

    fireEvent.change(inputs[0], { target: { value: 'testuser' } });
    fireEvent.change(passwordInput!, { target: { value: 'testpass' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(addDoc).toHaveBeenCalled();
      expect(mockOnSendMessage).toHaveBeenCalledWith('Successfully submitted form to test_collection with data: {"username":"testuser","password":"testpass"}');
    });
  });

  it('renders a card correctly', () => {
    const mockOnSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'card',
      title: 'Test Card',
      content: 'This is a test card content.',
    };

    render(<DynamicUI data={data} onSendMessage={mockOnSendMessage} />);

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('This is a test card content.')).toBeInTheDocument();
  });

  it('renders a table correctly', () => {
    const mockOnSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'table',
      title: 'Test Table',
      columns: ['Name', 'Age'],
      rows: [['John', '30'], ['Jane', '25']],
    };

    render(<DynamicUI data={data} onSendMessage={mockOnSendMessage} />);

    expect(screen.getByText('Test Table')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('renders a chart correctly', () => {
    const mockOnSendMessage = vi.fn();
    const data: DynamicUIData = {
      type: 'chart',
      title: 'Test Chart',
      chartType: 'bar',
      data: [{ name: 'A', value: 10 }, { name: 'B', value: 20 }],
    };

    render(<DynamicUI data={data} onSendMessage={mockOnSendMessage} />);

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
    // Recharts renders SVG, so we just check if the container is there
    const chartContainer = screen.getByText('Test Chart').nextElementSibling;
    expect(chartContainer).toBeInTheDocument();
  });

  it('renders unsupported type message', () => {
    const mockOnSendMessage = vi.fn();
    const data = {
      type: 'unknown_type',
    };

    // @ts-expect-error Testing invalid type
    render(<DynamicUI data={data} onSendMessage={mockOnSendMessage} />);
    expect(screen.getByText(/Unsupported UI type:/)).toBeInTheDocument();
  });
});
