import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DamageModule } from '@/components/modules/DamageModule';
import type { DamageAssessment, DamageReport } from '@/types/domain';

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: null | (() => void) = null;

  readAsDataURL() {
    this.result = 'data:image/jpeg;base64,ZmFrZS1kYW1hZ2U=';
    this.onloadend?.();
  }
}

const originalFileReader = globalThis.FileReader;

const damageReports: DamageReport[] = [
  {
    id: 'damage-1',
    vehicleId: 'veh-1',
    description: 'Front bumper crack',
    severity: 'high',
    estimatedRepairCost: 1200,
    photoUrls: [],
    createdAt: '2026-03-27T10:00:00Z',
  },
];

describe('DamageModule', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      writable: true,
      value: MockFileReader,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      writable: true,
      value: originalFileReader,
    });
  });

  it('shows an empty state when there are no damage reports', () => {
    render(<DamageModule damageReports={[]} onAnalyzeDamage={vi.fn()} />);

    expect(screen.getByText('No damage reports found.')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload vehicle photo for AI damage assessment')).toBeInTheDocument();
  });

  it('uploads a photo, renders the AI assessment, and clears the result', async () => {
    const onAnalyzeDamage = vi.fn<() => Promise<DamageAssessment | null>>().mockResolvedValue({
      severity: 'critical',
      estimatedRepairCost: 3400,
      description: 'Front-right panel damage with likely structural repair.',
      aiAssessment: 'Replace panel and inspect wheel alignment.',
    });

    render(<DamageModule damageReports={damageReports} onAnalyzeDamage={onAnalyzeDamage} />);

    const file = new File(['damage-photo'], 'damage.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Upload vehicle photo for AI damage assessment'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(onAnalyzeDamage).toHaveBeenCalledWith('data:image/jpeg;base64,ZmFrZS1kYW1hZ2U=');
    });

    expect(await screen.findByText('AI Assessment Result')).toBeInTheDocument();
    expect(screen.getByText('$3400')).toBeInTheDocument();
    expect(screen.getByText(/Front-right panel damage/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear AI assessment' }));

    await waitFor(() => {
      expect(screen.queryByText('AI Assessment Result')).not.toBeInTheDocument();
    });
  });
});
