import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatMessageList } from '@/components/app/ChatMessageList';
import type { ChatMessage } from '@/types/domain';

const dynamicUiSendMock = vi.fn();

vi.mock('@/components/DynamicUI', () => ({
  DynamicUI: ({
    data,
    onSendMessage,
  }: {
    data: { message?: string };
    onSendMessage: (message: string) => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        dynamicUiSendMock(data.message ?? '');
        onSendMessage(data.message ?? '');
      }}
    >
      Render dynamic UI
    </button>
  ),
}));

function renderMessageList(overrides?: Partial<React.ComponentProps<typeof ChatMessageList>>) {
  const props: React.ComponentProps<typeof ChatMessageList> = {
    messages: [],
    isLoading: false,
    onSendDynamicMessage: vi.fn(),
    scrollRef: createRef<HTMLDivElement>(),
    ...overrides,
  };

  return {
    ...render(<ChatMessageList {...props} />),
    props,
  };
}

describe('ChatMessageList', () => {
  it('renders conversation messages, attachments, and grounding links', () => {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: 'Need an SUV this weekend.',
        image: 'https://example.com/suv.jpg',
      },
      {
        role: 'model',
        content: 'Here are two options.',
        groundingMetadata: {
          groundingChunks: [
            {
              web: { uri: 'https://example.com/search', title: 'SUV search' },
              maps: { uri: 'https://maps.example.com/branch', title: 'Airport branch' },
            },
          ],
        },
      },
    ];

    renderMessageList({ messages });

    expect(screen.getByRole('log', { name: 'Conversation messages' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'User message' })).toHaveTextContent('Need an SUV this weekend.');
    expect(screen.getByRole('img', { name: 'Uploaded attachment' })).toHaveAttribute('src', 'https://example.com/suv.jpg');
    expect(screen.getByRole('article', { name: 'Assistant message' })).toHaveTextContent('Here are two options.');
    expect(screen.getByRole('link', { name: 'SUV search' })).toHaveAttribute('href', 'https://example.com/search');
    expect(screen.getByRole('link', { name: 'Airport branch' })).toHaveAttribute('href', 'https://maps.example.com/branch');
  });

  it('renders valid ui markdown blocks through DynamicUI and forwards actions', () => {
    const { props } = renderMessageList({
      messages: [
        {
          role: 'model',
          content: ['```ui', '{"message":"Open the fleet dashboard"}', '```'].join('\n'),
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Render dynamic UI' }));

    expect(dynamicUiSendMock).toHaveBeenCalledWith('Open the fleet dashboard');
    expect(props.onSendDynamicMessage).toHaveBeenCalledWith('Open the fleet dashboard');
  });

  it('falls back to code rendering for invalid ui markdown blocks and announces loading', () => {
    renderMessageList({
      messages: [
        {
          role: 'model',
          content: ['```ui', '{not valid json}', '```'].join('\n'),
        },
      ],
      isLoading: true,
    });

    expect(screen.getByText('{not valid json}')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Assistant is thinking.');
  });
});
