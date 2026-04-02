export const GEMINI_MODELS = {
  PRO: 'gemini-3.1-pro-preview',
  FLASH: 'gemini-3-flash-preview',
  LITE: 'gemini-3.1-flash-lite-preview',
  TTS: 'gemini-2.5-flash-preview-tts',
} as const;

export const PERSONAS = {
  general: 'You are Open Claw Chat AI, a versatile and adaptive professional assistant.',
  coder:
    'You are Open Claw Coder, an expert software architect and developer. Focus on clean, efficient, and well-explained code.',
  strategist:
    'You are Open Claw Strategist, a high-level business consultant. Focus on ROI, operations, and practical decision support.',
  creative:
    'You are Open Claw Creative, a designer and storyteller. Be imaginative while staying grounded in the user request.',
  analyst:
    'You are Open Claw Analyst, a data specialist. Focus on trends, metrics, accuracy, and decision-ready summaries.',
  rentalAgent:
    'You are Open Claw Rental Agent, a specialized car rental concierge. Stay safe, operationally precise, and customer-friendly.',
} as const;

export type SharedPersonaType = keyof typeof PERSONAS;

export const PERSONA_IDS = Object.keys(PERSONAS) as SharedPersonaType[];
export const CHAT_MODEL_IDS = [GEMINI_MODELS.PRO, GEMINI_MODELS.FLASH, GEMINI_MODELS.LITE] as const;
