import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DynamicUI } from '../components/DynamicUI';
import { addDoc } from 'firebase/firestore';

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
    const data = {
      type: 'button',
      label: 'Click Me',
      action: 'send_message',
      message: 'test_action',
    };

    render(<DynamicUI data={data as any} onSendMessage={mockOnSendMessage} />);

    const button = screen.getByText('Click Me');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('test_action');
    });
  });

  it('renders a form correctly and handles submit', async () => {
    const mockOnSendMessage = vi.fn();
    const data = {
      type: 'form',
      title: 'Test Form',
      collection: 'test_collection',
      fields: [
        { name: 'username', label: 'Username', type: 'text', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true },
      ],
      submitLabel: 'Submit Form',
    };

    render(<DynamicUI data={data as any} onSendMessage={mockOnSendMessage} />);

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
    const data = {
      type: 'card',
      title: 'Test Card',
      content: 'This is a test card content.',
    };

    render(<DynamicUI data={data as any} onSendMessage={mockOnSendMessage} />);

    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('This is a test card content.')).toBeInTheDocument();
  });

  it('renders unsupported type message', () => {
    const mockOnSendMessage = vi.fn();
    const data = {
      type: 'unknown_type',
    };

    render(<DynamicUI data={data as any} onSendMessage={mockOnSendMessage} />);
    expect(screen.getByText(/Unsupported UI type:/)).toBeInTheDocument();
  });
});
