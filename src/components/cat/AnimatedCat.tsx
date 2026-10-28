'use client';

import React, { useState } from 'react';
import { soundEngine } from '@/lib/audio';

export type CatMood = 'TYPING' | 'HUNGRY' | 'EATING' | 'ROASTING';

interface AnimatedCatProps {
  mood?: CatMood;
  hungerLevel?: number; // 0 to 100
  onCatClick?: () => void;
}

export const AnimatedCat: React.FC<AnimatedCatProps> = ({
  mood = 'TYPING',
  hungerLevel = 80,
  onCatClick,
}) => {
  const [speech, setSpeech] = useState<string>('Gõ phím cày 5 củ cứu mạng!');
  const [isWobbling, setIsWobbling] = useState(false);

  // Chọn câu thoại ngẫu nhiên khi click vào mèo
  const catQuotes = [
    'Meo meo! Đừng chọc, tao đang cày deadline!',
    '5k một hộp pate cứu đói đi bạn ơi!',
    'rm -rf / đang chờ tao ở ngày thứ 30 kìa...',
    'CV viết thế kia mà đòi lương 30 củ à?',
    'Ting ting một cái là tao nhảy cẫng lên liền!',
    'Lương senior của tao đâu hết rồi...',
  ];

  const handleClick = () => {
    setIsWobbling(true);
    soundEngine.playMeow();
    const randomQuote = catQuotes[Math.floor(Math.random() * catQuotes.length)];
    setSpeech(randomQuote);
    if (onCatClick) onCatClick();
    setTimeout(() => setIsWobbling(false), 600);
  };

  const isLowHunger = hungerLevel < 30;
  const currentMood: CatMood = isLowHunger && mood === 'TYPING' ? 'HUNGRY' : mood;

  return (
    <div className="relative flex flex-col items-center justify-center p-4 select-none">
      {/* Speech bubble */}
      <div className="relative mb-3 bg-zinc-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono shadow-lg shadow-emerald-950/40 max-w-[240px] text-center transition-all animate-bounce">
        <span>{speech}</span>
        {/* Tam giác đuôi bubble */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-emerald-500/50" />
      </div>

      {/* SVG Canvas của Mèo Dev 2D */}
      <div
        onClick={handleClick}
        className={`cursor-pointer transition-transform duration-300 hover:scale-105 ${
          isWobbling ? 'animate-bounce' : ''
        }`}
        title="Nhấp vào mèo để nghe tiếng meow!"
      >
        <svg
          viewBox="0 0 240 220"
          className="w-48 h-48 md:w-56 md:h-56 filter drop-shadow-[0_8px_20px_rgba(16,185,129,0.25)]"
        >
          <defs>
            <linearGradient id="catBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="laptopScreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
          </defs>

          {/* Đuôi mèo ngúng nguẩy */}
          <path
            d="M 60 160 C 20 170, 10 130, 30 115 C 35 110, 45 130, 65 150"
            fill="none"
            stroke="#d97706"
            strokeWidth="12"
            strokeLinecap="round"
            className="animate-pulse origin-bottom-right"
          />

          {/* Thân mèo tròn trịa */}
          <ellipse cx="120" cy="155" rx="55" ry="45" fill="url(#catBody)" />

          {/* Bụng mèo màu kem */}
          <ellipse cx="120" cy="165" rx="35" ry="28" fill="#fef3c7" />

          {/* Bàn làm việc IT sinh viên */}
          <rect x="25" y="180" width="190" height="12" rx="4" fill="#3f3f46" stroke="#52525b" strokeWidth="2" />

          {/* Đầu mèo */}
          <circle cx="120" cy="95" r="45" fill="url(#catBody)" />

          {/* Tai trái & Tai phải */}
          <polygon points="85,65 95,25 115,55" fill="#d97706" />
          <polygon points="90,60 97,35 110,55" fill="#fecdd3" />
          <polygon points="155,65 145,25 125,55" fill="#d97706" />
          <polygon points="150,60 143,35 130,55" fill="#fecdd3" />

          {/* Kính Hacker Cyberpunk hoặc Đôi Mắt */}
          {currentMood === 'ROASTING' ? (
            /* Kính râm cực ngầu */
            <g>
              <rect x="90" y="82" width="26" height="16" rx="3" fill="#18181b" stroke="#10b981" strokeWidth="2" />
              <rect x="124" y="82" width="26" height="16" rx="3" fill="#18181b" stroke="#10b981" strokeWidth="2" />
              <line x1="116" y1="88" x2="124" y2="88" stroke="#10b981" strokeWidth="2" />
            </g>
          ) : currentMood === 'HUNGRY' ? (
            /* Mắt rơm rớm đói */
            <g>
              <ellipse cx="102" cy="88" rx="8" ry="10" fill="#1e293b" />
              <circle cx="100" cy="85" r="3" fill="#ffffff" />
              <circle cx="104" cy="92" r="1.5" fill="#ffffff" />

              <ellipse cx="138" cy="88" rx="8" ry="10" fill="#1e293b" />
              <circle cx="136" cy="85" r="3" fill="#ffffff" />
              <circle cx="140" cy="92" r="1.5" fill="#ffffff" />
              {/* Giọt nước mắt */}
              <ellipse cx="94" cy="100" rx="2" ry="4" fill="#38bdf8" className="animate-pulse" />
            </g>
          ) : (
            /* Mắt mèo lập trình viên sáng ngời */
            <g>
              <ellipse cx="102" cy="88" rx="7" ry="9" fill="#047857" />
              <ellipse cx="102" cy="88" rx="3" ry="8" fill="#10b981" />
              <circle cx="100" cy="84" r="2.5" fill="#ffffff" />

              <ellipse cx="138" cy="88" rx="7" ry="9" fill="#047857" />
              <ellipse cx="138" cy="88" rx="3" ry="8" fill="#10b981" />
              <circle cx="136" cy="84" r="2.5" fill="#ffffff" />
            </g>
          )}

          {/* Mũi hồng */}
          <polygon points="120,102 115,97 125,97" fill="#f43f5e" />

          {/* Miệng mèo */}
          {currentMood === 'EATING' ? (
            /* Miệng cười nhai pate */
            <path d="M 112 106 Q 120 116 128 106 Z" fill="#e11d48" />
          ) : currentMood === 'HUNGRY' ? (
            /* Miệng mếu */
            <path d="M 114 110 Q 120 105 126 110" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          ) : (
            /* Miệng mèo cười chữ w */
            <path
              d="M 112 105 Q 116 110 120 105 Q 124 110 128 105"
              fill="none"
              stroke="#78350f"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}

          {/* Râu mèo */}
          <line x1="82" y1="96" x2="60" y2="92" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          <line x1="82" y1="102" x2="58" y2="105" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          <line x1="158" y1="96" x2="180" y2="92" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
          <line x1="158" y1="102" x2="182" y2="105" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />

          {/* Laptop của Mèo Dev */}
          <g>
            {/* Thân máy laptop */}
            <rect x="75" y="165" width="90" height="20" rx="3" fill="#27272a" stroke="#71717a" strokeWidth="1.5" />
            {/* Bàn phím */}
            <rect x="85" y="168" width="70" height="12" rx="1.5" fill="#18181b" />
            {/* Màn hình laptop mở góc nghiêng */}
            <polygon points="80,165 72,118 168,118 160,165" fill="#18181b" stroke="#71717a" strokeWidth="1.5" />
            <polygon points="83,163 76,122 164,122 157,163" fill="url(#laptopScreen)" />
            {/* Dòng code xanh chớp nháy trên màn hình */}
            <line x1="85" y1="130" x2="135" y2="130" stroke="#10b981" strokeWidth="2" />
            <line x1="85" y1="138" x2="150" y2="138" stroke="#34d399" strokeWidth="2" />
            <line x1="85" y1="146" x2="120" y2="146" stroke="#6ee7b7" strokeWidth="2" />
            {/* Logo Quả Táo / Quả Cá cắn dở trên lưng máy */}
            <circle cx="120" cy="142" r="5" fill="#10b981" opacity="0.6" className="animate-pulse" />
          </g>

          {/* Hai bàn chân mèo đang gõ phím lạch cạch */}
          <g className="animate-bounce">
            <ellipse cx="98" cy="164" rx="10" ry="7" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
            <ellipse cx="142" cy="164" rx="10" ry="7" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
          </g>

          {/* Hộp Pate hoặc Tim bay nếu đang ăn */}
          {currentMood === 'EATING' && (
            <g className="animate-bounce">
              {/* Hộp pate cá ngừ */}
              <ellipse cx="190" cy="175" rx="16" ry="7" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
              <rect x="174" y="165" width="32" height="10" fill="#0284c7" />
              <ellipse cx="190" cy="165" rx="16" ry="6" fill="#38bdf8" />
              <text x="178" y="172" fontSize="7" fill="#ffffff" fontWeight="bold">PATE</text>
              {/* Trái tim hồng bay lên */}
              <path
                d="M 120 40 C 120 30, 105 30, 105 45 C 105 55, 120 65, 120 65 C 120 65, 135 55, 135 45 C 135 30, 120 30, 120 40 Z"
                fill="#ec4899"
                className="animate-ping"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Trạng thái hoạt động dưới chân mèo */}
      <div className="mt-2 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
          {currentMood === 'TYPING' && 'AI đang gõ phím cày đơn...'}
          {currentMood === 'HUNGRY' && 'Đang đói lả, cần tiếp tế Pate!'}
          {currentMood === 'EATING' && 'Đang húp pate ngon lành!'}
          {currentMood === 'ROASTING' && 'Đang sấy CV cực căng!'}
        </span>
      </div>
    </div>
  );
};
