import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Markdown from 'react-markdown';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Car, Code, FileText, LayoutGrid, TrendingUp, X } from 'lucide-react';
import { safeParseJson } from '@/lib/json';
import { cn } from '@/lib/utils';
import type { CanvasState, ProjectFile, ProjectFileType } from '@/types/domain';

interface WorkspacePanelProps {
  files: ProjectFile[];
  canvas: CanvasState;
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
  onUpdateFileContent: (fileId: string, content: string) => void;
}

type ChartRecord = Record<string, string | number>;

const FILE_ICONS: Record<ProjectFileType, ReactNode> = {
  document: <FileText className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  data: <TrendingUp className="w-4 h-4" />,
  gallery: <Car className="w-4 h-4" />,
  kpi: <LayoutGrid className="w-4 h-4" />,
};

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

function ChartPreview({ file }: { file: ProjectFile }) {
  const parsed = safeParseJson(file.content);
  const chartType =
    parsed && typeof parsed === 'object' && 'chartType' in parsed && typeof parsed.chartType === 'string'
      ? parsed.chartType
      : 'line';
  const data =
    parsed && typeof parsed === 'object' && 'data' in parsed && Array.isArray(parsed.data)
      ? (parsed.data as ChartRecord[])
      : [];

  if (data.length === 0) {
    return (
      <div
        role="status"
        className="h-64 rounded-2xl border border-dashed border-border flex items-center justify-center text-sm text-text-muted"
      >
        No chart data available.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label={`${file.title} chart preview`}
      className="h-80 bg-surface rounded-2xl border border-border p-4"
    >
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={110}>
              {data.map((entry, index) => (
                <Cell key={`${String(entry.name || index)}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }} />
          </PieChart>
        ) : chartType === 'bar' ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }} />
            <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function GalleryPreview({ file }: { file: ProjectFile }) {
  const parsed = safeParseJson(file.content);
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && 'items' in parsed && Array.isArray(parsed.items)
      ? parsed.items
      : [];

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div role="status" className="rounded-2xl border border-dashed border-border p-6 text-sm text-text-muted">
        No gallery items were provided.
      </div>
    );
  }

  return (
    <div role="list" aria-label={`${file.title} gallery preview`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item, index) => {
        const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const title = typeof record.title === 'string' ? record.title : `Item ${index + 1}`;
        const description = typeof record.description === 'string' ? record.description : 'No description';
        const image = typeof record.image === 'string' ? record.image : undefined;

        return (
          <div key={`${title}-${index}`} role="listitem" className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="aspect-video bg-bg border-b border-border flex items-center justify-center">
              {image ? (
                <img src={image} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Car className="w-10 h-10 text-text-muted opacity-60" />
              )}
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-text-muted">{description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FilePreview({
  file,
  onUpdate,
}: {
  file: ProjectFile;
  onUpdate: (content: string) => void;
}) {
  if (file.type === 'document') {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <textarea
          value={file.content}
          onChange={(event) => onUpdate(event.target.value)}
          aria-label={`${file.title} markdown editor`}
          className="min-h-[520px] rounded-2xl border border-border bg-surface p-4 text-sm focus:outline-none focus:border-orange-500/40"
        />
        <div className="min-h-[520px] rounded-2xl border border-border bg-surface p-6 overflow-y-auto">
          <div className="markdown-body max-w-none">
            <Markdown>{file.content}</Markdown>
          </div>
        </div>
      </div>
    );
  }

  if (file.type === 'code') {
    return (
      <textarea
        value={file.content}
        onChange={(event) => onUpdate(event.target.value)}
        spellCheck={false}
        aria-label={`${file.title} code editor`}
        className="w-full min-h-[560px] rounded-2xl border border-border bg-surface p-4 text-sm font-mono focus:outline-none focus:border-orange-500/40"
      />
    );
  }

  if (file.type === 'gallery') {
    return (
      <div className="space-y-6">
        <GalleryPreview file={file} />
        <textarea
          value={file.content}
          onChange={(event) => onUpdate(event.target.value)}
          spellCheck={false}
          aria-label={`${file.title} raw data editor`}
          className="w-full min-h-[220px] rounded-2xl border border-border bg-surface p-4 text-sm font-mono focus:outline-none focus:border-orange-500/40"
        />
      </div>
    );
  }

  if (file.type === 'data' || file.type === 'kpi') {
    return (
      <div className="space-y-6">
        <ChartPreview file={file} />
        <textarea
          value={file.content}
          onChange={(event) => onUpdate(event.target.value)}
          spellCheck={false}
          aria-label={`${file.title} raw data editor`}
          className="w-full min-h-[220px] rounded-2xl border border-border bg-surface p-4 text-sm font-mono focus:outline-none focus:border-orange-500/40"
        />
      </div>
    );
  }

  return null;
}

export function WorkspacePanel({
  files,
  canvas,
  onClose,
  onSelectFile,
  onUpdateFileContent,
}: WorkspacePanelProps) {
  const activeFile = useMemo(
    () => files.find((file) => file.id === canvas.activeFileId) || files[files.length - 1] || null,
    [canvas.activeFileId, files],
  );
  const [showRawList, setShowRawList] = useState(false);

  return (
    <AnimatePresence>
      {canvas.isOpen && activeFile && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="w-full h-full rounded-[32px] border border-border bg-bg/95 shadow-2xl overflow-hidden flex"
          >
            <aside className="w-72 border-r border-border bg-surface/70 hidden lg:flex flex-col">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Project Workspace</p>
                  <p className="text-sm text-text-muted">{files.length} generated files</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => onSelectFile(file.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors',
                      activeFile.id === file.id ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'hover:bg-border text-text-muted hover:text-text',
                    )}
                  >
                    {FILE_ICONS[file.type]}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.title}</p>
                      <p className="text-[10px] uppercase tracking-widest">{file.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
              <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 bg-surface/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-text-muted">
                    {FILE_ICONS[activeFile.type]}
                    <span className="text-[10px] uppercase tracking-widest font-bold">{activeFile.type}</span>
                  </div>
                  <h2 className="text-lg font-semibold truncate">{activeFile.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRawList((current) => !current)}
                    aria-label="Toggle file list"
                    className="lg:hidden px-3 py-2 rounded-lg border border-border text-sm text-text-muted hover:text-text"
                  >
                    Files
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Close workspace"
                    className="p-2 rounded-lg border border-border text-text-muted hover:text-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {showRawList && (
                <div className="lg:hidden border-b border-border bg-surface/50 p-3 flex gap-2 overflow-x-auto">
                  {files.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        onSelectFile(file.id);
                        setShowRawList(false);
                      }}
                      className={cn(
                        'px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap',
                        activeFile.id === file.id ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-border/50 text-text-muted',
                      )}
                    >
                      {file.title}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 lg:p-6">
                <FilePreview file={activeFile} onUpdate={(content) => onUpdateFileContent(activeFile.id, content)} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
