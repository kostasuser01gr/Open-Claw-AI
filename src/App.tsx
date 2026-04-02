import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, LogIn, Sparkles } from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, loginWithGoogle, logout as logoutFromFirebase } from '@/firebase';
import { normalizeDamageAssessment } from '@/lib/normalize';
import { cn } from '@/lib/utils';
import { useAppData } from '@/hooks/useAppData';
import { useConversations } from '@/hooks/useConversations';
import { useNotifications } from '@/hooks/useNotifications';
import { useOperationalAlerts } from '@/hooks/useOperationalAlerts';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { buildModelPrompt } from '@/services/chatPrompt';
import { gemini, MODELS } from '@/services/gemini';
import { exportProjectFiles, parseCanvasContent } from '@/services/workspace';
import { ChatView } from '@/components/app/ChatView';
import { CommandPalette } from '@/components/app/CommandPalette';
import { NotificationStack } from '@/components/app/NotificationStack';
import { Sidebar } from '@/components/app/Sidebar';
import { SkeletonModule } from '@/components/app/Skeleton';
import { ErrorBoundary } from '@/components/app/ErrorBoundary';
import type {
  CanvasState,
  ChatMessage,
  FleetFilterOptions,
  PersonaType,
  ProjectFile,
  ThemeMode,
  ViewMode,
} from '@/types/domain';

const ModuleView = lazy(() => import('@/components/modules/ModuleView'));
const WorkspacePanel = lazy(() =>
  import('@/components/app/WorkspacePanel').then((module) => ({ default: module.WorkspacePanel })),
);

const SYSTEM_INSTRUCTION_BASE = `You are Open Claw Chat AI, a high-precision, professional AI workstation for car rental and tourism operations.
Your job is to help with customer requests, fleet planning, reservations, pricing, operations, and safe workflow automation.

When a request benefits from generated workspace artifacts, use <canvas> tags:
- <canvas type="document" title="Title"> for long-form docs
- <canvas type="code" title="filename.ext"> for code
- <canvas type="data" title="Dataset Name"> for chart-ready JSON
- <canvas type="gallery" title="Gallery Name"> for visual item lists
- <canvas type="kpi" title="Dashboard Name"> for KPI datasets

When acting as the rental agent:
- Respect search filters included in the prompt.
- Present safe UI helpers only when they map to explicit supported actions.
- Never suggest hidden admin-only data access.`;

const DEFAULT_FILTERS: FleetFilterOptions = {
  carType: 'all',
  transmission: 'all',
  availability: 'all',
  maxPrice: 200,
};

const DEFAULT_CANVAS: CanvasState = {
  isOpen: false,
  activeFileId: null,
};

