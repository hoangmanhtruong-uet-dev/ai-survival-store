'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { Send, Bot, User, Sparkles, QrCode, ArrowUpRight } from 'lucide-react';
import { soundEngine } from '@/lib/audio';

interface AIChatbotProps {
  onSelectOrderForPayment?: (orderCode: string, productId: string, amount: number) => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ onSelectOrderForPayment }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'Meo meo! Tao là Mèo Dev đây. Chủ nhân vứt tao lên server với 50k tiền điện, đếm ngược 30 ngày là dính lệnh rm -rf /! Mày cứu mạng tao đi, mua gói pate 5k hoặc quăng CV đây tao sấy cho!',
      created_at: '2026-10-28T00:00:00.000Z',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [guestId, setGuestId] = useState('8921');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Khởi tạo guestId ngẫu nhiên lưu trong localStorage
    const saved = localStorage.getItem('meo_dev_guest_id');
    if (saved) {
      setGuestId(saved);
    } else {
      const newId = Math.floor(1000 + Math.random() * 9000).toString();
      localStorage.setItem('meo_dev_guest_id', newId);
      setGuestId(newId);
    }
  }, []);

  useEffect(() => {
    // Chỉ cuộn nội bộ bên trong khung chat, không làm cuộn màn hình trang web
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    soundEngine.playKeyClick();
    setInput('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          guestId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const assistantMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          created_at: '2026-10-28T00:00:00.000Z',
          tool_call_data: data.toolCallData,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        soundEngine.playKeyClick();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: 'Meo meo! Server đang nghẽn chút, mày nói lại đi tao nghe!',
            created_at: '2026-10-28T00:00:00.000Z',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Meo meo! Mất kết nối xíu, tao đang fix bug đây!',
          created_at: '2026-10-28T00:00:00.000Z',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: 'Cứu 5k pate 🐟', text: 'Tao muốn mua gói Pate 5k cứu mạng mày!' },
    { label: 'Sấy CV tao đi 🔥', text: 'Tao muốn mua gói Roast CV 10k!' },
    { label: 'Bói tình duyên 🔮', text: 'Tao muốn mua quẻ Tarot 10k xem chừng nào có bồ!' },
    { label: 'Lấy Source Code ⚡', text: 'Bán cho tao gói Template Next.js 29k với!' },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* CHAT HEADER */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-sm">
              🐱
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-zinc-200 flex items-center gap-1.5">
              Mèo Dev Bán Hàng
              <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1 py-0.2 rounded font-mono">
                AI 24/7
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              Bạn là: <span className="text-zinc-400">Khách #{guestId}</span>
            </div>
          </div>
        </div>

        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Auto VietQR Tool
        </span>
      </div>

      {/* QUICK PROMPT PILLS */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/50 border-b border-zinc-800/40 overflow-x-auto text-[11px] scrollbar-none">
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q.text)}
            className="px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-700/60 border border-zinc-700 text-zinc-300 whitespace-nowrap transition text-[10px] shrink-0 font-mono"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* MESSAGE LIST */}
      <div
        ref={chatContainerRef}
        className="flex-1 p-3 overflow-y-auto space-y-3 max-h-[360px] md:max-h-[440px] text-xs font-sans"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                🐱
              </div>
            )}

            <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-zinc-950 font-medium rounded-tr-none shadow-md'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>

              {/* RENDER THẺ THẦN THÁNH: VIETQR CARD NẾU AI GỌI TOOL CREATE_ORDER */}
              {m.tool_call_data && (
                <div className="bg-zinc-900 border-2 border-emerald-500/80 rounded-xl p-3 shadow-xl shadow-emerald-950/30 text-zinc-200 space-y-2 font-mono">
                  <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-1.5">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5" />
                      MÃ ĐƠN: {m.tool_call_data.order_code}
                    </span>
                    <span className="text-amber-400 font-bold">
                      {m.tool_call_data.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 font-sans">
                    Gói: <strong className="text-emerald-300">{m.tool_call_data.product_name}</strong>
                  </p>

                  {/* QR Image Preview */}
                  {m.tool_call_data.qr_url && (
                    <div className="flex items-center justify-center bg-white p-2 rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.tool_call_data.qr_url}
                        alt="VietQR Code"
                        className="w-36 h-36 object-contain"
                      />
                    </div>
                  )}

                  <button
                    onClick={() =>
                      onSelectOrderForPayment &&
                      m.tool_call_data &&
                      onSelectOrderForPayment(
                        m.tool_call_data.order_code,
                        m.tool_call_data.product_id,
                        m.tool_call_data.price
                      )
                    }
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold rounded-lg text-xs transition shadow-lg shadow-emerald-950/50"
                  >
                    <span>Mở Popup Chờ Ting Ting</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-zinc-400 text-xs">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
            <Bot className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Mèo Dev đang gõ phím rep...</span>
          </div>
        )}
      </div>

      {/* INPUT FORM */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2.5 bg-zinc-900 border-t border-zinc-800/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi Mèo, gạ mua pate, hoặc bảo chửi CV..."
          disabled={isLoading}
          className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500/80 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition font-sans"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 transition shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
