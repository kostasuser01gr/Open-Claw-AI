import type { RefObject } from 'react';
import { ChatComposer } from '@/components/app/ChatComposer';
import { ChatEmptyState } from '@/components/app/ChatEmptyState';
import { ChatHeader } from '@/components/app/ChatHeader';
import { ChatMessageList } from '@/components/app/ChatMessageList';
import { ChatRentalFilters } from '@/components/app/ChatRentalFilters';
import type {
  ChatMessage,
  FleetFilterOptions,
  PersonaType,
  ProjectFile,
  UserRole,
  ViewMode,
} from '@/types/domain';
import type { QuickPromptOptions } from './chatTypes';

export interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSendDynamicMessage: (message: string) => void;
  selectedImage: string | null;
  onSelectedImageChange: (value: string | null) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  persona: PersonaType;
  files: ProjectFile[];
  canvasOpen: boolean;
  onOpenWorkspace: () => void;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu?: () => void;
  onQuickPrompt: (prompt: string, options?: QuickPromptOptions) => void;
  onViewModeChange: (viewMode: ViewMode) => void;
  userRole?: UserRole;
  rentalFilters: FleetFilterOptions;
  onRentalFiltersChange: (filters: FleetFilterOptions) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function ChatView({
  messages,
  isLoading,
  input,
  onInputChange,
  onSend,
  onSendDynamicMessage,
  selectedImage,
  onSelectedImageChange,
  isRecording,
  onStartRecording,
  onStopRecording,
  persona,
  files,
  canvasOpen,
  onOpenWorkspace,
  onOpenCommandPalette,
  onOpenMobileMenu,
  onQuickPrompt,
  onViewModeChange,
  userRole,
  rentalFilters,
  onRentalFiltersChange,
  scrollRef,
}: ChatViewProps) {
  return (
    <>
      {persona === 'rentalAgent' && (
        <ChatRentalFilters filters={rentalFilters} onChange={onRentalFiltersChange} />
      )}

      <ChatHeader
        persona={persona}
        filesCount={files.length}
        canvasOpen={canvasOpen}
        onOpenWorkspace={onOpenWorkspace}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenMobileMenu={onOpenMobileMenu}
      />

      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto p-6">
          <ChatEmptyState onQuickPrompt={onQuickPrompt} onViewModeChange={onViewModeChange} userRole={userRole} />
        </div>
      ) : (
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          onSendDynamicMessage={onSendDynamicMessage}
          scrollRef={scrollRef}
        />
      )}

      <ChatComposer
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
        selectedImage={selectedImage}
        onSelectedImageChange={onSelectedImageChange}
        isLoading={isLoading}
        isRecording={isRecording}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
        persona={persona}
      />
    </>
  );
}