function ShellFallback({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-3 text-text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [canvas, setCanvas] = useState<CanvasState>(DEFAULT_CANVAS);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [highThinking, setHighThinking] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [persona, setPersona] = useState<PersonaType>('general');
  const [rentalFilters, setRentalFilters] = useState<FleetFilterOptions>(DEFAULT_FILTERS);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { notifications, addNotification, dismissNotification } = useNotifications();
  const appData = useAppData(user, addNotification);
  const {
    conversations,
    activeConversationId,
    saveConversation,
    loadConversation,
    deleteConversation,
    startNewConversation,
    clearAll: clearConversations,
  } = useConversations(user);
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder({
    onTranscribed: (text) => {
      setInput((current) => (current ? `${current.trim()} ${text}` : text));
    },
    onError: (message) => {
      addNotification('Voice input unavailable', message, 'error');
    },
  });

  const resetLocalState = () => {
    setMessages([]);
    setFiles([]);
    setCanvas(DEFAULT_CANVAS);
    setInput('');
    setSelectedImage(null);
    setViewMode('chat');
    setRentalFilters(DEFAULT_FILTERS);
    setIsCommandPaletteOpen(false);
    setIsLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      resetLocalState();
    }
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-sepia');
    if (theme !== 'dark') {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  useOperationalAlerts(user, appData, addNotification);

  const updateFileContent = (fileId: string, content: string) => {
    setFiles((current) => current.map((file) => (file.id === fileId ? { ...file, content } : file)));
  };

  const handleLogout = async () => {
    try {
      await logoutFromFirebase();
      appData.clearData();
      clearConversations();
      resetLocalState();
      addNotification('Signed out', 'Local workspace and operational data were cleared.', 'info');
    } catch {
      addNotification('Sign-out failed', 'Please try again.', 'error');
    }
  };

  const handleLoadConversation = async (conversationId: string) => {
    const loaded = await loadConversation(conversationId);
    if (loaded.length > 0) {
      setMessages(loaded);
      setViewMode('chat');
    }
  };

  const handleNewConversation = () => {
    startNewConversation();
    setMessages([]);
    setViewMode('chat');
  };

  const handleSendMessage = async (
    rawInput: string,
    image: string | null,
    overrides?: { persona?: PersonaType; useMaps?: boolean },
  ) => {
    if ((!rawInput.trim() && !image) || isLoading) {
      return;
    }

    if (!user) {
      addNotification('Sign-in required', 'Please sign in to use the secure Gemini workspace.', 'warning');
      return;
    }

    const activePersona = overrides?.persona ?? persona;
    const activeUseMaps = overrides?.useMaps ?? useMaps;
    const visibleContent = rawInput.trim() || 'Uploaded an image for analysis.';
    const modelPrompt = buildModelPrompt(rawInput.trim(), activePersona, rentalFilters, {
      fleet: appData.fleet,
      reservations: appData.reservations,
      maintenance: appData.maintenance,
      pricingRules: appData.pricingRules,
    });

    if (overrides?.persona && overrides.persona !== persona) {
      setPersona(overrides.persona);
    }

    if (overrides?.useMaps && !useMaps) {
      setUseMaps(true);
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: visibleContent,
      image: image || undefined,
    };

    const requestMessages: ChatMessage[] = [
      ...messages,
      {
        role: 'user',
        content: modelPrompt,
        image: image || undefined,
      },
    ];

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSelectedImage(null);
    setViewMode('chat');
    setIsLoading(true);

    try {
      const response = await gemini.chat(requestMessages, {
        useSearch,
        useMaps: activeUseMaps,
        highThinking,
        model: isLiteMode ? MODELS.LITE : MODELS.FLASH,
        persona: activePersona,
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
      });

      const parsed = parseCanvasContent(response.text || "I'm sorry, I couldn't generate a response.");
      if (parsed.files.length > 0) {
        setFiles((current) => [...current, ...parsed.files]);
        setCanvas({
          isOpen: true,
          activeFileId: parsed.files[parsed.files.length - 1]?.id || null,
        });
      }

      const modelMessage: ChatMessage = {
        role: 'model',
        content: parsed.content,
        groundingMetadata: response.groundingMetadata,
      };

      setMessages((current) => [...current, modelMessage]);

      // Auto-save conversation to Firestore
      void saveConversation([...messages, userMessage, modelMessage]);
    } catch {
      const fallbackMessage = 'An error occurred while processing your request. Please try again.';
      addNotification('Gemini request failed', fallbackMessage, 'error');
      setMessages((current) => [
        ...current,
        {
          role: 'model',
          content: fallbackMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    await handleSendMessage(input, selectedImage);
  };

  const handleQuickPrompt = async (
    prompt: string,
    options?: {
      persona?: PersonaType;
      useMaps?: boolean;
    },
  ) => {
    await handleSendMessage(prompt, null, options);
  };

  const handleAnalyzeDamage = async (image: string) => {
    if (!user) {
      addNotification('Sign-in required', 'Please sign in to run AI damage assessment.', 'warning');
      return null;
    }

    try {
      const assessment = await gemini.analyzeDamage(image);
      const normalized = normalizeDamageAssessment(assessment);
      if (!normalized) {
        addNotification('AI analysis failed', 'The assessment response was incomplete.', 'error');
        return null;
      }

      addNotification('AI assessment complete', `Damage severity: ${normalized.severity}.`, 'success');
      return normalized;
    } catch {
      addNotification('AI analysis failed', 'Could not analyze the uploaded damage image.', 'error');
      return null;
    }
  };

  const shouldRenderWorkspacePanel = canvas.isOpen || files.length > 0;

  return (
    <div className={cn('h-screen flex bg-bg text-text overflow-hidden', theme === 'dark' && 'theme-dark')}>
      <div className="glow-bg top-[-220px] left-[-160px]" />
      <div className="glow-bg bottom-[-240px] right-[-120px]" />

      <Sidebar
        user={user}
        userRole={appData.userProfile?.role ?? 'customer'}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        persona={persona}
        onPersonaChange={setPersona}
        highThinking={highThinking}
        onToggleHighThinking={() => setHighThinking((current) => !current)}
        isLiteMode={isLiteMode}
        onToggleLiteMode={() => setIsLiteMode((current) => !current)}
        useSearch={useSearch}
        onToggleSearch={() => setUseSearch((current) => !current)}
        useMaps={useMaps}
        onToggleMaps={() => setUseMaps((current) => !current)}
        files={files}
        canvas={canvas}
        onSelectFile={(fileId) => setCanvas({ isOpen: true, activeFileId: fileId })}
        onResetProject={() => {
          setFiles([]);
          setCanvas(DEFAULT_CANVAS);
          addNotification('Workspace reset', 'Generated project files were cleared.', 'info');
        }}
        theme={theme}
        onThemeChange={setTheme}
        onLogin={() => void loginWithGoogle()}
        onLogout={() => void handleLogout()}
        onClearConversation={() => {
          startNewConversation();
          setMessages([]);
          addNotification('Conversation cleared', 'The current chat history was removed.', 'info');
        }}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onLoadConversation={(id) => void handleLoadConversation(id)}
        onDeleteConversation={(id) => void deleteConversation(id)}
        onNewConversation={handleNewConversation}
        mobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
      />

      <main className="flex-1 min-w-0 flex flex-col relative">
        {!user && (
          <div className="absolute top-4 right-4 z-20 hidden lg:block">
            <button
              onClick={() => void loginWithGoogle()}
              className="px-4 py-2 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 text-sm font-medium flex items-center gap-2 hover:bg-orange-500/20 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Google
            </button>
          </div>
        )}

        {!user && (
          <div className="lg:hidden px-4 pt-4">
            <button
              onClick={() => void loginWithGoogle()}
              className="w-full justify-center px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 text-sm font-medium flex items-center gap-2 hover:bg-orange-500/20 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign in with Google
            </button>
          </div>
        )}

        {!user && viewMode === 'chat' && messages.length === 0 && (
          <div className="sm:hidden px-4 pt-3">
            <div className="glass-card rounded-2xl p-4 text-sm text-text-muted flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-text">Secure workspace mode enabled</p>
                <p>Sign in to unlock Gemini chat, staff dashboards, and server-side AI actions without exposing client secrets.</p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewMode === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-1 min-h-0 flex flex-col"
            >
              <ChatView
            messages={messages}
            isLoading={isLoading}
            input={input}
            onInputChange={setInput}
            onSend={() => void handleSend()}
            onSendDynamicMessage={(message) => void handleSendMessage(message, null)}
            selectedImage={selectedImage}
            onSelectedImageChange={setSelectedImage}
            isRecording={isRecording}
            onStartRecording={() => void startRecording()}
            onStopRecording={stopRecording}
            persona={persona}
            files={files}
            canvasOpen={canvas.isOpen}
            onOpenWorkspace={() => setCanvas((current) => ({ ...current, isOpen: true }))}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onQuickPrompt={(prompt, options) => void handleQuickPrompt(prompt, options)}
            onViewModeChange={setViewMode}
            userRole={appData.userProfile?.role ?? 'customer'}
            rentalFilters={rentalFilters}
            onRentalFiltersChange={setRentalFilters}
            scrollRef={scrollRef}
          />
            </motion.div>
        ) : (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <ErrorBoundary fallbackLabel="Module failed to load">
            <Suspense fallback={<SkeletonModule />}>
              <ModuleView
              type={viewMode}
              data={appData}
              filters={rentalFilters}
              setFilters={setRentalFilters}
              onClose={() => setViewMode('chat')}
              onAnalyzeDamage={handleAnalyzeDamage}
              onNotify={addNotification}
              onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            />
          </Suspense>
            </ErrorBoundary>
          </motion.div>
        )}
        </AnimatePresence>

        {!user && viewMode === 'chat' && messages.length === 0 && (
          <div className="hidden sm:block absolute inset-x-0 bottom-28 mx-auto w-full max-w-xl px-6 pointer-events-none">
            <div className="glass-card rounded-2xl p-4 text-sm text-text-muted flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-text">Secure workspace mode enabled</p>
                <p>Sign in to unlock Gemini chat, staff dashboards, and server-side AI actions without exposing client secrets.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <NotificationStack notifications={notifications} onDismiss={dismissNotification} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setViewMode}
        onClearConversation={() => {
          startNewConversation();
          setMessages([]);
        }}
        onExportProject={() => void exportProjectFiles(files)}
        onOpenProjectDashboard={() => setCanvas((current) => ({ ...current, isOpen: true }))}
        onSwitchPersona={(nextPersona) => setPersona(nextPersona)}
      />

      {shouldRenderWorkspacePanel && (
        <ErrorBoundary fallbackLabel="Workspace failed to load">
        <Suspense fallback={<ShellFallback label="Opening workspace..." />}>
          <WorkspacePanel
            files={files}
            canvas={canvas}
            onClose={() => setCanvas((current) => ({ ...current, isOpen: false }))}
            onSelectFile={(fileId) => setCanvas({ isOpen: true, activeFileId: fileId })}
            onUpdateFileContent={updateFileContent}
          />
        </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
