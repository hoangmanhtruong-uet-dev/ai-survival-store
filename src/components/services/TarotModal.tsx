'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Moon,
  Eye,
  RotateCcw,
  Share2,
  Bookmark,
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  History,
  Download,
  Copy,
  Check,
  Compass,
} from 'lucide-react';
import { soundEngine } from '@/lib/audio';
import { TAROT_DECK_22, TAROT_CATEGORIES, TarotCard, TarotCategory } from '@/lib/tarot-data';

interface TarotModalProps {
  initialCode?: string;
  onClose: () => void;
}

interface DrawnCardWithPosition extends TarotCard {
  position: string;
}

interface TarotResultData {
  drawnCards: DrawnCardWithPosition[];
  reading: string;
  summary: string;
  card1Analysis: string;
  card2Analysis: string;
  card3Analysis: string;
  advice: string;
  catVerdict: string;
  luckyNumber: string;
  luckyColor: string;
  taboo: string;
  timestamp?: number;
  question?: string;
  category?: string;
}

// Hàm tính Cung Hoàng Đạo vui nhộn
function getZodiacSign(dateStr: string): { name: string; icon: string } {
  if (!dateStr) return { name: 'Vô Cực Cung', icon: '✨' };
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { name: 'Bạch Dương', icon: '♈' };
    if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { name: 'Kim Ngưu', icon: '♉' };
    if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return { name: 'Song Tử', icon: '♊' };
    if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return { name: 'Cự Giải', icon: '♋' };
    if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { name: 'Sư Tử', icon: '♌' };
    if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { name: 'Xử Nữ', icon: '♍' };
    if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return { name: 'Thiên Bình', icon: '♎' };
    if ((month === 10 && day >= 24) || (month === 11 && day <= 21)) return { name: 'Bọ Cạp', icon: '♏' };
    if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { name: 'Nhân Mã', icon: '♐' };
    if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { name: 'Ma Kết', icon: '♑' };
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { name: 'Bảo Bình', icon: '♒' };
    return { name: 'Song Ngư', icon: '♓' };
  } catch {
    return { name: 'Bí Ẩn Cung', icon: '🔮' };
  }
}

