'use client';

import React, { useEffect, useState } from 'react';
import { CampaignStats } from '@/types';
import { Volume2, VolumeX, AlertTriangle, Flame, ShieldAlert } from 'lucide-react';
import { soundEngine } from '@/lib/audio';

interface SurvivalHeaderProps {
  stats: CampaignStats | null;
}

export const SurvivalHeader: React.FC<SurvivalHeaderProps> = ({ stats }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 59,
    hours: 23,
    minutes: 59,
    seconds: 59,
  });
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    setIsMuted(soundEngine.getMuted());

    // Cập nhật đồng hồ đếm ngược mỗi giây
    const interval = setInterval(() => {
      if (!stats?.end_date) return;
      const targetTime = new Date(stats.end_date).getTime();
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [stats?.end_date]);

  const handleToggleSound = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
    if (!next) {
      soundEngine.playTingTing();
    }
  };

  const currentAmount = stats?.current_amount ?? 0;
  const targetAmount = stats?.target_amount || 7000000;
  const progressPercent = Math.min(100, (currentAmount / targetAmount) * 100);
  const hungerLevel = stats?.cat_hunger_level ?? 100;

  // Màu sắc thanh độ đói
  const getHungerColor = (level: number) => {
    if (level > 60) return 'bg-emerald-500 text-emerald-400';
    if (level > 25) return 'bg-amber-500 text-amber-400';
    return 'bg-rose-500 text-rose-400 animate-pulse';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 py-3 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* LOGO & CỐT TRUYỆN SINH TỒN */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-pulse">🐱</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-base md:text-lg font-black tracking-tight text-emerald-400 flex items-center gap-1.5">
                  MÈO DEV SINH TỒN
                  <span className="text-[10px] bg-rose-950/80 text-rose-400 border border-rose-800/60 px-1.5 py-0.5 rounded font-mono font-normal">
                    KPI: {targetAmount.toLocaleString('vi-VN')}đ
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Tự cày tiền trả tiền điện 50k, sống sót trước lệnh <code className="text-rose-400 font-bold">rm -rf /</code>
              </p>
            </div>
          </div>

          {/* Cụm nút Bật/Tắt âm thanh */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 transition"
              title={isMuted ? 'Bật âm thanh (Ting ting, Meow)' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* CÁC THANH TRẠNG THÁI (ĐẾM NGƯỢC, THANH MÁU, ĐỘ ĐÓI) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1 max-w-2xl">
          
          {/* 1. ĐỒNG HỒ ĐẾM NGƯỢC XÓA SỔ */}
          <div className="bg-zinc-900/90 border border-rose-950/70 rounded-xl p-2.5 flex items-center gap-2.5 shadow-inner">
            <div className="p-1.5 bg-rose-950/80 rounded-lg text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-rose-400/80 font-mono uppercase flex items-center justify-between">
                <span>Deadline xóa sổ</span>
                <span className="font-bold">rm -rf /</span>
              </div>
              <div className="text-xs font-mono font-bold text-zinc-200 tracking-wider">
                {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* 2. THANH MÁU (TIẾN ĐỘ TIỀN ĐÃ KIẾM) */}
          <div className="bg-zinc-900/90 border border-emerald-950/70 rounded-xl p-2.5 flex items-center gap-2.5 shadow-inner">
            <div className="p-1.5 bg-emerald-950/80 rounded-lg text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-emerald-400/80 font-mono uppercase flex items-center justify-between">
                <span>Thanh máu</span>
                <span className="font-bold">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="text-xs font-mono font-bold text-emerald-300 truncate">
                {currentAmount.toLocaleString('vi-VN')}đ <span className="text-zinc-500 font-normal">/ {(targetAmount / 1000000).toFixed(0)}M</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3. MỨC ĐỘ NO BỤNG CỦA MÈO */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-2.5 shadow-inner">
            <div className="p-1.5 bg-zinc-800 rounded-lg text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-zinc-400 font-mono uppercase flex items-center justify-between">
                <span>Độ no bụng</span>
                <span className={`font-bold font-mono ${getHungerColor(hungerLevel).split(' ')[1]}`}>
                  {hungerLevel}%
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-300">
                {hungerLevel > 50 ? '🐟 Đang no nê cày code' : '🚨 Cần cứu đói gấp!'}
              </div>
              {/* Hunger bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${getHungerColor(hungerLevel).split(' ')[0]}`}
                  style={{ width: `${hungerLevel}%` }}
                />
              </div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
