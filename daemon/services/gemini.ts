import { GoogleGenAI } from '@google/genai';
import { DAEMON_CONFIG } from '../config';
import fs from 'fs';
import path from 'path';

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

function getDaemonKeys(): string[] {
  const raw = DAEMON_CONFIG.geminiApiKey || '';
  return raw.split(/[,;\n]/).map((k) => k.trim()).filter((k) => k.length > 5);
}

let daemonKeyIndex = 0;

export function getDaemonGemini(): GoogleGenAI {
  const keys = getDaemonKeys();
  if (keys.length === 0) {
    throw new Error('Thiếu GEMINI_API_KEY trong .env.local');
  }
  const key = keys[daemonKeyIndex % keys.length];
  return new GoogleGenAI({ apiKey: key });
}

export function rotateDaemonKey(): void {
  const keys = getDaemonKeys();
  if (keys.length > 1) {
    daemonKeyIndex = (daemonKeyIndex + 1) % keys.length;
    console.log(`🔑 [DAEMON KEY ROTATION] Chuyển sang Gemini API Key #${daemonKeyIndex + 1}/${keys.length}`);
  }
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