export const TarotModal: React.FC<TarotModalProps> = ({ initialCode = '', onClose }) => {
  // Navigation / Phase: 'input' | 'picking' | 'revealing' | 'result'
  const [phase, setPhase] = useState<'input' | 'picking' | 'revealing' | 'result'>('input');
  
  // Inputs
  const [redeemCode, setRedeemCode] = useState(initialCode || 'TRT-FREE-TEST');
  const [selectedCategory, setSelectedCategory] = useState<TarotCategory>(TAROT_CATEGORIES[0]);
  const [question, setQuestion] = useState(TAROT_CATEGORIES[0].defaultQuestions[0]);
  const [birthDate, setBirthDate] = useState('2002-08-15');

  // Picking state
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false]);

  // Server state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TarotResultData | null>(null);

  // Modals & Extras
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyList, setHistoryList] = useState<TarotResultData[]>([]);
  const [isMuted, setIsMuted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync mute state & load history
  useEffect(() => {
    setIsMuted(soundEngine.getMuted());
    try {
      const saved = localStorage.getItem('meo_tarot_history');
      if (saved) {
        setHistoryList(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSound = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const handleSelectCategory = (cat: TarotCategory) => {
    soundEngine.playCardSelect();
    setSelectedCategory(cat);
    setQuestion(cat.defaultQuestions[0]);
  };

  const handleStartPicking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Vui lòng nhập câu hỏi của bạn cho Thầy Mèo');
      return;
    }
    setError(null);
    soundEngine.playTarotShuffle();
    setSelectedCardIds([]);
    setFlippedCards([false, false, false]);
    setPhase('picking');
  };

  // Click chọn hoặc bỏ chọn lá bài
  const handleToggleCardPick = (cardId: number) => {
    if (selectedCardIds.includes(cardId)) {
      soundEngine.playKeyClick();
      setSelectedCardIds(selectedCardIds.filter((id) => id !== cardId));
    } else {
      if (selectedCardIds.length >= 3) {
        soundEngine.playKeyClick();
        return; // Chỉ chọn tối đa 3 lá
      }
      soundEngine.playCardSelect();
      setSelectedCardIds([...selectedCardIds, cardId]);
    }
  };

  // Bốc nhanh hộ tao
  const handleAutoPick = () => {
    soundEngine.playTarotShuffle();
    const shuffled = [...TAROT_DECK_22].sort(() => 0.5 - Math.random());
    const randomThree = shuffled.slice(0, 3).map((c) => c.id);
    setSelectedCardIds(randomThree);
  };

  // Submit quẻ bài tới backend
  const handleFetchReading = async (cardIdsToUse = selectedCardIds) => {
    if (cardIdsToUse.length !== 3) {
      setError('Vui lòng chọn đủ 3 lá bài hoặc bấm "Bốc nhanh hộ tao"');
      return;
    }

    setError(null);
    setIsLoading(true);
    setPhase('revealing');
    soundEngine.playMysticGong();

    try {
      const res = await fetch('/api/services/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redeemCode: redeemCode.trim().toUpperCase(),
          question: question.trim(),
          birthDate,
          category: selectedCategory.name,
          selectedCardIds: cardIdsToUse,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const fullResult: TarotResultData = {
          drawnCards: data.drawnCards,
          reading: data.reading,
          summary: data.summary,
          card1Analysis: data.card1Analysis,
          card2Analysis: data.card2Analysis,
          card3Analysis: data.card3Analysis,
          advice: data.advice,
          catVerdict: data.catVerdict,
          luckyNumber: data.luckyNumber,
          luckyColor: data.luckyColor,
          taboo: data.taboo,
          timestamp: Date.now(),
          question,
          category: selectedCategory.name,
        };

        setResult(fullResult);

        // Lưu vào LocalStorage
        try {
          const prevHistory = JSON.parse(localStorage.getItem('meo_tarot_history') || '[]');
          const updated = [fullResult, ...prevHistory].slice(0, 20);
          localStorage.setItem('meo_tarot_history', JSON.stringify(updated));
          setHistoryList(updated);
        } catch {
          // ignore
        }

        // Tự động lật bài tuần tự với âm thanh
        setTimeout(() => {
          soundEngine.playCardFlip();
          setFlippedCards([true, false, false]);
        }, 500);
        setTimeout(() => {
          soundEngine.playCardFlip();
          setFlippedCards([true, true, false]);
        }, 1100);
        setTimeout(() => {
          soundEngine.playCardFlip();
          soundEngine.playDivineMeow();
          setFlippedCards([true, true, true]);
        }, 1700);
        setTimeout(() => {
          setPhase('result');
        }, 2400);

      } else {
        setError(data.error || 'Có lỗi xảy ra khi luận quẻ');
        setPhase('picking');
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ tâm linh Mèo');
      setPhase('picking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlipSingleCard = (idx: number) => {
    soundEngine.playCardFlip();
    const next = [...flippedCards];
    next[idx] = !next[idx];
    setFlippedCards(next);
  };

  const handleCopyReading = () => {
    if (!result) return;
    soundEngine.playKeyClick();
    const shareText = `🔮 QUẺ BÓI THẦY MÈO DEV 🔮\n\n` +
      `❓ Câu hỏi: "${result.question}"\n` +
      `🐱 Phán: "${result.summary}"\n\n` +
      `🎴 3 Lá bài định mệnh:\n` +
      `1. Quá khứ: ${result.drawnCards[0]?.name} (${result.drawnCards[0]?.viName})\n` +
      `2. Hiện tại: ${result.drawnCards[1]?.name} (${result.drawnCards[1]?.viName})\n` +
      `3. Tương lai: ${result.drawnCards[2]?.name} (${result.drawnCards[2]?.viName})\n\n` +
      `💡 Lời khuyên: ${result.advice}\n` +
      `🐾 Châm ngôn: "${result.catVerdict}"\n\n` +
      `🎯 Số may mắn: ${result.luckyNumber} | 🎨 Màu phong thủy: ${result.luckyColor}\n` +
      `⚠️ Kiêng kỵ: ${result.taboo}\n\n` +
      `👉 Trải nghiệm bói quẻ tại AI Survival Store!`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render & Download Story PNG via Canvas
  const handleDownloadStoryImage = () => {
    if (!result) return;
    soundEngine.playKeyClick();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient (Cyberpunk Mystic Dark)
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#09090b');
    bgGrad.addColorStop(0.3, '#1e1136');
    bgGrad.addColorStop(0.7, '#130d24');
    bgGrad.addColorStop(1, '#09090b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing Neon Border
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 14;
    ctx.strokeRect(40, 40, 1000, 1840);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 4;
    ctx.strokeRect(55, 55, 970, 1810);

    // Header Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('🔮 THẦY MÈO BÓI QUẺ TÂM LINH 🔮', 540, 140);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '28px monospace';
    ctx.fillText('AI SURVIVAL STORE • BẢN PHÁN VẬN MỆNH GEN Z', 540, 190);

    // User Question Box
    ctx.fillStyle = 'rgba(39, 39, 42, 0.7)';
    ctx.fillRect(80, 240, 920, 150);
    ctx.strokeStyle = '#71717a';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, 240, 920, 150);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('❓ CÂU HỎI KHẤN NGUYỆN:', 540, 290);
    ctx.fillStyle = '#f4f4f5';
    ctx.font = 'italic 32px sans-serif';
    const wrappedQ = result.question && result.question.length > 50 ? result.question.slice(0, 48) + '...' : result.question;
    ctx.fillText(`"${wrappedQ}"`, 540, 345);

    // 3 Drawn Cards Box
    ctx.fillStyle = '#e9d5ff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('🎴 3 LÁ BÀI ĐỊNH MỆNH', 540, 450);

    const cardWidth = 280;
    const cardHeight = 420;
    const startX = 80;
    const cardY = 480;

    result.drawnCards.forEach((c, i) => {
      const cx = startX + i * 320;

      // Card Container
      ctx.fillStyle = '#18181b';
      ctx.fillRect(cx, cardY, cardWidth, cardHeight);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 4;
      ctx.strokeRect(cx, cardY, cardWidth, cardHeight);

      // Card Position Header
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(i === 0 ? 'QUÁ KHỨ' : i === 1 ? 'HIỆN TẠI' : 'TƯƠNG LAI', cx + cardWidth / 2, cardY + 45);

      // Card Emoji
      ctx.font = '72px sans-serif';
      ctx.fillText(c.emoji, cx + cardWidth / 2, cardY + 140);

      // Card Name & Vi
      ctx.fillStyle = '#fafafa';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(c.name, cx + cardWidth / 2, cardY + 205);

      ctx.fillStyle = '#fbbf24';
      ctx.font = '22px sans-serif';
      ctx.fillText(c.viName, cx + cardWidth / 2, cardY + 240);

      // Cat Subtitle
      ctx.fillStyle = '#a1a1aa';
      ctx.font = 'italic 18px sans-serif';
      const shortSub = c.catTitle.length > 22 ? c.catTitle.slice(0, 20) + '...' : c.catTitle;
      ctx.fillText(shortSub, cx + cardWidth / 2, cardY + 280);

      // Keyword Badge
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(cx + 20, cardY + 340, cardWidth - 40, 50);
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(c.keywords[0] || 'Tâm Linh', cx + cardWidth / 2, cardY + 372);
    });

    // Cat Summary & Verdict Box
    ctx.fillStyle = 'rgba(88, 28, 135, 0.4)';
    ctx.fillRect(80, 940, 920, 360);
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 940, 920, 360);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('🐾 LỜI THẦY MÈO PHÁN CHÍ MẠNG:', 540, 1000);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    // Word wrap summary
    const words = result.summary.split(' ');
    let line = '';
    let curY = 1060;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 840 && n > 0) {
        ctx.fillText(line, 540, curY);
        line = words[n] + ' ';
        curY += 45;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 540, curY);

    // Punchline
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold italic 30px sans-serif';
    ctx.fillText(`"${result.catVerdict}"`, 540, curY + 65);

    // Dev Lucky Charm Box
    ctx.fillStyle = '#18181b';
    ctx.fillRect(80, 1340, 920, 330);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 1340, 920, 330);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('🧿 BÙA HỘ MỆNH DEV HÔM NAY 🧿', 540, 1400);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4f4f5';
    ctx.font = '28px sans-serif';
    ctx.fillText(`🎯 Con Số May Mắn: `, 120, 1470);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 32px monospace';
    ctx.fillText(result.luckyNumber, 420, 1470);

    ctx.fillStyle = '#f4f4f5';
    ctx.font = '28px sans-serif';
    ctx.fillText(`🎨 Màu Phong Thủy: `, 120, 1535);
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(result.luckyColor, 420, 1535);

    ctx.fillStyle = '#f4f4f5';
    ctx.font = '28px sans-serif';
    ctx.fillText(`⚠️ Điều Kiêng Kỵ: `, 120, 1600);
    ctx.fillStyle = '#f87171';
    ctx.font = 'italic 26px sans-serif';
    const tabooShort = result.taboo.length > 34 ? result.taboo.slice(0, 33) + '...' : result.taboo;
    ctx.fillText(tabooShort, 420, 1600);

    // Footer & Call to Action
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 26px monospace';
    ctx.fillText('Quét QR hoặc truy cập: aisurvival.dev để thử vận mệnh!', 540, 1750);
    ctx.fillStyle = '#e4e4e7';
    ctx.font = '22px sans-serif';
    ctx.fillText('Mèo Dev Sinh Tồn • Cứu đói 5k Pate để Mèo không bị xoá server', 540, 1800);

    // Trigger Download
    const link = document.createElement('a');
    link.download = `Que_Tarot_Thay_Meo_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const zodiac = getZodiacSign(birthDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-purple-900/60 rounded-3xl shadow-[0_0_50px_rgba(147,51,234,0.25)] overflow-hidden font-sans flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-purple-950 via-zinc-900 to-zinc-950 border-b border-purple-900/40">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-purple-900/80 text-purple-300 border border-purple-500/40 shadow-inner">
              <Moon className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-1.5">
                  THẦY MÈO BÓI QUẺ TAROT
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    22 Major Arcana
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                {phase === 'input' && 'Bước 1: Chọn chủ đề & khấn nguyện'}
                {phase === 'picking' && `Bước 2: Tự tay chọn 3 lá (${selectedCardIds.length}/3)`}
                {phase === 'revealing' && 'Bước 3: Lật mở vận mệnh tâm linh'}
                {phase === 'result' && 'Bước 4: Luận giải quẻ & Bùa hộ mệnh'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Âm thanh Toggle */}
            <button
              onClick={toggleSound}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 transition"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Lịch sử button */}
            {historyList.length > 0 && (
              <button
                onClick={() => setShowHistoryModal(true)}
                title="Lịch sử quẻ đã bốc"
                className="p-1.5 rounded-xl text-zinc-400 hover:text-purple-300 hover:bg-zinc-800 border border-zinc-800 transition flex items-center gap-1 text-xs font-mono"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">({historyList.length})</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* ======================================================== */}
          {/* PHASE 1: INPUT (Chủ Đề & Câu Hỏi) */}
          {/* ======================================================== */}
          {phase === 'input' && (
            <form onSubmit={handleStartPicking} className="space-y-4 animate-in fade-in">
              
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-mono font-semibold text-purple-300 mb-2">
                  1. CHỌN CHỦ ĐỀ CẦN THẦY MÈO PHÁN:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TAROT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-950/80 border-purple-500 shadow-lg shadow-purple-950/50'
                            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xl mb-1">{cat.icon}</div>
                        <div className="text-xs font-bold text-zinc-100 truncate">{cat.name}</div>
                        <div className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{cat.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample Quick Questions */}
              <div>
                <span className="text-[11px] text-zinc-400 font-mono">Gợi ý câu hỏi nhanh:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedCategory.defaultQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        soundEngine.playCardSelect();
                        setQuestion(q);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 hover:border-purple-600 text-zinc-300 hover:text-purple-300 transition text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Input */}
              <div>
                <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">
                  2. CÂU HỎI TÂM NGUYỆN CỦA BẠN:
                </label>
                <textarea
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Gõ điều bạn đang trăn trở nhất vào đây..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-2xl p-3 text-xs text-zinc-100 outline-none transition resize-none"
                />
              </div>

              {/* Birthdate & Redeem Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span>3. NGÀY SINH CỦA BẠN:</span>
                    <span className="text-purple-400 font-normal">
                      {zodiac.icon} {zodiac.name}
                    </span>
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-zinc-300 mb-1.5">
                    MÃ KÍCH HOẠT (TRT-XXXX):
                  </label>
                  <input
                    type="text"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="TRT-FREE-TEST"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono outline-none uppercase"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 font-mono">
                  {error}
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-950/60 transition group"
              >
                <Sparkles className="w-4 h-4 text-purple-200 group-hover:rotate-12 transition-transform" />
                <span>Bắt Đầu Xáo Bài & Trải Quẻ</span>
                <ChevronRight className="w-4 h-4" />
              </button>

            </form>
          )}

          {/* ======================================================== */}
          {/* PHASE 2: PICKING (Trải Bài Tương Tác 22 Lá) */}
          {/* ======================================================== */}
          {phase === 'picking' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-purple-950/40 border border-purple-800/40 rounded-2xl">
                <div>
                  <h4 className="text-xs font-mono font-bold text-purple-200 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-400" />
                    BỘ BÀI MÈO HUYỀN THUẬT (22 LÁ MAJOR ARCANA)
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Hãy tĩnh tâm và click chọn lần lượt 3 lá bài theo trực giác của bạn
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleAutoPick}
                    className="text-[11px] px-3 py-1.5 rounded-xl bg-zinc-900 border border-purple-700/60 hover:bg-purple-900/60 text-purple-300 font-mono transition flex-1 sm:flex-initial"
                  >
                    🎲 Bốc nhanh hộ tao
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhase('input')}
                    className="text-[11px] px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 transition"
                  >
                    Đổi câu hỏi
                  </button>
                </div>
              </div>

              {/* 3 Selected Slots */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 py-1">
                {[0, 1, 2].map((slotIdx) => {
                  const cardId = selectedCardIds[slotIdx];
                  const card = cardId !== undefined ? TAROT_DECK_22.find((c) => c.id === cardId) : null;
                  const label = slotIdx === 0 ? '1. Quá Khứ' : slotIdx === 1 ? '2. Hiện Tại' : '3. Tương Lai';

                  return (
                    <div
                      key={slotIdx}
                      className={`relative rounded-2xl border p-2.5 text-center flex flex-col items-center justify-center min-h-[110px] transition-all ${
                        card
                          ? 'bg-purple-950/70 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                          : 'bg-zinc-900/40 border-dashed border-zinc-800'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-purple-300 font-semibold mb-1">
                        {label}
                      </span>
                      {card ? (
                        <div className="space-y-0.5 animate-in zoom-in-90">
                          <div className="text-2xl">{card.emoji}</div>
                          <div className="text-[11px] font-bold text-zinc-100 truncate w-full px-1">
                            {card.name}
                          </div>
                          <div className="text-[9px] text-purple-300 truncate w-full px-1">
                            {card.viName}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-zinc-600">
                          <Eye className="w-5 h-5 mb-1 opacity-50" />
                          <span className="text-[10px]">Chờ chọn</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 22 Cards Deck Horizontal / Grid Display */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3 max-h-[360px] overflow-y-auto">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {TAROT_DECK_22.map((card) => {
                    const isSelected = selectedCardIds.includes(card.id);
                    const pickIndex = selectedCardIds.indexOf(card.id);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => handleToggleCardPick(card.id)}
                        className={`group relative aspect-[2/3] rounded-xl border flex flex-col items-center justify-center p-1.5 transition-all transform hover:-translate-y-1.5 hover:shadow-lg ${
                          isSelected
                            ? 'bg-gradient-to-b from-purple-800 to-indigo-950 border-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.6)] scale-105 z-10'
                            : 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-zinc-700/60 hover:border-purple-500'
                        }`}
                      >
                        {/* Selected Badge */}
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-purple-500 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow">
                            {pickIndex + 1}
                          </div>
                        )}

                        {/* Back Design */}
                        <div className="w-full h-full rounded-lg border border-purple-900/30 flex flex-col items-center justify-between p-1 bg-purple-950/20">
                          <span className="text-[8px] font-mono text-purple-400/80">{card.roman}</span>
                          <div className="text-xl group-hover:scale-110 transition-transform">
                            {isSelected ? card.emoji : '🔮'}
                          </div>
                          <span className="text-[8px] font-mono text-zinc-400 truncate w-full text-center">
                            {isSelected ? card.name.split(' ')[0] : 'TAROT'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 font-mono">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                disabled={selectedCardIds.length !== 3 || isLoading}
                onClick={() => handleFetchReading()}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-950/60 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {selectedCardIds.length === 3
                    ? 'Thỉnh Thầy Mèo Luận Giải Vận Mệnh'
                    : `Hãy chọn đủ 3 lá bài (${selectedCardIds.length}/3)`}
                </span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* PHASE 3: REVEALING (Lật bài 3D Animation & Loading) */}
          {/* ======================================================== */}
          {phase === 'revealing' && (
            <div className="py-8 space-y-6 text-center animate-in fade-in">
              <div className="flex items-center justify-center gap-2 text-purple-300 font-mono text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Thầy Mèo đang tụ khí kết nối trường năng lượng...</span>
              </div>

              {/* 3D Cards Flip Stage */}
              <div className="grid grid-cols-3 gap-3 sm:gap-6 max-w-md mx-auto" style={{ perspective: '1000px' }}>
                {[0, 1, 2].map((idx) => {
                  const cardId = selectedCardIds[idx];
                  const card = TAROT_DECK_22.find((c) => c.id === cardId);
                  const isFlipped = flippedCards[idx];

                  return (
                    <div
                      key={idx}
                      className="relative aspect-[2/3] w-full transition-all duration-700 cursor-pointer"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      }}
                      onClick={() => handleFlipSingleCard(idx)}
                    >
                      {/* Mặt Úp (Back of Card) */}
                      <div
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-900 to-zinc-950 border-2 border-purple-500/60 p-2 flex flex-col items-center justify-center shadow-2xl"
                        style={{ backfaceVisibility: 'hidden' }}
                      >
                        <Eye className="w-8 h-8 text-purple-400 animate-pulse mb-2" />
                        <span className="text-[10px] font-mono text-purple-300">
                          {idx === 0 ? 'Quá Khứ' : idx === 1 ? 'Hiện Tại' : 'Tương Lai'}
                        </span>
                      </div>

                      {/* Mặt Ngửa (Front of Card) */}
                      <div
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-zinc-900 to-purple-950 border-2 border-purple-400 p-2 flex flex-col items-center justify-between text-center shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                        style={{
                          backfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                        }}
                      >
                        <span className="text-[10px] font-mono text-purple-300">{card?.roman}</span>
                        <div className="text-3xl my-1">{card?.emoji}</div>
                        <div>
                          <div className="text-[11px] font-bold text-zinc-100 truncate w-full">
                            {card?.name}
                          </div>
                          <div className="text-[9px] text-purple-300">
                            {card?.viName}
                          </div>
                        </div>
                        <span className="text-[8px] bg-purple-950/80 text-purple-200 px-1.5 py-0.5 rounded border border-purple-800">
                          {card?.element}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-zinc-400 italic">
                *Các lá bài đang lần lượt giải mã vận mệnh...
              </p>
            </div>
          )}

          {/* ======================================================== */}
          {/* PHASE 4: RESULT (Kết Quả Luận Giải & Bùa Hộ Mệnh Dev) */}
          {/* ======================================================== */}
          {phase === 'result' && result && (
            <div className="space-y-5 animate-in fade-in">
              
              {/* 3 Lá Bài Trực Quan */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {result.drawnCards.map((c, idx) => (
                  <div
                    key={idx}
                    className="bg-gradient-to-b from-purple-950/60 to-zinc-900 border border-purple-700/40 rounded-2xl p-2.5 text-center flex flex-col items-center justify-between shadow-lg"
                  >
                    <span className="text-[9px] font-mono text-purple-400 font-bold uppercase mb-1">
                      {idx === 0 ? '1. Quá Khứ' : idx === 1 ? '2. Hiện Tại' : '3. Tương Lai'}
                    </span>
                    <div className="text-3xl my-1">{c.emoji}</div>
                    <div className="text-xs font-bold font-mono text-zinc-100 truncate w-full">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-amber-300 font-medium">
                      {c.viName}
                    </div>
                    <div className="text-[9px] text-zinc-400 italic mt-0.5 line-clamp-1">
                      {c.catTitle}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lời Phán Tổng Quan Cực Bén */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-zinc-900 to-purple-950/80 border border-purple-600/50 space-y-2 shadow-lg">
                <div className="flex items-center gap-2 text-purple-300 font-mono text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>THẦY MÈO PHÁN TỔNG QUAN:</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-100 font-medium leading-relaxed">
                  &ldquo;{result.summary}&rdquo;
                </p>
              </div>

              {/* Phân Tích 3 Tầng Chi Tiết */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  LUẬN GIẢI 3 TẦNG THỜI GIAN:
                </h5>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold font-mono">
                    <span>⏳ 1. Quá Khứ & Cội Nguồn ({result.drawnCards[0]?.name}):</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed pl-4">{result.card1Analysis}</p>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold font-mono">
                    <span>⚡ 2. Hiện Tại & Thực Trạng ({result.drawnCards[1]?.name}):</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed pl-4">{result.card2Analysis}</p>
                </div>

                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold font-mono">
                    <span>🚀 3. Tương Lai & Lời Khuyên ({result.drawnCards[2]?.name}):</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed pl-4">{result.card3Analysis}</p>
                </div>
              </div>

              {/* Lời Khuyên Tâm Huyết & Châm Ngôn */}
              <div className="p-3.5 bg-indigo-950/30 border border-indigo-800/40 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs font-bold">
                  <Flame className="w-4 h-4 text-indigo-400" />
                  <span>LỜI KHUYÊN TỪ VŨ TRỤ:</span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  {result.advice}
                </p>
                <div className="pt-2 border-t border-indigo-900/40 flex items-center gap-2 text-xs text-cyan-300 font-mono italic">
                  <span>🐾 Châm ngôn:</span>
                  <span>&ldquo;{result.catVerdict}&rdquo;</span>
                </div>
              </div>

              {/* BÙA HỘ MỆNH DEV HÔM NAY */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-purple-950/40 border border-amber-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🧿 BÙA HỘ MỆNH DEV HÔM NAY</span>
                  </h5>
                  <span className="text-[10px] text-zinc-400 font-mono">Hiệu lực: 24h</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 font-mono block">Con số may mắn</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {result.luckyNumber}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 font-mono block">Màu phong thủy</span>
                    <span className="text-xs font-bold text-purple-300 truncate block mt-1">
                      {result.luckyColor}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <span className="text-[10px] text-zinc-400 font-mono block">Điều kiêng kỵ</span>
                    <span className="text-[11px] font-medium text-rose-300 truncate block mt-1">
                      {result.taboo}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS (Share Story / Sao Chép / Bốc Lại) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadStoryImage}
                  className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Ảnh Story</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowStoryModal(true)}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-purple-300 border border-purple-800/40 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Xem Thẻ 9:16</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReading}
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playTarotShuffle();
                    setPhase('input');
                  }}
                  className="py-2.5 px-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bốc quẻ mới</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* MODAL: STORY 9:16 PREVIEW */}
        {/* ======================================================== */}
        {showStoryModal && result && (
          <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in">
            <div className="relative w-full max-w-sm aspect-[9/16] max-h-[82vh] bg-gradient-to-b from-purple-950 via-zinc-950 to-zinc-950 border-2 border-purple-500 rounded-3xl p-5 flex flex-col justify-between shadow-[0_0_30px_rgba(168,85,247,0.4)] text-center overflow-hidden">
              <button
                onClick={() => setShowStoryModal(false)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-mono text-purple-300 tracking-widest uppercase">
                  AI Survival Store • Quẻ Bói Cứu Mèo
                </span>
                <h3 className="font-mono text-base font-bold text-zinc-100">
                  THẦY MÈO PHÁN VẬN MỆNH
                </h3>
              </div>

              {/* Question */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 text-xs text-rose-300 italic">
                &ldquo;{result.question}&rdquo;
              </div>

              {/* 3 Mini Cards */}
              <div className="grid grid-cols-3 gap-1.5">
                {result.drawnCards.map((c, i) => (
                  <div key={i} className="p-2 rounded-xl bg-purple-950/60 border border-purple-700/60 text-center">
                    <div className="text-xl">{c.emoji}</div>
                    <div className="text-[10px] font-bold text-zinc-100 truncate">{c.name}</div>
                    <div className="text-[8px] text-purple-300 truncate">{c.viName}</div>
                  </div>
                ))}
              </div>

              {/* Punchline */}
              <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl p-3">
                <p className="text-[11px] text-zinc-200 font-medium leading-relaxed line-clamp-3">
                  {result.summary}
                </p>
                <div className="text-xs text-amber-300 font-bold mt-1">
                  &ldquo;{result.catVerdict}&rdquo;
                </div>
              </div>

              {/* Lucky Charm */}
              <div className="bg-zinc-900 border border-amber-600/40 rounded-xl p-2 text-[10px] font-mono flex items-center justify-around text-zinc-300">
                <span>🎯 Số: <strong className="text-emerald-400">{result.luckyNumber}</strong></span>
                <span>🎨 Màu: <strong className="text-purple-300">{result.luckyColor.split(' ')[0]}</strong></span>
              </div>

              {/* Story Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadStoryImage}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh PNG</span>
                </button>
                <button
                  onClick={() => setShowStoryModal(false)}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL: HISTORY VIEW */}
        {/* ======================================================== */}
        {showHistoryModal && (
          <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h4 className="font-mono text-sm font-bold text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                LỊCH SỬ CÁC QUẺ BÓI ĐÃ XEM ({historyList.length})
              </h4>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {historyList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setResult(item);
                    setPhase('result');
                    setShowHistoryModal(false);
                  }}
                  className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-600 cursor-pointer transition space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="text-purple-400 font-bold">{item.category || 'Tâm Linh'}</span>
                    <span>{item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                  <div className="text-xs font-bold text-zinc-100 truncate">
                    ❓ {item.question}
                  </div>
                  <div className="text-[11px] text-zinc-300 line-clamp-1 italic">
                    🐱 &ldquo;{item.summary}&rdquo;
                  </div>
                  <div className="flex gap-2 text-[10px] text-purple-300 font-mono pt-1">
                    {item.drawnCards.map((c, i) => (
                      <span key={i}>{c.emoji} {c.name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('meo_tarot_history');
                setHistoryList([]);
                setShowHistoryModal(false);
              }}
              className="py-2 text-center text-xs text-rose-400 hover:underline font-mono"
            >
              Xóa toàn bộ lịch sử quẻ bói
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
