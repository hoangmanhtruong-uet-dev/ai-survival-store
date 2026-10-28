'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, Moon, Eye } from 'lucide-react';
import { soundEngine } from '@/lib/audio';

interface TarotModalProps {
  initialCode?: string;
  onClose: () => void;
}

export const TarotModal: React.FC<TarotModalProps> = ({ initialCode = '', onClose }) => {
  const [redeemCode, setRedeemCode] = useState(initialCode || 'TRT-');
  const [question, setQuestion] = useState('Chừng nào tao mới hết kiếp FA và giàu có?');
  const [birthDate, setBirthDate] = useState('2002-08-15');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    drawnCards: Array<{ name: string; vi: string; meaning: string }>;
    reading: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Vui lòng nhập câu hỏi của bạn');
      return;
    }

    setError(null);
    setIsLoading(true);
    soundEngine.playKeyClick();

    try {
      const res = await fetch('/api/services/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redeemCode: redeemCode.trim().toUpperCase(),
          question,
          birthDate,
        }),
      });

      const data = await res.json();
      if (data.success && data.reading) {
        setResult({
          drawnCards: data.drawnCards,
          reading: data.reading,
        });
        soundEngine.playMeow();
      } else {
        setError(data.error || 'Có lỗi xảy ra khi bốc quẻ');
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-950 text-purple-400 border border-purple-800">
              <Moon className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                THẦY MÈO BÓI QUẺ TÂM LINH
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Bốc 3 lá bài • Luận giải tình duyên, sự nghiệp & deadline
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          
          {result ? (
            <div className="space-y-4 animate-in fade-in">
              {/* 3 Lá Bài Hiện Ra */}
              <div className="grid grid-cols-3 gap-2">
                {result.drawnCards.map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-b from-purple-950/80 to-zinc-900 border border-purple-700/50 rounded-xl p-3 text-center space-y-1 shadow-lg"
                  >
                    <div className="text-2xl mb-1">🎴</div>
                    <div className="text-[11px] font-bold font-mono text-purple-300 truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {c.vi}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lời Luận Giải */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                {result.reading}
              </div>

              <button
                onClick={() => setResult(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs transition"
              >
                Bốc quẻ cho câu hỏi khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleDraw} className="space-y-4">
              
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                  Mã kích hoạt quẻ (Mã TRT-XXXX nhận được sau khi trả tiền):
                </label>
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Ví dụ: TRT-1088"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                    Câu hỏi tâm sự với Mèo:
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="VD: Bao giờ crush mới chịu rep tin nhắn?"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                    Ngày sinh của bạn:
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none font-mono"
                  />
                </div>
              </div>

              {/* 3 Lá Bài Úp Lưng Huyền Bí */}
              <div className="flex items-center justify-center gap-3 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-20 h-28 rounded-xl bg-gradient-to-br from-purple-900/60 to-zinc-900 border-2 border-purple-500/40 flex flex-col items-center justify-center p-2 text-center shadow-lg transition-transform hover:-translate-y-1"
                  >
                    <Eye className="w-5 h-5 text-purple-400 mb-1 animate-pulse" />
                    <span className="text-[10px] font-mono text-purple-300">Lá {i}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 font-mono">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-950/50 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thầy Mèo đang xáo bài cầu cơ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Lật Bài & Luận Quẻ Ngay</span>
                  </>
                )}
              </button>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
