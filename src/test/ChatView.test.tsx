import type { ComponentProps } from 'react';
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatView } from '@/components/app/ChatView';
import type { ChatMessage, FleetFilterOptions } from '@/types/domain';

const defaultFilters: FleetFilterOptions = {
  carType: 'suv',
  transmission: 'manual',
  availability: 'available',
  maxPrice: 150,
};

function renderChatView(overrides?: Partial<ComponentProps<typeof ChatView>>) {
  const props: ComponentProps<typeof ChatView> = {
    messages: [],
    isLoading: false,
    input: '',
    onInputChange: vi.fn(),
    onSend: vi.fn(),
    onSendDynamicMessage: vi.fn(),
    selectedImage: null,
    onSelectedImageChange: vi.fn(),
    isRecording: false,
    onStartRecording: vi.fn(),
    onStopRecording: vi.fn(),
    persona: 'general',
    files: [],
    canvasOpen: false,
    onOpenWorkspace: vi.fn(),
    onOpenCommandPalette: vi.fn(),
    onQuickPrompt: vi.fn(),
    onViewModeChange: vi.fn(),
    rentalFilters: defaultFilters,
    onRentalFiltersChange: vi.fn(),
    scrollRef: createRef<HTMLDivElement>(),
    ...overrides,
  };

  return {
    ...render(<ChatView {...props} />),
    props,
  };
}

describe('ChatView', () => {
  it('shows rental filters for rental agent mode and resets them', () => {
    const { props } = renderChatView({ persona: 'rentalAgent' });

    expect(screen.getByLabelText('Car Type')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));

    expect(props.onRentalFiltersChange).toHaveBeenCalledWith({
      carType: 'all',
      transmission: 'all',
      availability: 'all',
      maxPrice: 200,
    });
  });

  it('dispatches quick actions from the empty state', () => {
    const { props } = renderChatView();

    fireEvent.click(screen.getByRole('button', { name: /Find Rentals/i }));
    expect(props.onQuickPrompt).toHaveBeenCalledWith(
      'Find car rental locations near me and show available SUV models in a visual gallery.',
      { persona: 'rentalAgent', useMaps: true },
    );

    fireEvent.click(screen.getByRole('button', { name: /My Reservations/i }));
    expect(props.onViewModeChange).toHaveBeenCalledWith('reservations');
  });

  it('renders grounding links and sends on enter', () => {
    const messages: ChatMessage[] = [
      {
        role: 'model',
        content: 'Here is your answer.',
        groundingMetadata: {
          groundingChunks: [
            {
              web: { uri: 'https://example.com/search', title: 'Web result' },
              maps: { uri: 'https://maps.example.com', title: 'View on Maps' },
            },
          ],
        },
      },
    ];

    const { props } = renderChatView({
      messages,
      input: 'Hello',
    });

    expect(screen.getByRole('link', { name: /Web result/i })).toHaveAttribute('href', 'https://example.com/search');
    expect(screen.getByRole('link', { name: /View on Maps/i })).toHaveAttribute('href', 'https://maps.example.com');

    fireEvent.keyDown(screen.getByPlaceholderText(/Message Open Claw/i), { key: 'Enter' });
    expect(props.onSend).toHaveBeenCalled();
  });
});
