import * as logger from 'firebase-functions/logger';
import type { DamageAssessment, GroundingMetadata } from './types';

export function getResponseText(response: unknown): string {
  if (response && typeof response === 'object' && 'text' in response && typeof response.text === 'string') {
    return response.text;
  }

  return '';
}

export function getGroundingMetadata(response: unknown): GroundingMetadata | undefined {
  if (
    response &&
    typeof response === 'object' &&
    'candidates' in response &&
    Array.isArray(response.candidates) &&
    response.candidates[0] &&
    typeof response.candidates[0] === 'object' &&
    'groundingMetadata' in response.candidates[0] &&
    response.candidates[0].groundingMetadata &&
    typeof response.candidates[0].groundingMetadata === 'object'
  ) {
    return response.candidates[0].groundingMetadata as GroundingMetadata;
  }

  return undefined;
}

export function getAudioInlineData(response: unknown): string | undefined {
  if (response && typeof response === 'object' && 'candidates' in response && Array.isArray(response.candidates)) {
    const firstCandidate = response.candidates[0];
    const parts =
      firstCandidate &&
      typeof firstCandidate === 'object' &&
      'content' in firstCandidate &&
      firstCandidate.content &&
      typeof firstCandidate.content === 'object' &&
      'parts' in firstCandidate.content &&
      Array.isArray(firstCandidate.content.parts)
        ? firstCandidate.content.parts
        : [];

    const inlinePart = parts.find(
      (part: unknown) =>
        part &&
        typeof part === 'object' &&
        'inlineData' in part &&
        part.inlineData &&
        typeof part.inlineData === 'object' &&
        'data' in part.inlineData &&
        typeof part.inlineData.data === 'string',
    );

    if (inlinePart && typeof inlinePart === 'object' && 'inlineData' in inlinePart) {
      return (inlinePart.inlineData as { data: string }).data;
    }
  }

  return undefined;
}

export function parseDamageAssessment(value: string): DamageAssessment | null {
  try {
    const parsed = JSON.parse(value) as Partial<DamageAssessment>;
    if (
      parsed.severity &&
      ['low', 'medium', 'high', 'critical'].includes(parsed.severity) &&
      typeof parsed.estimatedRepairCost === 'number' &&
      typeof parsed.description === 'string' &&
      typeof parsed.aiAssessment === 'string'
    ) {
      return {
        severity: parsed.severity,
        estimatedRepairCost: parsed.estimatedRepairCost,
        description: parsed.description,
        aiAssessment: parsed.aiAssessment,
      };
    }
  } catch (error) {
    logger.warn('Failed to parse damage assessment JSON.', { error });
  }

  return null;
}
