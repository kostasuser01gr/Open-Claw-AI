import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspacePanel } from '@/components/app/WorkspacePanel';
import type { CanvasState, ProjectFile } from '@/types/domain';

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');

  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-responsive-container">{children}</div>,
  };
});

const files: ProjectFile[] = [
  {
    id: 'doc-1',
    type: 'document',
    title: 'Ops Summary',
    content: '# Summary\n\nOperational snapshot',
    createdAt: '2026-03-27T09:00:00Z',
  },
  {
    id: 'code-1',
    type: 'code',
    title: 'pricing.ts',
    content: 'export const multiplier = 1.25;',
    createdAt: '2026-03-27T09:05:00Z',
  },
];

function renderWorkspace(overrides?: Partial<{
  files: ProjectFile[];
  canvas: CanvasState;
  onClose: () => void;
  onSelectFile: (fileId: string) => void;
  onUpdateFileContent: (fileId: string, content: string) => void;
}>) {
  const props = {
    files,
    canvas: {
      isOpen: true,
      activeFileId: 'doc-1',
    } satisfies CanvasState,
    onClose: vi.fn(),
    onSelectFile: vi.fn(),
    onUpdateFileContent: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<WorkspacePanel {...props} />),
    props,
  };
}

describe('WorkspacePanel', () => {
  it('renders nothing when the canvas is closed', () => {
    renderWorkspace({
      canvas: {
        isOpen: false,
        activeFileId: 'doc-1',
      },
    });

    expect(screen.queryByText('Ops Summary')).not.toBeInTheDocument();
  });

  it('updates the active document content and closes the workspace', () => {
    const { props } = renderWorkspace();

    expect(screen.getByRole('heading', { name: 'Ops Summary' })).toBeInTheDocument();

    const editor = screen.getByRole('textbox', { name: 'Ops Summary markdown editor' });
    fireEvent.change(editor, { target: { value: '# Updated\n\nReady to publish' } });

    expect(props.onUpdateFileContent).toHaveBeenCalledWith('doc-1', '# Updated\n\nReady to publish');

    fireEvent.click(screen.getByRole('button', { name: 'Close workspace' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('exposes file switching controls in both desktop and compact views', () => {
    const { props } = renderWorkspace();

    fireEvent.click(screen.getByRole('button', { name: /pricing\.ts/i }));
    expect(props.onSelectFile).toHaveBeenCalledWith('code-1');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle file list' }));
    fireEvent.click(screen.getAllByRole('button', { name: /pricing\.ts/i }).at(-1)!);

    expect(props.onSelectFile).toHaveBeenCalledWith('code-1');
  });

  it('falls back to the latest file when the active file is missing and updates code content', () => {
    const { props } = renderWorkspace({
      canvas: {
        isOpen: true,
        activeFileId: 'missing-file',
      },
    });

    const editor = screen.getByRole('textbox', { name: 'pricing.ts code editor' });
    fireEvent.change(editor, { target: { value: 'export const multiplier = 2;' } });

    expect(props.onUpdateFileContent).toHaveBeenCalledWith('code-1', 'export const multiplier = 2;');
  });

  it('renders gallery and chart empty states with named raw data editors', () => {
    const previewFiles: ProjectFile[] = [
      {
        id: 'gallery-1',
        type: 'gallery',
        title: 'Vehicle Gallery',
        content: JSON.stringify({ items: [] }),
        createdAt: '2026-03-27T09:10:00Z',
      },
      {
        id: 'data-1',
        type: 'data',
        title: 'Pricing Metrics',
        content: JSON.stringify({ chartType: 'bar', data: [] }),
        createdAt: '2026-03-27T09:15:00Z',
      },
    ];

    const galleryRender = renderWorkspace({
      files: previewFiles,
      canvas: {
        isOpen: true,
        activeFileId: 'gallery-1',
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent('No gallery items were provided.');
    expect(screen.getByRole('textbox', { name: 'Vehicle Gallery raw data editor' })).toBeInTheDocument();

    galleryRender.unmount();

    renderWorkspace({
      files: previewFiles,
      canvas: {
        isOpen: true,
        activeFileId: 'data-1',
      },
    });

    expect(screen.getByRole('status')).toHaveTextContent('No chart data available.');
    expect(screen.getByRole('textbox', { name: 'Pricing Metrics raw data editor' })).toBeInTheDocument();
  });

  it('renders populated gallery previews with accessible list semantics', () => {
    const previewFiles: ProjectFile[] = [
      {
        id: 'gallery-1',
        type: 'gallery',
        title: 'Vehicle Gallery',
        content: JSON.stringify({
          items: [
            {
              title: 'Peugeot 208',
              description: 'City hatchback',
              image: 'https://example.com/peugeot-208.jpg',
            },
          ],
        }),
        createdAt: '2026-03-27T09:10:00Z',
      },
    ];

    renderWorkspace({
      files: previewFiles,
      canvas: {
        isOpen: true,
        activeFileId: 'gallery-1',
      },
    });

    expect(screen.getByRole('list', { name: 'Vehicle Gallery gallery preview' })).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent('Peugeot 208');
    expect(screen.getByRole('img', { name: 'Peugeot 208' })).toBeInTheDocument();
  });

  it('renders labeled chart previews for supported chart types', () => {
    const chartFiles: ProjectFile[] = [
      {
        id: 'bar-1',
        type: 'data',
        title: 'Bar Metrics',
        content: JSON.stringify({ chartType: 'bar', data: [{ name: 'Mon', value: 10 }] }),
        createdAt: '2026-03-27T09:15:00Z',
      },
      {
        id: 'pie-1',
        type: 'data',
        title: 'Pie Metrics',
        content: JSON.stringify({ chartType: 'pie', data: [{ name: 'Available', value: 5 }] }),
        createdAt: '2026-03-27T09:20:00Z',
      },
      {
        id: 'line-1',
        type: 'kpi',
        title: 'Line Metrics',
        content: JSON.stringify({ chartType: 'line', data: [{ name: 'Tue', value: 7 }] }),
        createdAt: '2026-03-27T09:25:00Z',
      },
    ];

    const barRender = renderWorkspace({
      files: chartFiles,
      canvas: {
        isOpen: true,
        activeFileId: 'bar-1',
      },
    });

    expect(screen.getByRole('region', { name: 'Bar Metrics chart preview' })).toBeInTheDocument();
    barRender.unmount();

    const pieRender = renderWorkspace({
      files: chartFiles,
      canvas: {
        isOpen: true,
        activeFileId: 'pie-1',
      },
    });

    expect(screen.getByRole('region', { name: 'Pie Metrics chart preview' })).toBeInTheDocument();
    pieRender.unmount();

    renderWorkspace({
      files: chartFiles,
      canvas: {
        isOpen: true,
        activeFileId: 'line-1',
      },
    });

    expect(screen.getByRole('region', { name: 'Line Metrics chart preview' })).toBeInTheDocument();
  });
});
