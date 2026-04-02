import type { ProjectFile, ProjectFileType } from '@/types/domain';
import { createId } from '@/lib/id';

const CANVAS_REGEX = /<canvas\s+type="([^"]+)"(?:\s+title="([^"]+)")?>([\s\S]*?)<\/canvas>/gi;
const SUPPORTED_TYPES = new Set<ProjectFileType>(['document', 'code', 'data', 'gallery', 'kpi']);

export function parseCanvasContent(text: string): { content: string; files: ProjectFile[] } {
  const files: ProjectFile[] = [];
  let nextContent = text;

  for (const match of text.matchAll(CANVAS_REGEX)) {
    const type = match[1] as ProjectFileType;
    if (!SUPPORTED_TYPES.has(type)) {
      continue;
    }

    const title = match[2] || 'Untitled';
    const content = (match[3] || '').trim();
    files.push({
      id: createId('file'),
      type,
      title,
      content,
      createdAt: new Date().toISOString(),
    });
    nextContent = nextContent.replace(match[0], `*Generated ${type}: ${title} (Added to Project)*`);
  }

  return { content: nextContent, files };
}

export async function exportProjectFiles(files: ProjectFile[]): Promise<void> {
  const [{ default: JSZip }, { saveAs }] = await Promise.all([import('jszip'), import('file-saver')]);
  const zip = new JSZip();

  files.forEach((file) => {
    zip.file(file.title, file.content);
  });

  const archive = await zip.generateAsync({ type: 'blob' });
  saveAs(archive, 'open-claw-project.zip');
}
