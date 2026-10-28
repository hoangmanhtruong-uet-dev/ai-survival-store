'use client';

import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, Clock, Download, ArrowRight, AlertCircle, Zap, Flame, Sparkles } from 'lucide-react';
import { Order } from '@/types';
import { soundEngine } from '@/lib/audio';

interface OrderLookupProps {
  onOpenPaymentModal: (orderCode: string) => void;
  onOpenRoastCV: (code: string) => void;
  onOpenTarot: (code: string) => void;
  onOpenChemistryTutor?: (token?: string) => void;
  onOpenChemistryQuiz?: () => void;
}

export const OrderLookup: React.FC<OrderLookupProps> = ({
  onOpenPaymentModal,
  onOpenRoastCV,
  onOpenTarot,
  onOpenChemistryTutor,
  onOpenChemistryQuiz,
}) => {
  const [orderCode, setOrderCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderCode.trim().toUpperCase();
    if (!clean) return;

    soundEngine.playKeyClick();
    setIsLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/${clean}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.error || `Không tìm thấy đơn hàng ${clean}`);
      }
    } catch {
      setError('Lỗi kết nối khi tra cứu đơn');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 md:p-5 shadow-xl font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-3 mb-4">
        <div>
          <h3 className="font-mono text-sm md:text-base font-bold text-zinc-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            KHU THỰC THI DỊCH VỤ & TRA CỨU ĐƠN
          </h3>
          <p className="text-xs text-zinc-400">
            Lỡ tắt trình duyệt hoặc mất tab? Nhập mã <code className="text-emerald-400 font-bold">MEO-XXXX</code> để lấy lại link tải file hoặc mã kích hoạt dịch vụ!
          </p>
        </div>
      </div>

      {/* FORM TRA CỨU */}
      <form onSubmit={handleLookup} className="flex flex-col sm:flex-row items-center gap-2 max-w-xl">
        <input
          type="text"
          value={orderCode}
          onChange={(e) => setOrderCode(e.target.value)}
          placeholder="Nhập mã đơn, ví dụ: MEO-4829"
          className="flex-1 w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono outline-none uppercase"
        />
        <button
          type="submit"
          disabled={isLoading || !orderCode.trim()}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Tra cứu đơn</span>
        </button>
      </form>

      {/* ERROR */}
      {error && (
        <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KẾT QUẢ ĐƠN HÀNG */}
      {order && (
        <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div>
              <span className="text-zinc-500">Mã đơn: </span>
              <span className="font-bold text-emerald-400">{order.order_code}</span>
              <span className="text-zinc-400 ml-2">({order.amount.toLocaleString('vi-VN')}đ)</span>
            </div>

            <div className="flex items-center gap-1.5">
              {order.status === 'PAID' ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" />
                  ĐÃ THANH TOÁN
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-400 font-bold flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3" />
                  CHỜ THANH TOÁN
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-zinc-300">
              Gói dịch vụ: <strong className="text-zinc-100">{order.product?.name || order.product_id}</strong>
            </div>

            {/* ACTION TÙY THEO TRẠNG THÁI */}
            {order.status === 'PAID' ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {order.product_id === 'ROAST-10' && (
                  <button
                    onClick={() => onOpenRoastCV(order.redeem_code || 'RCV-4829')}
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <span>Mở phòng Sấy CV ({order.redeem_code})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {order.product_id === 'TAROT-10' && (
                  <button
                    onClick={() => onOpenTarot(order.redeem_code || 'TRT-1088')}
                    className="w-full sm:w-auto px-4 py-2 bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <span>Mở quẻ bói Tarot</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {order.product?.type === 'R2_FILE' && (
                  <a
                    href={`/api/download?code=${order.order_code}&key=${order.product.r2_file_key}`}
                    download
                    className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition flex items-center justify-center gap-1.5 text-center"
                  >
                    <Download className="w-3.5 h-3.5 inline" />
                    <span>Tải File Đã Mua</span>
                  </a>
                )}

                {order.product?.type === 'GDRIVE_ACCESS' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={order.redeem_code || 'https://drive.google.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition flex items-center justify-center gap-1.5 text-center"
                    >
                      <Download className="w-3.5 h-3.5 inline" />
                      <span>Mở Thư Mục Google Drive</span>
                    </a>
                    {order.product_id === 'CHEM-149' && onOpenChemistryTutor && (
                      <button
                        onClick={() =>
                          onOpenChemistryTutor(
                            ((order.ai_result as Record<string, unknown>)?.tutor_token as string) ||
                            `CHM-${order.order_code.replace('MEO-', '')}`
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                      >
                        <span>Mở Trợ Giảng AI</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {(order.product_id === 'CUSTOM-TASK' || order.product?.type === 'CUSTOM_TASK') && (
                  <div className="w-full space-y-2">
                    {order.is_redeemed && (order.ai_result as Record<string, unknown>)?.solution_markdown ? (
                      <div className="p-3 bg-zinc-900 border border-emerald-500/40 rounded-xl space-y-2">
                        <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mèo Dev đã cày xong task của bạn:</span>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-2.5 bg-zinc-950 rounded border border-zinc-800 text-[11px] text-zinc-300 font-mono whitespace-pre-wrap">
                          {((order.ai_result as Record<string, unknown>)?.solution_markdown as string)}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin shrink-0" />
                        <span>Mèo Dev trên VPS đang cày code giải pháp cho bạn (tự động trả hàng trong vài phút)...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenPaymentModal(order.order_code)}
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <span>Mở lại mã QR để thanh toán</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
