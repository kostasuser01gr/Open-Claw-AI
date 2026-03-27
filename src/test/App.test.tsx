import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id', email: 'test@example.com' },
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'test-user-id', email: 'test@example.com' });
      return () => {};
    }),
  },
  handleFirestoreError: vi.fn(),
  OperationType: { GET: 'get' },
  loginWithGoogle: vi.fn(),
  logout: vi.fn(),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn((query, callback) => {
    callback({ docs: [] });
    return () => {};
  }),
  getFirestore: vi.fn(),
}));

// Mock Gemini
vi.mock('../services/gemini', () => ({
  gemini: {
    chat: vi.fn().mockResolvedValue({ text: 'Mocked response' }),
  },
  MODELS: {
    general: 'gemini-3-flash-preview',
    developer: 'gemini-3.1-pro-preview',
    strategist: 'gemini-3.1-pro-preview',
    creative: 'gemini-3-flash-preview',
    analyst: 'gemini-3.1-pro-preview',
    rentalAgent: 'gemini-3-flash-preview'
  }
}));

// Mock recharts
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Open Claw')).toBeInTheDocument();
  });

  it('navigates to different modules', () => {
    render(<App />);
    
    // Click on Fleet Management
    fireEvent.click(screen.getAllByRole('button', { name: /Fleet Management/i })[0]);
    expect(screen.getByText('Total Fleet')).toBeInTheDocument();

    // Click on Reservations
    fireEvent.click(screen.getAllByRole('button', { name: /Reservations/i })[0]);
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();

    // Click on CRM
    fireEvent.click(screen.getAllByRole('button', { name: /CRM/i })[0]);
    expect(screen.getByText('Total Customers')).toBeInTheDocument();

    // Click on Operations
    fireEvent.click(screen.getAllByRole('button', { name: /Operations/i })[0]);
    expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    // Click on KPI Dashboard
    fireEvent.click(screen.getAllByRole('button', { name: /KPI Dashboard/i })[0]);
    expect(screen.getByText('Avg Utilization')).toBeInTheDocument();

    // Click on Maintenance
    fireEvent.click(screen.getAllByRole('button', { name: /Maintenance/i })[0]);
    expect(screen.getByText('Active Maintenance')).toBeInTheDocument();

    // Click on AI Damage Assessment
    fireEvent.click(screen.getAllByRole('button', { name: /AI Damage Assessment/i })[0]);
    expect(screen.getByText('New AI Assessment')).toBeInTheDocument();

    // Click on Dynamic Pricing
    fireEvent.click(screen.getAllByRole('button', { name: /Dynamic Pricing/i })[0]);
    expect(screen.getByText('Active Multipliers')).toBeInTheDocument();

    // Click on Contracts
    fireEvent.click(screen.getAllByRole('button', { name: /Contracts/i })[0]);
    expect(screen.getByText('Filter Status:')).toBeInTheDocument();
  });

  it('sends a message and receives a response', async () => {
    render(<App />);
    
    // Find the input field
    const input = screen.getByPlaceholderText(/Message Open Claw.../i);
    
    // Type a message
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    // Find and click the send button
    const sendButton = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(sendButton);
    
    // Wait for the message to appear
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    
    // Wait for the mocked response to appear
    expect(await screen.findByText('Mocked response')).toBeInTheDocument();
  });

  it('switches personas', () => {
    render(<App />);
    
    // Find and click the Developer persona button
    const developerButton = screen.getByRole('button', { name: /Developer/i });
    fireEvent.click(developerButton);
    
    // Check if the input placeholder changed
    expect(screen.getByPlaceholderText(/Message Open Claw \(coder\)\.\.\./i)).toBeInTheDocument();
  });

  it('opens and closes the command palette', async () => {
    render(<App />);
    
    // Press Cmd+K (or Ctrl+K)
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    
    // Check if the command palette is open
    const searchInput = screen.getByPlaceholderText('Search commands, personas, files...');
    expect(searchInput).toBeInTheDocument();
    
    // Press Escape
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    
    // Check if the command palette is closed
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search commands, personas, files...')).not.toBeInTheDocument();
    });
  });
});

