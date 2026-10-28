'use client';

import React, { useState, useEffect } from 'react';
import { Product, Order } from '@/types';
import { X, Copy, Check, Loader2, Sparkles, Download, ArrowRight, ShieldCheck, Heart, Award, ExternalLink } from 'lucide-react';
import { generateVietQRUrl, getBankConfig } from '@/lib/vietqr';
import { soundEngine } from '@/lib/audio';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  product: Product | null;
  initialOrderCode?: string;
  onClose: () => void;
  onOpenRoastCV?: (code: string) => void;
  onOpenTarot?: (code: string) => void;
  onOpenCertificate?: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  product,
  initialOrderCode,
  onClose,
  onOpenRoastCV,
  onOpenTarot,
  onOpenCertificate,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const bankConfig = getBankConfig();

  // Khởi tạo đơn hàng khi mở modal
  useEffect(() => {
    let active = true;

    async function initOrder() {
      if (initialOrderCode) {
        // Tra cứu đơn có sẵn
        try {
          const res = await fetch(`/api/orders/${initialOrderCode}`);
          const data = await res.json();
          if (active && data.success && data.order) {
            setOrder(data.order);
            if (data.checkoutUrl) {
              setCheckoutUrl(data.checkoutUrl);
            }
          }
        } catch {
          // Ignore
        }
      } else if (product && !order && !isCreatingOrder) {
        // Tạo đơn hàng mới
        setIsCreatingOrder(true);
        try {
          const res = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              buyerName: buyerName || 'Ân nhân giấu tên',
              buyerNote: buyerNote || '',
            }),
          });
          const data = await res.json();
          if (active && data.success && data.order) {
            setOrder(data.order);
            if (data.checkoutUrl) {
              setCheckoutUrl(data.checkoutUrl);
            }
          }
        } catch {
          // Ignore
        } finally {
          if (active) setIsCreatingOrder(false);
        }
      }
    }

    initOrder();
    return () => {
      active = false;
    };
  }, [product, initialOrderCode]);

  // Lắng nghe trạng thái thanh toán (Polling mỗi 2 giây)
  useEffect(() => {
    if (!order || order.status === 'PAID') return;

    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.order_code}`);
        const data = await res.json();
        if (data.success && data.order && data.order.status === 'PAID') {
          setOrder(data.order);
          setIsPolling(false);
          // Âm thanh và hiệu ứng ăn mừng
          soundEngine.playTingTing();
          soundEngine.playNomNom();
          soundEngine.playMeow();
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
          clearInterval(interval);
        }
      } catch {
        // Polling retry
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [order?.order_code, order?.status]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    soundEngine.playKeyClick();
    setTimeout(() => setCopiedField(null), 1800);
  };

  if (!product && !order) return null;

  const currentProduct = order?.product || product;
  const isPaid = order?.status === 'PAID';
  const qrUrl = order ? generateVietQRUrl(order.amount, order.order_code) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentProduct?.icon || '🐱'}</span>
            <div>
              <h3 className="font-mono text-sm font-bold text-zinc-100 flex items-center gap-2">
                {isPaid ? 'THANH TOÁN THÀNH CÔNG!' : 'THANH TOÁN VIETQR'}
                {order && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                    {order.order_code}
                  </span>
                )}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          
          {/* TRƯỜNG HỢP 1: ĐÃ THANH TOÁN THÀNH CÔNG (GIAO HÀNG TỨC THÌ) */}
          {isPaid ? (
            <div className="text-center space-y-4 py-2 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-900/50 animate-bounce">
                🎉
              </div>

              <div>
                <h4 className="text-lg font-bold font-mono text-emerald-400">
                  TING TING! MÈO ĐÃ NHẬN TIỀN!
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Mèo Dev được cộng điểm no bụng và thoát khỏi nguy cơ bị <code className="text-rose-400 font-bold">rm -rf /</code>!
                </p>
              </div>

              {/* NỘI DUNG NHẬN HÀNG TÙY THEO LOẠI SẢN PHẨM */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left space-y-3">
                
                {/* 1. Nếu là Gói Nuôi Mèo PATE-05 */}
                {currentProduct?.type === 'DONATE' && (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-zinc-300">
                      Tên của bạn đã được vinh danh lên <strong className="text-amber-400">Bảng Vàng Ân Nhân</strong> trong 24 giờ tới!
                    </p>
                    {onOpenCertificate && order && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenCertificate(order);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-pink-950/40"
                      >
                        <Award className="w-4 h-4" />
                        <span>Xem & Tải Chứng Chỉ Cứu Mèo (Story FB)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Nếu là Gói Sấy CV (ROAST-10) */}
                {currentProduct?.id === 'ROAST-10' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Mã kích hoạt của bạn:</span>
                      <span className="font-mono font-bold text-amber-400 text-sm bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                        {order?.redeem_code || 'RCV-4829'}
                      </span>
                    </div>
                    {onOpenRoastCV && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenRoastCV(order?.redeem_code || 'RCV-4829');
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
                      >
                        <span>Mở Khu Vực Sấy CV Ngay</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* 3. Nếu là Bói Quẻ Tarot (TAROT-10) */}
                {currentProduct?.id === 'TAROT-10' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Mã kích hoạt quẻ:</span>
                      <span className="font-mono font-bold text-purple-400 text-sm bg-zinc-950 px-2 py-0.5 rounded border border-zinc-700">
                        {order?.redeem_code || 'TRT-1088'}
                      </span>
                    </div>
                    {onOpenTarot && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenTarot(order?.redeem_code || 'TRT-1088');
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-950/50"
                      >
                        <span>Bốc 3 Lá Bài & Luận Quẻ Ngay</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* 4. Nếu là File số (CHEM-15 hoặc TEMPLATE-29) */}
                {currentProduct?.type === 'R2_FILE' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Hệ thống đã tạo link tải độc quyền an toàn từ Cloudflare R2:</span>
                    </div>
                    <a
                      href={`/api/download?code=${order?.order_code}&key=${currentProduct.r2_file_key}`}
                      download
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 block text-center"
                    >
                      <Download className="w-4 h-4 inline" />
                      <span>Tải Tài Liệu Về Máy Ngay</span>
                    </a>
                  </div>
                )}

              </div>

              <button
                onClick={onClose}
                className="w-full py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition"
              >
                Đóng cửa sổ
              </button>
            </div>
          ) : (
            /* TRƯỜNG HỢP 2: ĐANG CHỜ QUÉT QR & THANH TOÁN */
            <div className="space-y-4">
              
              {/* Ảnh VietQR chuẩn Compact2 */}
              <div className="relative flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-inner">
                {isCreatingOrder ? (
                  <div className="h-60 flex flex-col items-center justify-center gap-2 text-zinc-600 text-xs font-mono">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span>Đang khởi tạo mã đơn...</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt="VietQR Code"
                      className="w-56 h-56 object-contain"
                    />
                    <div className="text-[10px] text-zinc-500 font-mono mt-1 text-center">
                      Mở app Mobile Banking quét mã để điền tự động 100%
                    </div>
                  </>
                )}
              </div>

              {/* Thông tin chuyển khoản chi tiết */}
              {order && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 space-y-2 text-xs font-mono">
                  
                  {/* Số tiền */}
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/80">
                    <span className="text-zinc-400">Số tiền:</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {order.amount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>

                  {/* Ngân hàng & Số tài khoản */}
                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/80">
                    <span className="text-zinc-400">Ngân hàng:</span>
                    <span className="text-zinc-200 font-bold">{bankConfig.bankId}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/80">
                    <span className="text-zinc-400">Số tài khoản:</span>
                    <button
                      onClick={() => copyToClipboard(bankConfig.accountNo, 'stk')}
                      className="flex items-center gap-1.5 text-zinc-200 hover:text-emerald-400 transition"
                    >
                      <span className="font-bold">{bankConfig.accountNo}</span>
                      {copiedField === 'stk' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC CHÍNH XÁC) */}
                  <div className="flex items-center justify-between py-1.5 bg-zinc-950 px-2 rounded-lg border border-amber-500/30">
                    <span className="text-amber-400 font-bold text-[11px]">Nội dung CK:</span>
                    <button
                      onClick={() => copyToClipboard(order.order_code, 'code')}
                      className="flex items-center gap-1.5 text-amber-300 font-bold hover:text-amber-200 transition"
                      title="Bấm để copy mã đơn"
                    >
                      <span className="text-sm underline">{order.order_code}</span>
                      {copiedField === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                </div>
              )}

              {/* Nút Mở Cổng PayOS nếu được kích hoạt */}
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-950/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Cổng Thanh Toán PayOS (Có Chọn Ngân Hàng)</span>
                </a>
              )}

              {/* Trạng thái chờ Webhook */}
              <div className="flex items-center justify-center gap-2 py-1 text-xs text-zinc-400 font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Đang chờ ngân hàng báo ting ting (2 - 5 giây)...</span>
              </div>

              <div className="text-[11px] text-zinc-500 text-center">
                Ngay khi nhận được tiền, màn hình sẽ tự động lật sang nhận hàng mà không cần bấm F5!
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
