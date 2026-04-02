import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  clearDataMock,
  geminiChatMock,
  exportProjectFilesMock,
  loginWithGoogleMock,
  logoutMock,
  parseCanvasContentMock,
  startRecordingMock,
  stopRecordingMock,
} = vi.hoisted(() => ({
  clearDataMock: vi.fn(),
  geminiChatMock: vi.fn(),
  exportProjectFilesMock: vi.fn(),
  loginWithGoogleMock: vi.fn(),
  logoutMock: vi.fn(),
  parseCanvasContentMock: vi.fn((content: string) => ({ content, files: [] })),
  startRecordingMock: vi.fn(),
  stopRecordingMock: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    callback({ uid: 'test-user-id', email: 'test@example.com', displayName: 'Test User' });
    return vi.fn();
  }),
}));

vi.mock('@/firebase', () => ({
  auth: { currentUser: { uid: 'test-user-id' } },
  loginWithGoogle: loginWithGoogleMock,
  logout: logoutMock,
}));

vi.mock('@/hooks/useAppData', () => ({
  useAppData: vi.fn(() => ({
    userProfile: {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'manager',
    },
    fleet: [],
    reservations: [],
    customers: [],
    tasks: [],
    maintenance: [],
    damageReports: [],
    pricingRules: [],
    contracts: [],
    isStaff: true,
    clearData: clearDataMock,
  })),
}));

vi.mock('@/hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: vi.fn(() => ({
    isRecording: false,
    startRecording: startRecordingMock,
    stopRecording: stopRecordingMock,
  })),
}));

vi.mock('@/services/gemini', () => ({
  gemini: {
    chat: geminiChatMock,
    analyzeDamage: vi.fn().mockResolvedValue(null),
  },
  MODELS: {
    FLASH: 'gemini-3-flash-preview',
    LITE: 'gemini-3.1-flash-lite-preview',
  },
}));

vi.mock('@/services/workspace', () => ({
  exportProjectFiles: exportProjectFilesMock,
  parseCanvasContent: parseCanvasContentMock,
}));

vi.mock('@/components/modules/ModuleView', () => ({
  default: ({ type }: { type: string }) => {
    const labels: Record<string, string> = {
      fleet: 'Total Fleet',
      reservations: 'Total Bookings',
      crm: 'Total Customers',
      ops: 'Active Tasks',
      kpi: 'Avg Utilization',
      maintenance: 'Active Maintenance',
      damage: 'New AI Assessment',
      pricing: 'Active Multipliers',
      contracts: 'Filter Status:',
      corporate: 'Corporate Portal',
    };

    return <div>{labels[type] || type}</div>;
  },
}));

vi.mock('@/components/app/WorkspacePanel', () => ({
  WorkspacePanel: () => null,
}));

import App from '@/App';

function clickFirstButton(name: RegExp) {
  const target = screen.getAllByRole('button', { name }).at(0);
  if (!target) {
    throw new Error(`Missing button: ${String(name)}`);
  }

  fireEvent.click(target);
}

describe('App', () => {
  it('renders without crashing', () => {
    geminiChatMock.mockResolvedValue({ text: 'Mocked response' });
    render(<App />);
    expect(screen.getByText('Open Claw')).toBeInTheDocument();
  });

  it('navigates to representative modules through the app shell', async () => {
    render(<App />);

    clickFirstButton(/Fleet Management/i);
    expect(await screen.findByText('Total Fleet')).toBeInTheDocument();

    clickFirstButton(/CRM/i);
    expect(await screen.findByText('Total Customers')).toBeInTheDocument();

    clickFirstButton(/KPI Dashboard/i);
    expect(await screen.findByText('Avg Utilization')).toBeInTheDocument();

    clickFirstButton(/Contracts/i);
    expect(await screen.findByText('Filter Status:')).toBeInTheDocument();
  }, 15_000);

  it('sends a message and receives a response', async () => {
    geminiChatMock.mockResolvedValueOnce({ text: 'Mocked response' });
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/Message Open Claw/i), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(await screen.findByText('Mocked response')).toBeInTheDocument();
    expect(geminiChatMock).toHaveBeenCalled();
  });

  it('switches personas', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Developer/i }));
    expect(screen.getByPlaceholderText(/Message Open Claw \(coder\)\.\.\./i)).toBeInTheDocument();
  });

  it('opens and closes the command palette', async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    const searchInput = screen.getByPlaceholderText('Search commands, personas, files...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.keyDown(searchInput, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search commands, personas, files...')).not.toBeInTheDocument();
    });
  });

  it('clears the conversation from the sidebar action', async () => {
    geminiChatMock.mockResolvedValueOnce({ text: 'Mocked response' });
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/Message Open Claw/i), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    expect(await screen.findByText('Hello')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Clear Conversation/i }));

    await waitFor(() => {
      expect(screen.queryByText('Hello')).not.toBeInTheDocument();
    });
  });
});
