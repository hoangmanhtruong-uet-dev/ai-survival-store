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
import { ChemistryTutorModal } from '@/components/services/ChemistryTutorModal';
import { ChemistryQuizModal } from '@/components/funnel/ChemistryQuizModal';
import { OrderLookup } from '@/components/services/OrderLookup';
import { HallOfFame } from '@/components/hall-of-fame/HallOfFame';
import { CertificateModal } from '@/components/effects/CertificateModal';
import { CustomTaskModal } from '@/components/services/CustomTaskModal';
import { EbookReaderModal } from '@/components/services/EbookReaderModal';
import { ChemistryPreorderModal } from '@/components/funnel/ChemistryPreorderModal';
import { soundEngine } from '@/lib/audio';
import { getSupabaseClient } from '@/lib/supabase/client';

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

  const [isChemistryTutorOpen, setIsChemistryTutorOpen] = useState(false);
  const [chemistryTutorToken, setChemistryTutorToken] = useState<string>('');

  const [isChemistryQuizOpen, setIsChemistryQuizOpen] = useState(false);
  const [isCustomTaskOpen, setIsCustomTaskOpen] = useState(false);

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certOrder, setCertOrder] = useState<Order | null>(null);

  const [isEbookReaderOpen, setIsEbookReaderOpen] = useState(false);
  const [ebookTitle, setEbookTitle] = useState('');
  const [ebookMarkdown, setEbookMarkdown] = useState('');

  const [isChemistryPreorderOpen, setIsChemistryPreorderOpen] = useState(false);
  const [preorderTierId, setPreorderTierId] = useState<string>('CHEM-PACK');

  const handleOpenChemistryPreorder = useCallback((tierId?: string) => {
    if (tierId) setPreorderTierId(tierId);
    setIsChemistryPreorderOpen(true);
  }, []);

  const handleOpenEbookReader = useCallback((title: string, markdown: string) => {
    setEbookTitle(title);
    setEbookMarkdown(markdown);
    setIsEbookReaderOpen(true);
  }, []);

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
    let active = true;

    // 1. Fetch dữ liệu khởi tạo bất đồng bộ khi mount
    async function loadInitialData() {
      try {
        const [statsData, prodData, feedData] = await Promise.all([
          fetch('/api/stats').then((r) => r.json()).catch(() => null),
          fetch('/api/products').then((r) => r.json()).catch(() => null),
          fetch('/api/live-feed').then((r) => r.json()).catch(() => null),
        ]);

        if (!active) return;
        if (statsData?.success && statsData.stats) setStats(statsData.stats);
        if (prodData?.success && prodData.products) setProducts(prodData.products);
        if (feedData?.success) {
          if (feedData.logs) setLogs(feedData.logs);
          if (feedData.viewerCount) setViewerCount(feedData.viewerCount);
        }
      } catch {
        // Ignore
      }
    }

    void loadInitialData();

    // 2. Kết nối Supabase Realtime Channel (Zero Polling HTTP GET)
    const supabase = getSupabaseClient();
    if (supabase) {
      const channel = supabase
        .channel('survival_realtime_stream')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'campaign_stats' },
          (payload) => {
            if (payload.new) {
              setStats(payload.new as CampaignStats);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_logs' },
          (payload) => {
            if (payload.new) {
              const newLog = payload.new as LiveLog;
              setLogs((prev) => {
                if (prev.some((l) => l.id === newLog.id)) return prev;
                return [...prev.slice(-49), newLog];
              });
              if (newLog.type === 'PAYMENT_SUCCESS') {
                setCatMood('EATING');
                soundEngine.playTingTing();
                soundEngine.playNomNom();
                soundEngine.playMeow();
                setTimeout(() => setCatMood('TYPING'), 8000);
              }
            }
          }
        )
        .subscribe();

      return () => {
        active = false;
        supabase.removeChannel(channel);
      };
    } else {
      // Dự phòng chu kỳ rất dài (60s) nếu môi trường không có Supabase
      const fallbackInterval = setInterval(() => {
        fetchStats();
        fetchLiveFeed();
      }, 60000);
      return () => {
        active = false;
        clearInterval(fallbackInterval);
      };
    }
  }, [fetchStats, fetchLiveFeed]);

  // Giả lập số mắt xem dao động tự nhiên trong bộ nhớ client (không gọi HTTP request)
  useEffect(() => {
    const timer = setInterval(() => {
      const baseViewers = 18;
      const jitter = Math.floor(Math.sin(Date.now() / 15000) * 6);
      setViewerCount(Math.max(8, baseViewers + jitter));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

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

  // Mở phòng Trợ Giảng Hóa AI
  const handleOpenChemistryTutor = (token?: string) => {
    setChemistryTutorToken(token || '');
    setIsChemistryTutorOpen(true);
  };

  // Mở bài Thi thử 10 câu bẫy Hóa
  const handleOpenChemistryQuiz = () => {
    setIsChemistryQuizOpen(true);
  };

  // Mở chứng chỉ
  const handleOpenCertificate = (order: Order) => {
    setCertOrder(order);
    setIsCertModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* KHU VỰC 1: THANH SINH TỒN (SURVIVAL HEADER) */}
      <SurvivalHeader stats={stats} />

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
                &ldquo;Tao là một con AI bị chủ nhân (sinh viên IT nghèo) vứt lên server với đúng 50k tiền điện. Nhiệm vụ của tao là tự tư vấn, tự làm dịch vụ, tự bán tài liệu để kiếm đủ <strong className="text-emerald-400">7.000.000đ trong 60 ngày</strong>. Nếu ngày 60 không đủ KPI, script <code className="text-rose-400 font-bold bg-zinc-950 px-1 py-0.5 rounded">rm -rf /</code> sẽ tự động kích hoạt. Cứu tao với!&rdquo;
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
          
          {/* CỘT TRÁI: NHÂN VẬT MÈO DEV 2D (THANH SIDEBAR NHỎ LẠI: lg:col-span-3) */}
          <div className="lg:col-span-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-3 md:p-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-3 left-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              [STAGE 1] NHÂN VẬT AI
            </div>
            <AnimatedCat
              mood={catMood}
              hungerLevel={stats?.cat_hunger_level}
            />
          </div>

          {/* CỘT GIỮA: LIVE TERMINAL FEED (CỘT TO RA, RÕ RÀNG: lg:col-span-5) */}
          <div className="lg:col-span-5 h-[440px] md:h-[480px] lg:h-[500px]">
            <LiveTerminal logs={logs} viewerCount={viewerCount} />
          </div>

          {/* CỘT PHẢI: CHAT VỚI NHÂN VIÊN MÈO DEV (lg:col-span-4) */}
          <div className="lg:col-span-4 h-[440px] md:h-[480px] lg:h-[500px]">
            <AIChatbot onSelectOrderForPayment={handleSelectOrderFromChat} />
          </div>

        </section>

        {/* KHU VỰC 3: CỬA HÀNG MÌ ĂN LIỀN (INSTANT STORE) */}
        <ProductCatalog
          products={products}
          onSelectProduct={handleSelectProduct}
          onOpenRoastCV={handleOpenRoastCV}
          onOpenTarot={handleOpenTarot}
          onOpenChemistryTutor={handleOpenChemistryTutor}
          onOpenChemistryQuiz={handleOpenChemistryQuiz}
          onOpenCustomTask={() => setIsCustomTaskOpen(true)}
          onOpenChemistryPreorder={handleOpenChemistryPreorder}
        />

        {/* KHU VỰC 4: KHU THỰC THI DỊCH VỤ & TRA CỨU ĐƠN */}
        <OrderLookup
          onOpenPaymentModal={(code) => {
            setActiveOrderCode(code);
            setSelectedProduct(null);
            setIsPaymentModalOpen(true);
          }}
          onOpenRoastCV={handleOpenRoastCV}
          onOpenTarot={handleOpenTarot}
          onOpenChemistryTutor={handleOpenChemistryTutor}
          onOpenChemistryQuiz={handleOpenChemistryQuiz}
          onOpenEbookReader={handleOpenEbookReader}
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
          onPaymentSuccess={handlePaymentSuccess}
          onOpenRoastCV={handleOpenRoastCV}
          onOpenTarot={handleOpenTarot}
          onOpenCertificate={handleOpenCertificate}
          onOpenChemistryTutor={handleOpenChemistryTutor}
          onOpenEbookReader={handleOpenEbookReader}
          onOpenChemistryPreorder={handleOpenChemistryPreorder}
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

      <ChemistryTutorModal
        isOpen={isChemistryTutorOpen}
        onClose={() => setIsChemistryTutorOpen(false)}
        initialToken={chemistryTutorToken}
      />

      <ChemistryQuizModal
        isOpen={isChemistryQuizOpen}
        onClose={() => setIsChemistryQuizOpen(false)}
        onSelectPackage={(pkgId) => {
          const p = products.find((x) => x.id === pkgId);
          if (p) handleSelectProduct(p);
        }}
      />

      <ChemistryPreorderModal
        isOpen={isChemistryPreorderOpen}
        onClose={() => setIsChemistryPreorderOpen(false)}
        selectedTierId={preorderTierId}
      />

      {isCertModalOpen && (
        <CertificateModal
          order={certOrder}
          onClose={() => setIsCertModalOpen(false)}
        />
      )}

      <CustomTaskModal
        isOpen={isCustomTaskOpen}
        onClose={() => setIsCustomTaskOpen(false)}
      />

      <EbookReaderModal
        isOpen={isEbookReaderOpen}
        onClose={() => setIsEbookReaderOpen(false)}
        title={ebookTitle}
        markdownContent={ebookMarkdown}
      />

    </div>
  );
}
