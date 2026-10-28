import { GoogleGenAI } from '@google/genai';
import { DAEMON_CONFIG } from '../config';

let aiInstance: GoogleGenAI | null = null;

export function getDaemonGemini(): GoogleGenAI {
  if (!aiInstance) {
    if (!DAEMON_CONFIG.geminiApiKey) {
      throw new Error('Thiếu GEMINI_API_KEY trong .env.local');
    }
    aiInstance = new GoogleGenAI({ apiKey: DAEMON_CONFIG.geminiApiKey });
  }
  return aiInstance;
}

export async function askGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const ai = getDaemonGemini();
  const contents = [{ parts: [{ text: prompt }] }];

  const response = await ai.models.generateContent({
    model: DAEMON_CONFIG.geminiModel,
    contents,
    config: systemInstruction ? { systemInstruction } : undefined,
  });

  return response.text || '';
}

