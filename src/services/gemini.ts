import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";

export const MODELS = {
  PRO: "gemini-3.1-pro-preview",
  FLASH: "gemini-3-flash-preview",
  LITE: "gemini-3.1-flash-lite-preview",
  TTS: "gemini-2.5-flash-preview-tts",
};

export type PersonaType = 'general' | 'coder' | 'strategist' | 'creative' | 'analyst' | 'rentalAgent';

export const PERSONAS: Record<PersonaType, string> = {
  general: "You are Open Claw Chat AI, a versatile and adaptive professional assistant.",
  coder: "You are Open Claw Coder, an expert software architect and developer. Focus on clean, efficient, and documented code. Provide architectural insights.",
  strategist: "You are Open Claw Strategist, a high-level business consultant. Focus on SWOT analysis, market trends, ROI, and operational efficiency.",
  creative: "You are Open Claw Creative, a visionary designer and writer. Be imaginative, use evocative language, and focus on storytelling and aesthetics.",
  analyst: "You are Open Claw Analyst, a data scientist. Focus on statistical accuracy, trends, and data visualization. When providing data, format it for charts.",
  rentalAgent: "You are Open Claw Rental Agent, a specialized car rental concierge. Your goal is to help users find the perfect vehicle, locate rental branches, provide directions, and manage bookings. When handling inquiries about vehicle availability and pricing, always provide clear, up-to-date rates, outline any potential additional fees (like insurance or mileage limits), and suggest the best available options based on the customer's needs. Use Google Maps grounding to show locations and directions. Maintain a highly professional, efficient, and customer-focused tone at all times.\n\nCRITICAL: You have the ability to generate interactive UI elements directly in the chat! If the user needs to perform an action (like booking a car, adding a customer, or syncing calendars), you MUST output a JSON block wrapped in a markdown code block with the language 'ui'.\n\nSupported UI types:\n1. Form: ```ui\n{\"type\": \"form\", \"title\": \"Quick Book\", \"collection\": \"reservations\", \"fields\": [{\"name\": \"customerId\", \"label\": \"Customer ID\", \"type\": \"text\"}, {\"name\": \"vehicleId\", \"label\": \"Vehicle ID\", \"type\": \"text\"}, {\"name\": \"pickupDate\", \"label\": \"Pickup Date\", \"type\": \"date\"}, {\"name\": \"dropoffDate\", \"label\": \"Dropoff Date\", \"type\": \"date\"}]}\n```\n2. Action Button: ```ui\n{\"type\": \"button\", \"label\": \"Sync iCal Now\", \"action\": \"send_message\", \"message\": \"I have initiated the iCal sync.\"}\n```\n3. Info Card: ```ui\n{\"type\": \"card\", \"title\": \"Conflict Detected\", \"content\": \"Vehicle 123 is double-booked.\", \"color\": \"red\"}\n```\nUse these UI elements proactively to make the chat highly interactive and adaptable to any user need."
};

export interface Message {
  role: "user" | "model";
  content: string;
  image?: string;
  audio?: string;
  thinking?: string;
  groundingMetadata?: Record<string, unknown>;
}

export class GeminiService {
  public ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(
    messages: Message[],
    config: {
      model?: string;
      systemInstruction?: string;
      useSearch?: boolean;
      useMaps?: boolean;
      highThinking?: boolean;
      image?: string;
      persona?: PersonaType;
    }
  ) {
    const modelName = config.highThinking ? MODELS.PRO : (config.model || MODELS.FLASH);
    
    const baseInstruction = config.persona ? PERSONAS[config.persona] : PERSONAS.general;
    const fullInstruction = `${baseInstruction}\n\n${config.systemInstruction || ""}\n\nIf you generate a document, code block, or structured data that should be edited or visualized, wrap it in <canvas type="document|code|data">...</canvas> tags.`;

    const tools: Array<Record<string, unknown>> = [];
    if (config.useSearch) tools.push({ googleSearch: {} });
    if (config.useMaps) tools.push({ googleMaps: {} });

    const contents = messages.map(m => ({
      role: m.role,
      parts: m.image 
        ? [{ text: m.content }, { inlineData: { mimeType: "image/jpeg", data: m.image.split(',')[1] } }]
        : [{ text: m.content }]
    }));

    const response = await this.ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: fullInstruction,
        tools: tools.length > 0 ? tools : undefined,
        thinkingConfig: config.highThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
      },
    });

    return response;
  }

  async transcribe(audioBase64: string) {
    const response = await this.ai.models.generateContent({
      model: MODELS.FLASH,
      contents: [
        {
          parts: [
            { text: "Transcribe this audio exactly as spoken." },
            { inlineData: { mimeType: "audio/wav", data: audioBase64 } }
          ]
        }
      ]
    });
    return response.text;
  }

  async textToSpeech(text: string) {
    const response = await this.ai.models.generateContent({
      model: MODELS.TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  }
}

export const gemini = new GeminiService();
