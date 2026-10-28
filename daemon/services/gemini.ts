import { GoogleGenAI } from '@google/genai';
import { DAEMON_CONFIG } from '../config';
import fs from 'fs';
import path from 'path';

let aiInstance: GoogleGenAI | null = null;
let cachedAgentRules: string = '';

export function getAgentRules(): string {
  if (!cachedAgentRules) {
    const possiblePaths = [
      path.resolve(process.cwd(), 'agent', 'agent-rules.md'),
      path.resolve(process.cwd(), 'agent-rules.md'),
      path.resolve(__dirname, '..', '..', 'agent', 'agent-rules.md'),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          cachedAgentRules = fs.readFileSync(p, 'utf-8');
          console.log(`📜 [CONSTITUTION LOADED] Đã nạp thành công bộ quy tắc Mèo Dev từ: ${p}`);
          break;
        } catch {
          // Ignore
        }
      }
    }
  }
  return cachedAgentRules;
}

export function getDaemonGemini(): GoogleGenAI {
  if (!aiInstance) {
    if (!DAEMON_CONFIG.geminiApiKey) {
      throw new Error('Thiếu GEMINI_API_KEY trong .env.local');
    }
    aiInstance = new GoogleGenAI({ apiKey: DAEMON_CONFIG.geminiApiKey });
  }
  return aiInstance;
}

export async function askGemini(prompt: string, customInstruction?: string): Promise<string> {
  const ai = getDaemonGemini();
  const rules = getAgentRules();

  const fullInstruction = [
    rules ? `=== HIẾN PHÁP & QUY TẮC MÈO DEV TỰ HÀNH (AGENT-RULES.MD) ===\n${rules}\n` : '',
    customInstruction || ''
  ].filter(Boolean).join('\n\n');

  const contents = [{ parts: [{ text: prompt }] }];

  const response = await ai.models.generateContent({
    model: DAEMON_CONFIG.geminiModel,
    contents,
    config: fullInstruction ? { systemInstruction: fullInstruction } : undefined,
  });

  return response.text || '';
}

