'use client';

import React, { useState } from 'react';
import { X, Wrench, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { soundEngine } from '@/lib/audio';

interface DevPaymentSimulatorProps {
  onClose: () => void;
  onPaymentSuccess?: (orderCode: string) => void;
}

export const DevPaymentSimulator: React.FC<DevPaymentSimulatorProps> = ({
  onClose,
  onPaymentSuccess,
}) => {
  const [provider, setProvider] = useState<'SEPAY' | 'CASSO' | 'DIRECT'>('SEPAY');
  const [orderCode, setOrderCode] = useState('MEO-8921');
  const [amount, setAmount] = useState('10000');
  const [buyerName, setBuyerName] = useState('Dev Tester');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) return;

    setIsLoading(true);
    setResultMsg(null);
    setErrorMsg(null);
    soundEngine.playKeyClick();

    const cleanCode = orderCode.trim().toUpperCase();
    const numAmount = parseInt(amount, 10) || 10000;

    let payload: Record<string, unknown> = {};

    if (provider === 'SEPAY') {
      // Chuẩn SePay webhook payload
      payload = {
        id: Math.floor(100000 + Math.random() * 900000),
        gateway: 'MBBank',
        transactionDate: new Date().toISOString(),
        accountNumber: '0987654321',
        content: `Chuyen khoan ung ho don ${cleanCode} ${buyerName}`,
        transferType: 'in',
        transferAmount: numAmount,
        accumulated: 5000000,
        referenceCode: `FT${Date.now()}`,
      };
    } else if (provider === 'CASSO') {
      // Chuẩn Casso webhook payload
      payload = {
        error: 0,
        data: [
          {
            id: Math.floor(100000 + Math.random() * 900000),
            tid: `TID_${Date.now()}`,
            description: `Nap tien ${cleanCode} ung ho meo dev`,
            amount: numAmount,
            cusum_balance: 5000000,
            when: new Date().toISOString(),
            bank_sub_acc_id: '0987654321',
          },
        ],
      };
    } else {
      // Direct
      payload = {
        orderCode: cleanCode,
        amount: numAmount,
      };
    }

    try {
      const res = await fetch('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setResultMsg(`✅ Thành công! Đơn ${cleanCode} đã được kích hoạt PAID.`);
        soundEngine.playTingTing();
        soundEngine.playMeow();
        if (onPaymentSuccess) onPaymentSuccess(cleanCode);
      } else {
        setErrorMsg(data.message || data.error || 'Giả lập thất bại');
      }
    } catch {
      setErrorMsg('Lỗi kết nối tới webhook endpoint');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-zinc-950 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden font-mono text-xs">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-950/40 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Wrench className="w-4 h-4" />
            <span>DEV PAYMENT SIMULATOR</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <form onSubmit={handleSimulate} className="p-5 space-y-4">
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Công cụ test webhook trên localhost không tốn tiền thật. Giả lập ngân hàng bắn biến động số dư trong 2-5 giây!
          </p>

          {/* Chọn Provider */}
          <div>
            <label className="block text-zinc-400 mb-1">Cổng Webhook:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['SEPAY', 'CASSO', 'DIRECT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setProvider(p)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition ${
                    provider === p
                      ? 'bg-amber-950 text-amber-300 border-amber-500 font-bold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Mã đơn */}
          <div>
            <label className="block text-zinc-400 mb-1">Mã đơn hàng cần test (MEO-XXXX):</label>
            <input
              type="text"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="VD: MEO-4829"
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-zinc-100 outline-none uppercase font-bold"
            />
          </div>

          {/* Số tiền */}
          <div>
            <label className="block text-zinc-400 mb-1">Số tiền chuyển (VNĐ):</label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {['5000', '10000', '15000', '29000'].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`py-1 rounded border text-[11px] ${
                    amount === val
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-bold'
                      : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                  }`}
                >
                  {parseInt(val, 10).toLocaleString('vi-VN')}đ
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl px-3 py-2 text-zinc-100 outline-none"
            />
          </div>

          {resultMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{resultMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !orderCode.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/40"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Bắn Webhook Ngay ({provider})</span>
          </button>
        </form>

      </div>
    </div>
  );
};
