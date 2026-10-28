'use client';

import React, { useState, useEffect } from 'react';
import { Product, Order } from '@/types';
import { X, Copy, Check, Loader2, Sparkles, Download, ArrowRight, ShieldCheck, Heart, Award, ExternalLink, Flame, BookOpen } from 'lucide-react';
import { generateVietQRUrl, getBankConfig } from '@/lib/vietqr';
import { soundEngine } from '@/lib/audio';
import { getSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  product: Product | null;
  initialOrderCode?: string;
  onClose: () => void;
  onOpenRoastCV?: (code: string) => void;
  onOpenTarot?: (code: string) => void;
  onOpenCertificate?: (order: Order) => void;
  onOpenChemistryTutor?: (token?: string) => void;
  onOpenEbookReader?: (title: string, markdown: string) => void;
}

export interface ChemistryTier {
  id: string;
  name: string;
  detail: string;
  price: number;
  badge: string;
  icon: string;
  isPopular?: boolean;
}

export const CHEMISTRY_TIERS: ChemistryTier[] = [
  {
    id: 'CHEM-49',
    name: 'Gói Khởi Động 8+',
    detail: '30 đề 8+ có giải chi tiết + Lộ trình',
    price: 49000,
    badge: 'Mục tiêu 8+',
    icon: '🧪',
  },
  {
    id: 'CHEM-89',
    name: 'Gói Bứt Phá 9+',
    detail: '60 đề 8+ & 9+ + Vận dụng cao Este + Tip Casio 30s',
    price: 89000,
    badge: 'Hot 9+',
    icon: '⚗️',
  },
  {
    id: 'CHEM-149',
    name: 'Gói All-in Thủ Khoa',
    detail: 'Full 100 đề 8+, 9+, 10+ + Trợ Giảng AI 24/7 sấy bài & chỉ Casio',
    price: 149000,
    badge: '⭐ Đầy Đủ Nhất',
    icon: '🏆',
    isPopular: true,
  },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  product,
  initialOrderCode,
  onClose,
  onOpenRoastCV,
  onOpenTarot,
  onOpenCertificate,
  onOpenChemistryTutor,
  onOpenEbookReader,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [refCode, setRefCode] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [directQrUrl, setDirectQrUrl] = useState<string | null>(null);
  const [payosAccount, setPayosAccount] = useState<{ bankId: string; accountNo: string; accountName?: string } | null>(null);

  // Xác định gói mặc định cho sản phẩm Hóa học
  const initialTier =
    product?.id && ['CHEM-49', 'CHEM-89', 'CHEM-149'].includes(product.id)
      ? product.id
      : 'CHEM-149';
  const [selectedTierId, setSelectedTierId] = useState<string>(initialTier);

  useEffect(() => {
    if (product?.id && ['CHEM-49', 'CHEM-89', 'CHEM-149'].includes(product.id)) {
      setSelectedTierId(product.id);
    }
  }, [product?.id]);

  // Đọc ref_code và buyer_email từ localStorage hoặc URL search param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRef = params.get('ref');
      if (urlRef) setRefCode(urlRef);
      const savedEmail = localStorage.getItem('buyer_email');
      if (savedEmail) setBuyerEmail(savedEmail);
    }
  }, []);

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
            if (data.qrUrl) {
              setDirectQrUrl(data.qrUrl);
            }
            if (data.payosAccount) {
              setPayosAccount(data.payosAccount);
            }
          }
        } catch {
          // Ignore
        }
      } else if (product && !order && !isCreatingOrder) {
        // Tạo đơn hàng mới
        setIsCreatingOrder(true);
        const targetProductId = product.id === 'CHEM-PACK' ? selectedTierId : product.id;
        try {
          const res = await fetch('/api/orders/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: targetProductId,
              buyerName: buyerName || 'Ân nhân giấu tên',
              buyerEmail: buyerEmail.trim() || undefined,
              refCode: refCode.trim() || undefined,
              buyerNote: buyerNote || '',
            }),
          });
          const data = await res.json();
          if (active && data.success && data.order) {
            setOrder(data.order);
            if (data.checkoutUrl) {
              setCheckoutUrl(data.checkoutUrl);
            }
            if (data.qrUrl) {
              setDirectQrUrl(data.qrUrl);
            }
            if (data.payosAccount) {
              setPayosAccount(data.payosAccount);
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
  }, [product, initialOrderCode, selectedTierId]);

  const handleSelectTier = async (newTierId: string) => {
    if (newTierId === (order?.product_id || selectedTierId) && order) return;
    setSelectedTierId(newTierId);
    setIsCreatingOrder(true);
    soundEngine.playKeyClick();
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: newTierId,
          buyerName: buyerName || order?.buyer_name || 'Ân nhân giấu tên',
          buyerEmail: buyerEmail.trim() || order?.buyer_email || undefined,
          refCode: refCode.trim() || order?.ref_code || undefined,
          buyerNote: buyerNote || order?.buyer_note || '',
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        if (data.checkoutUrl) {
          setCheckoutUrl(data.checkoutUrl);
        }
        if (data.qrUrl) {
          setDirectQrUrl(data.qrUrl);
        }
        if (data.payosAccount) {
          setPayosAccount(data.payosAccount);
        }
      }
    } catch (err) {
      console.error('Error switching tier', err);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Lắng nghe trạng thái thanh toán bằng Supabase Realtime (Không Polling spam)
  useEffect(() => {
    if (!order || order.status === 'PAID') return;

    setIsPolling(true);

    const handleSuccess = (paidOrder: Order) => {
      setOrder(paidOrder);
      setIsPolling(false);
      soundEngine.playTingTing();
      soundEngine.playNomNom();
      soundEngine.playMeow();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    };

    const supabase = getSupabaseClient();
    let channel: RealtimeChannel | null = null;

    if (supabase) {
      channel = supabase
        .channel(`order_realtime_${order.order_code}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `order_code=eq.${order.order_code}`,
          },
          (payload) => {
            const updated = payload.new as Order;
            if (updated && updated.status === 'PAID') {
              handleSuccess(updated);
            }
          }
        )
        .subscribe();
    }

    // Dự phòng chu kỳ rất chậm (10s) trong trường hợp kết nối realtime tạm gián đoạn
    const fallbackInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.order_code}`);
        const data = await res.json();
        if (data.success && data.order && data.order.status === 'PAID') {
          handleSuccess(data.order);
          clearInterval(fallbackInterval);
        }
      } catch {
        // Polling retry
      }
    }, 10000);

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      clearInterval(fallbackInterval);
    };
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
  const isChemistry = Boolean(
    currentProduct?.type === 'GDRIVE_ACCESS' ||
    currentProduct?.id?.startsWith('CHEM-') ||
    order?.product_id?.startsWith('CHEM-')
  );
  const activeChemistryTier = CHEMISTRY_TIERS.find(
    (t) => t.id === (order?.product_id || selectedTierId)
  );
  const qrUrl = directQrUrl || (order ? generateVietQRUrl(order.amount, order.order_code) : '');
  const activeBankId = payosAccount?.bankId || bankConfig.bankId;
  const activeAccountNo = payosAccount?.accountNo || bankConfig.accountNo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          isChemistry ? 'max-w-xl' : 'max-w-md'
        } bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans transition-all duration-300`}
      >
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {isChemistry && activeChemistryTier ? activeChemistryTier.icon : currentProduct?.icon || '🐱'}
            </span>
            <div>
              <h3 className="font-mono text-sm font-bold text-zinc-100 flex items-center gap-2">
                {isPaid
                  ? 'THANH TOÁN THÀNH CÔNG!'
                  : isChemistry && activeChemistryTier
                  ? `MUA ${activeChemistryTier.name.toUpperCase()}`
                  : 'THANH TOÁN VIETQR'}
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
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
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

                {/* 4.1. Nếu là Ebook / Tài liệu số độc quyền (EBOOK) */}
                {(currentProduct?.type === 'EBOOK' || currentProduct?.content_markdown) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Tài liệu số đã sẵn sàng! Bạn có thể đọc trực tuyến ngay lúc này:</span>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenEbookReader) {
                          onOpenEbookReader(
                            currentProduct.name,
                            currentProduct.content_markdown || '# Đang tải nội dung...'
                          );
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Mở Ebook Đọc Trực Tuyến Ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* 5. Nếu là Gói Đề Hóa Học (GDRIVE_ACCESS) */}
                {currentProduct?.type === 'GDRIVE_ACCESS' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Đã Cấp Quyền Truy Cập Google Drive!</span>
                      </div>
                      <p className="text-[11px] text-zinc-300">
                        Quyền xem tài liệu đã được cấp tới Gmail:{' '}
                        <strong className="text-white">{order?.buyer_email || buyerEmail || 'Gmail của bạn'}</strong>{' '}
                        (Chế độ View-Only chống leak).
                      </p>
                    </div>

                    <a
                      href={order?.redeem_code || 'https://drive.google.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 block text-center"
                    >
                      <ExternalLink className="w-4 h-4 inline" />
                      <span>Mở Thư Mục Google Drive</span>
                    </a>

                    {/* Đặc quyền gói Thủ Khoa: Trợ Giảng AI 24/7 */}
                    {currentProduct.id === 'CHEM-149' && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">
                            <span>🏆</span> Token Trợ Giảng Hóa AI:
                          </span>
                          <span className="font-mono font-bold text-amber-300 bg-zinc-950 px-2 py-0.5 rounded border border-amber-500/40">
                            {((order?.ai_result as Record<string, unknown>)?.tutor_token as string) || `CHM-${order?.order_code?.replace('MEO-', '') || '149'}`}
                          </span>
                        </div>
                        {onOpenChemistryTutor && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenChemistryTutor(
                                ((order?.ai_result as Record<string, unknown>)?.tutor_token as string) ||
                                `CHM-${order?.order_code?.replace('MEO-', '') || '149'}`
                              );
                            }}
                            className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <span>Hỏi Bài Trợ Giảng AI Ngay (Giải + Casio 30s)</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Hộp Referral Mời Bạn Cùng Bàn */}
                    <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="text-zinc-300 font-semibold">👥 Rủ bạn cùng bàn — Nhận nâng cấp Free:</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={typeof window !== 'undefined' ? `${window.location.origin}?ref=${order?.order_code}` : `?ref=${order?.order_code}`}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 font-mono select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              copyToClipboard(`${window.location.origin}?ref=${order?.order_code}`, 'ref_link');
                            }
                          }}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                        >
                          {copiedField === 'ref_link' ? 'Đã chép' : 'Chép link'}
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        Rủ 2 bạn cùng mua qua mã ref của bạn để được nâng cấp miễn phí lên gói All-in Thủ Khoa!
                      </p>
                    </div>
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
              {isChemistry && (
                <div className="space-y-3">
                  {/* BẢNG 3 LỰA CHỌN GÓI HÓA HỌC */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
                        <span>📦</span> CHỌN 1 TRONG 3 GÓI ÔN THI HÓA:
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">Bấm để đổi gói</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {CHEMISTRY_TIERS.map((tier) => {
                        const isSelected = (order?.product_id || selectedTierId) === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => handleSelectTier(tier.id)}
                            className={`relative text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-500 shadow-md shadow-emerald-950/40 text-white'
                                : 'bg-zinc-900/70 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                            }`}
                          >
                            {tier.badge && (
                              <span
                                className={`absolute -top-2 right-2 text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${
                                  tier.isPopular
                                    ? 'bg-amber-500 text-zinc-950 border-amber-300 font-black'
                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                                }`}
                              >
                                {tier.badge}
                              </span>
                            )}

                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold">
                                <span>{tier.icon}</span>
                                <span>{tier.name}</span>
                              </div>
                              <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1 leading-tight">
                                {tier.detail}
                              </p>
                            </div>

                            <div className="mt-2 pt-1 border-t border-zinc-800/80 flex items-center justify-between">
                              <span className="text-xs font-bold font-mono text-emerald-400">
                                {tier.price.toLocaleString('vi-VN')}đ
                              </span>
                              <span
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[9px] ${
                                  isSelected
                                    ? 'border-emerald-400 bg-emerald-500 text-zinc-950 font-bold'
                                    : 'border-zinc-700'
                                }`}
                              >
                                {isSelected && '✓'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nút trải nghiệm nhanh Trợ Giảng AI */}
                  <div className="bg-emerald-950/60 border border-emerald-700/70 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <div className="text-xs text-emerald-300 font-mono">
                      💡 Mở thử Trợ Giảng Hóa AI 24/7:
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenChemistryTutor) onOpenChemistryTutor('CHM-DEMO');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono text-xs flex items-center gap-1 shrink-0 shadow transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Hỏi Mèo Ngay</span>
                    </button>
                  </div>

                  {/* Nhập Gmail */}
                  <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                      <span>📧 Nhập Gmail để cấp quyền Drive:</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Bảo mật View-Only</span>
                    </label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={(e) => {
                        setBuyerEmail(e.target.value);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('buyer_email', e.target.value);
                        }
                      }}
                      placeholder="vidu@gmail.com (Bắt buộc để nhận Drive)"
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none"
                    />
                    <div className="text-[10px] text-zinc-500">
                      * Server tự động gửi quyền View tới Gmail này ngay sau khi ting ting 2 giây.
                    </div>
                  </div>
                </div>
              )}
              
              {/* Ảnh VietQR chuẩn Compact2 */}
              <div className="relative flex flex-col items-center justify-center bg-white p-3 rounded-2xl shadow-inner">
                {isCreatingOrder || !qrUrl ? (
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
                    <span className="text-zinc-200 font-bold">{activeBankId}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-zinc-800/80">
                    <span className="text-zinc-400">Số tài khoản:</span>
                    <button
                      onClick={() => copyToClipboard(activeAccountNo, 'stk')}
                      className="flex items-center gap-1.5 text-zinc-200 hover:text-emerald-400 transition"
                    >
                      <span className="font-bold">{activeAccountNo}</span>
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
