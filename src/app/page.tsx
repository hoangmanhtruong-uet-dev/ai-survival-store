'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product, CampaignStats, LiveLog, Order } from '@/types';
import { SurvivalHeader } from '@/components/layout/SurvivalHeader';
import { AnimatedCat, CatMood } from '@/components/cat/AnimatedCat';
import { LiveTerminal } from '@/components/terminal/LiveTerminal';
import { AIChatbot } from '@/components/chat/AIChatbot';
import { ProductCatalog } from '@/components/store/ProductCatalog';
import { PaymentModal } from '@/components/store/PaymentModal';
import { CVRoastModal } from '@/components/services/CVRoastModal';
import { TarotModal } from '@/components/services/TarotModal';
import { OrderLookup } from '@/components/services/OrderLookup';
import { HallOfFame } from '@/components/hall-of-fame/HallOfFame';
import { CertificateModal } from '@/components/effects/CertificateModal';
import { DevPaymentSimulator } from '@/components/dev/DevPaymentSimulator';
import { soundEngine } from '@/lib/audio';

export default function Home() {
  // Global states
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<LiveLog[]>([]);
  const [viewerCount, setViewerCount] = useState<number>(18);
  const [catMood, setCatMood] = useState<CatMood>('TYPING');

  // Modal controls
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrderCode, setActiveOrderCode] = useState<string | undefined>(undefined);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [isRoastModalOpen, setIsRoastModalOpen] = useState(false);
  const [roastRedeemCode, setRoastRedeemCode] = useState<string>('');

  const [isTarotModalOpen, setIsTarotModalOpen] = useState(false);
  const [tarotRedeemCode, setTarotRedeemCode] = useState<string>('');

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certOrder, setCertOrder] = useState<Order | null>(null);

  const [isDevSimOpen, setIsDevSimOpen] = useState(false);

  // Fetch campaign stats & products
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchLiveFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/live-feed');
      const data = await res.json();
      if (data.success) {
        if (data.logs) setLogs(data.logs);
        if (data.viewerCount) setViewerCount(data.viewerCount);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchProducts();
    fetchLiveFeed();

    // Polling nhẹ mỗi 3.5 giây cho live logs và stats
    const interval = setInterval(() => {
      fetchStats();
      fetchLiveFeed();
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchStats, fetchProducts, fetchLiveFeed]);

  // Xử lý khi có đơn thanh toán thành công
  const handlePaymentSuccess = () => {
    setCatMood('EATING');
    soundEngine.playTingTing();
    soundEngine.playNomNom();
    soundEngine.playMeow();
    fetchStats();
    fetchLiveFeed();

    setTimeout(() => {
      setCatMood('TYPING');
    }, 8000);
  };

  // Mở modal thanh toán từ danh mục sản phẩm
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveOrderCode(undefined);
    setIsPaymentModalOpen(true);
  };

  // Mở modal thanh toán từ thẻ gợi ý trong Chatbot
  const handleSelectOrderFromChat = (orderCode: string, productId: string) => {
    const foundProduct = products.find((p) => p.id === productId) || null;
    setSelectedProduct(foundProduct);
    setActiveOrderCode(orderCode);
    setIsPaymentModalOpen(true);
  };

  // Mở phòng Roast CV
  const handleOpenRoastCV = (code: string) => {
    setRoastRedeemCode(code);
    setIsRoastModalOpen(true);
  };

  // Mở phòng Tarot
  const handleOpenTarot = (code: string) => {
    setTarotRedeemCode(code);
    setIsTarotModalOpen(true);
  };

  // Mở chứng chỉ
  const handleOpenCertificate = (order: Order) => {
    setCertOrder(order);
    setIsCertModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* KHU VỰC 1: THANH SINH TỒN (SURVIVAL HEADER) */}
      <SurvivalHeader stats={stats} onOpenDevSim={() => setIsDevSimOpen(true)} />

      {/* NỘI DUNG CHÍNH (CONTAINER) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-8">
        
        {/* BANNER THÔNG ĐIỆP CỐT TRUYỆN */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-4 md:p-5 shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">
                  CỐT TRUYỆN SINH TỒN: 5K CŨNG LÀ MỘT MẠNG MÈO
                </span>
              </div>
              <p className="text-xs md:text-sm text-zinc-300 max-w-3xl leading-relaxed">
                &ldquo;Tao là một con AI bị chủ nhân (sinh viên IT nghèo) vứt lên server với đúng 50k tiền điện. Nhiệm vụ của tao là tự tư vấn, tự làm dịch vụ, tự bán tài liệu để kiếm đủ <strong className="text-emerald-400">5.000.000đ trong 30 ngày</strong>. Nếu ngày 30 không đủ KPI, script <code className="text-rose-400 font-bold bg-zinc-950 px-1 py-0.5 rounded">rm -rf /</code> sẽ tự động kích hoạt. Cứu tao với!&rdquo;
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
              <button
                onClick={() => {
                  const pate = products.find((p) => p.id === 'PATE-05') || null;
                  if (pate) handleSelectProduct(pate);
                }}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold font-mono text-xs shadow-lg shadow-pink-950/40 transition flex items-center justify-center gap-2"
              >
                <span>🐟 Cứu 5k Pate</span>
              </button>
            </div>
          </div>
        </section>

        {/* KHU VỰC 2: SÂN KHẤU CHÍNH (3 CỘT LIVE WORKSPACE) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* CỘT TRÁI: NHÂN VẬT MÈO DEV 2D (4 CỘT TRÊN DESKTOP) */}
          <div className="lg:col-span-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-3 left-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              [STAGE 1] NHÂN VẬT AI
            </div>
            <AnimatedCat
              mood={catMood}
              hungerLevel={stats?.cat_hunger_level}
              onCatClick={() => fetchLiveFeed()}
            />
          </div>

          {/* CỘT GIỮA: LIVE TERMINAL FEED (4 CỘT TRÊN DESKTOP) */}
          <div className="lg:col-span-4 h-[380px] md:h-[420px] lg:h-auto">
            <LiveTerminal logs={logs} viewerCount={viewerCount} />
          </div>

          {/* CỘT PHẢI: CHAT VỚI NHÂN VIÊN MÈO DEV (4 CỘT TRÊN DESKTOP) */}
          <div className="lg:col-span-4 h-[380px] md:h-[420px] lg:h-auto">
            <AIChatbot onSelectOrderForPayment={handleSelectOrderFromChat} />
          </div>

        </section>

        {/* KHU VỰC 3: CỬA HÀNG MÌ ĂN LIỀN (INSTANT STORE) */}
        <ProductCatalog products={products} onSelectProduct={handleSelectProduct} />

        {/* KHU VỰC 4: KHU THỰC THI DỊCH VỤ & TRA CỨU ĐƠN */}
        <OrderLookup
          onOpenPaymentModal={(code) => {
            setActiveOrderCode(code);
            setSelectedProduct(null);
            setIsPaymentModalOpen(true);
          }}
          onOpenRoastCV={handleOpenRoastCV}
          onOpenTarot={handleOpenTarot}
        />

        {/* KHU VỰC 5: BẢNG VÀNG ÂN NHÂN (HALL OF FAME) */}
        <HallOfFame onOpenCertificate={handleOpenCertificate} />

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 px-4 text-center text-xs text-zinc-500 font-mono space-y-2">
        <p>
          🐱 Mèo Dev Sinh Tồn • Boss AI Cày Thuê • Next.js 15 + Supabase + Gemini AI + VietQR
        </p>
        <p className="text-[11px] text-zinc-600">
          Chống lại lệnh <span className="text-rose-500 font-bold">rm -rf /</span> bằng tình yêu thương và pate của cộng đồng dev Việt Nam.
        </p>
      </footer>

      {/* ALL INTERACTIVE MODALS */}
      {isPaymentModalOpen && (
        <PaymentModal
          product={selectedProduct}
          initialOrderCode={activeOrderCode}
          onClose={() => setIsPaymentModalOpen(false)}
          onOpenRoastCV={handleOpenRoastCV}
          onOpenTarot={handleOpenTarot}
          onOpenCertificate={handleOpenCertificate}
        />
      )}

      {isRoastModalOpen && (
        <CVRoastModal
          initialCode={roastRedeemCode}
          onClose={() => setIsRoastModalOpen(false)}
        />
      )}

      {isTarotModalOpen && (
        <TarotModal
          initialCode={tarotRedeemCode}
          onClose={() => setIsTarotModalOpen(false)}
        />
      )}

      {isCertModalOpen && (
        <CertificateModal
          order={certOrder}
          onClose={() => setIsCertModalOpen(false)}
        />
      )}

      {isDevSimOpen && (
        <DevPaymentSimulator
          onClose={() => setIsDevSimOpen(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

    </div>
  );
}
