import type { CallableRequest } from 'firebase-functions/v2/https';
import { HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getGeminiClient, PERSONA_PROMPTS } from './gemini';
import {
  buildChatContents,
  normalizeModel,
  normalizePersona,
  requireAuth,
  requireNonEmptyString,
  toRecord,
} from './request';
import { getAudioInlineData, getGroundingMetadata, getResponseText, parseDamageAssessment } from './response';
import type { ChatConfig } from './types';
import { validateChatMessages } from './request';
import { enforceRateLimit } from './rateLimit';
import { recordUsage } from './usage';
import { writeAuditLog } from './audit';

function logAndThrow(uid: string, message: string, error: unknown): never {
  logger.error(message, { uid, error });
  throw new HttpsError('internal', message);
}

export async function handleChatWithGemini(request: CallableRequest<unknown>) {
  const uid = requireAuth(request.auth);
  await enforceRateLimit(uid, 'chatWithGemini');
  const data = toRecord(request.data);
  const messages = validateChatMessages(data.messages);
  const config = toRecord(data.config) as ChatConfig;
  const persona = normalizePersona(config.persona);
  const model = normalizeModel(config.model, config.highThinking === true);
  const tools = [
    ...(config.useSearch ? [{ googleSearch: {} }] : []),
    ...(config.useMaps ? [{ googleMaps: {} }] : []),
  ];

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model,
      contents: buildChatContents(messages),
      config: {
        systemInstruction: [config.systemInstruction, PERSONA_PROMPTS[persona]].filter(Boolean).join('\n\n'),
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    await recordUsage(uid, 'chatWithGemini');
    await writeAuditLog({ uid, action: 'chat', collection: 'gemini', details: { persona, model } });

    return {
      text: getResponseText(response),
      groundingMetadata: getGroundingMetadata(response),
    };
  } catch (error) {
    return logAndThrow(uid, 'Gemini chat request failed.', error);
  }
}

export async function handleTranscribeAudio(request: CallableRequest<unknown>) {
  const uid = requireAuth(request.auth);
  await enforceRateLimit(uid, 'transcribeAudio');
  const data = toRecord(request.data);
  const audioBase64 = requireNonEmptyString(data.audioBase64, 'audioBase64');

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Transcribe this audio exactly as spoken.' },
            { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
          ],
        },
      ],
    });

    await recordUsage(uid, 'transcribeAudio');
    await writeAuditLog({ uid, action: 'transcribe', collection: 'gemini' });

    return {
      text: getResponseText(response),
    };
  } catch (error) {
    return logAndThrow(uid, 'Audio transcription failed.', error);
  }
}

export async function handleTextToSpeech(request: CallableRequest<unknown>) {
  const uid = requireAuth(request.auth);
  await enforceRateLimit(uid, 'textToSpeech');
  const data = toRecord(request.data);
  const text = requireNonEmptyString(data.text, 'text');

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore',
            },
          },
        },
      },
    });

    await recordUsage(uid, 'textToSpeech');
    await writeAuditLog({ uid, action: 'tts', collection: 'gemini' });

    return {
      audioBase64: getAudioInlineData(response),
    };
  } catch (error) {
    return logAndThrow(uid, 'Text-to-speech generation failed.', error);
  }
}

export async function handleAnalyzeDamageImage(request: CallableRequest<unknown>) {
  const uid = requireAuth(request.auth);
  await enforceRateLimit(uid, 'analyzeDamageImage');
  const data = toRecord(request.data);
  const imageBase64 = requireNonEmptyString(data.imageBase64, 'imageBase64');

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Analyze this car damage image. Return JSON with severity (low|medium|high|critical), estimatedRepairCost (number), description (string), and aiAssessment (string).',
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    await recordUsage(uid, 'analyzeDamageImage');
    await writeAuditLog({ uid, action: 'analyzeDamage', collection: 'gemini' });

    return {
      assessment: parseDamageAssessment(getResponseText(response)),
    };
  } catch (error) {
    return logAndThrow(uid, 'Damage analysis failed.', error);
  }
}
