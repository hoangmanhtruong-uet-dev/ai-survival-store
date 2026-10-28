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

export async function askGemini(prompt: string, customInstruction?: string, retryCount = 0): Promise<string> {
  const keys = getDaemonKeys();
  const maxRetries = Math.max(1, keys.length);

  try {
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
  } catch (err) {
    const isRateLimit = String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED');
    if (isRateLimit && retryCount < maxRetries) {
      console.warn(`⚠️ [GEMINI 429] Key hiện tại chạm hạn mức quota. Tự động xoay tua sang key tiếp theo (${retryCount + 1}/${maxRetries})...`);
      rotateDaemonKey();
      return askGemini(prompt, customInstruction, retryCount + 1);
    }
    throw err;
  }
}

/**
 * Gọi Gemini có tích hợp Google Search Grounding để tra cứu thông tin thời gian thực
 */
export async function askGeminiWithSearch(
  prompt: string,
  customInstruction?: string,
  retryCount = 0
): Promise<{ text: string; sources?: unknown[] }> {
  const keys = getDaemonKeys();
  const maxRetries = Math.max(1, keys.length);

  try {
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
      config: {
        systemInstruction: fullInstruction || undefined,
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || '',
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    };
  } catch (err) {
    const isRateLimit = String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED');
    if (isRateLimit && retryCount < maxRetries) {
      console.warn(`⚠️ [SEARCH GROUNDING 429] Key chạm hạn mức. Xoay tua sang key dự phòng (${retryCount + 1}/${maxRetries})...`);
      rotateDaemonKey();
      return askGeminiWithSearch(prompt, customInstruction, retryCount + 1);
    }

    console.warn('⚠️ Google Search Grounding gặp sự cố, tự động fallback sang Gemini tiêu chuẩn:', (err as Error).message);
    const fallbackText = await askGemini(prompt, customInstruction);
    return { text: fallbackText };
  }
}

