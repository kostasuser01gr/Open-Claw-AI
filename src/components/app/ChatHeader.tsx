import { FileText, Menu, Settings2 } from 'lucide-react';
import type { PersonaType } from '@/types/domain';

interface ChatHeaderProps {
  persona: PersonaType;
  filesCount: number;
  canvasOpen: boolean;
  onOpenWorkspace: () => void;
  onOpenCommandPalette: () => void;
  onOpenMobileMenu?: () => void;
}

export function ChatHeader({
  persona,
  filesCount,
  canvasOpen,
  onOpenWorkspace,
  onOpenCommandPalette,
  onOpenMobileMenu,
}: ChatHeaderProps) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 sm:px-6 bg-bg/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-border text-text-muted hover:text-text transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">
            {persona.charAt(0).toUpperCase() + persona.slice(1)} Mode
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Encrypted Connection</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {filesCount > 0 && !canvasOpen && (
          <button
            onClick={onOpenWorkspace}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 text-xs font-medium hover:bg-orange-500/20 transition-all"
          >
            <FileText className="w-4 h-4" />
            Project Files ({filesCount})
          </button>
        )}
        <button
          onClick={onOpenCommandPalette}
          aria-label="Open command palette"
          title="Open command palette"
          className="p-2 hover:bg-border rounded-full transition-colors"
        >
          <Settings2 className="w-5 h-5 text-text-muted" />
        </button>
      </div>
    </header>
  );
}
