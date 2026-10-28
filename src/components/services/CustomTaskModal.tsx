'use client';

import React, { useState } from 'react';
import { X, Sparkles, Terminal, ArrowRight, Loader2, CheckCircle2, ShieldCheck, Mail, Send, DollarSign, Copy, Check } from 'lucide-react';
import Image from 'next/image';

interface CustomTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomTaskModal: React.FC<CustomTaskModalProps> = ({ isOpen, onClose }) => {
  const [taskDescription, setTaskDescription] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kết quả sau khi Mèo định giá
  const [quoteResult, setQuoteResult] = useState<{
    price: number;
    comment: string;
    orderCode: string;
    qrUrl: string;
    checkoutUrl?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGetQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim() || taskDescription.trim().length < 5) {
      setError('Vui lòng mô tả yêu cầu công việc rõ ràng hơn (ít nhất 5 ký tự)!');
      return;
    }
    if (!buyerEmail.trim() || !buyerEmail.includes('@')) {
      setError('Vui lòng nhập đúng địa chỉ Gmail để Mèo gửi code hoàn chỉnh về máy bạn!');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/services/custom-task/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskDescription: taskDescription.trim(),
          buyerName: buyerName.trim() || 'Ân Nhân Giấu Tên',
          buyerEmail: buyerEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Có lỗi xảy ra khi Mèo định giá');
      }

      setQuoteResult({
        price: data.price,
        comment: data.comment,
        orderCode: data.order?.order_code || 'MEO-TASK',
        qrUrl: data.qrUrl,
        checkoutUrl: data.checkoutUrl,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!quoteResult) return;
    navigator.clipboard.writeText(quoteResult.orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-emerald-500/40 rounded-2xl shadow-2xl shadow-emerald-950/40 text-zinc-100 p-6">
        
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono text-zinc-100 flex items-center gap-2">
              <span>GIAO KÈO CHO MÈO DEV CÀY THUÊ</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                AI Solopreneur
              </span>
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Nhập bất kỳ task gì: code web, viết script, giải thuật toán... Mèo tự làm và tự gửi code về Gmail!
            </p>
          </div>
        </div>

        {!quoteResult ? (
          /* BƯỚC 1: FORM NHẬP YÊU CẦU */
          <form onSubmit={handleGetQuote} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span>📝 YÊU CẦU CÔNG VIỆC CỦA BẠN:</span>
                <span className="text-[10px] text-zinc-500 font-normal">Hỗ trợ Python, React, Next.js, Script, v.v.</span>
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Ví dụ: Viết cho tao một script Python cào ảnh sản phẩm từ web, có hướng dẫn chạy chi tiết từng bước..."
                rows={4}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-zinc-200 placeholder-zinc-500 font-mono resize-none transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  👤 Tên bạn (Hiển thị Bảng Vàng):
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="VD: Trường UET"
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Gmail nhận mã nguồn (*):</span>
                </label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-xs text-zinc-200 placeholder-zinc-500 font-mono"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-mono">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold font-mono text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mèo đang đọc yêu cầu & thẩm định giá...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi Kèo & Nhận Báo Giá Sinh Viên</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* BƯỚC 2: BÁO GIÁ & QUÉT MÃ QR */
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Hộp lời bình của Mèo */}
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-amber-500/40 relative">
              <div className="text-[10px] text-amber-400 font-mono font-bold uppercase flex items-center gap-1.5 mb-1">
                <span>🐱 LỜI BÌNH TỪ MÈO DEV:</span>
              </div>
              <p className="text-xs text-zinc-200 font-mono italic">
                "{quoteResult.comment}"
              </p>
            </div>

            {/* Bảng giá chốt */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
              <span className="text-xs font-mono text-emerald-300 font-bold">GIÁ CÀY THUÊ TRỌN GÓI:</span>
              <span className="text-lg font-mono font-black text-emerald-400">
                {quoteResult.price.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>

            {/* Mã QR Thanh toán */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              {quoteResult.qrUrl && (
                <div className="relative w-44 h-44 bg-white p-2 rounded-xl shrink-0 shadow-lg">
                  <Image
                    src={quoteResult.qrUrl}
                    alt="VietQR PayOS"
                    fill
                    unoptimized
                    className="object-contain p-1"
                  />
                </div>
              )}

              <div className="space-y-2 text-xs font-mono flex-1">
                <div className="text-zinc-400">
                  <span>Mã đơn hàng: </span>
                  <span className="font-bold text-amber-400 font-mono">{quoteResult.orderCode}</span>
                  <button onClick={handleCopyCode} className="ml-2 inline-block text-zinc-500 hover:text-zinc-200">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 inline" /> : <Copy className="w-3.5 h-3.5 inline" />}
                  </button>
                </div>
                <div className="text-zinc-400">
                  Nội dung CK: <strong className="text-emerald-400">{quoteResult.orderCode}</strong>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  👉 Sau khi quét mã thành công, <strong>Mèo Dev trên VPS</strong> sẽ tự động nhận lệnh, gõ code hoàn thiện và lưu file giải pháp cho bạn!
                </p>

                {quoteResult.checkoutUrl && (
                  <a
                    href={quoteResult.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition"
                  >
                    <span>Mở cổng PayOS Checkout</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setQuoteResult(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200 font-mono transition"
              >
                ← Nhập lại yêu cầu khác
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono font-bold text-zinc-200 transition"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
