'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Heart, Sparkles, ExternalLink } from 'lucide-react';
import { Order } from '@/types';
import { getSupabaseClient } from '@/lib/supabase/client';

interface HallOfFameProps {
  onOpenCertificate?: (order: Order) => void;
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ onOpenCertificate }) => {
  const [donors, setDonors] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDonors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/hall-of-fame');
      const data = await res.json();
      if (data.success && data.donors) {
        setDonors(data.donors);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Fetch 1 lần duy nhất khi mount
    fetchDonors();

    // 2. Lắng nghe Realtime qua Supabase WebSocket (Zero HTTP GET Polling)
    const supabase = getSupabaseClient();
    if (supabase) {
      const channel = supabase
        .channel('realtime_hall_of_fame')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            const updated = payload.new as Order;
            if (updated && updated.status === 'PAID') {
              fetchDonors();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Fallback nếu không có Supabase (chu kỳ rất chậm 60s)
      const interval = setInterval(fetchDonors, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchDonors]);

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return 'Vừa xong';
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return `${diffSec} giây trước`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      return `${Math.floor(diffHour / 24)} ngày trước`;
    } catch {
      return 'Gần đây';
    }
  };

  return (
    <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 md:p-5 shadow-xl font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-4">
        <div>
          <h3 className="font-mono text-sm md:text-base font-bold text-zinc-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            BẢNG VÀNG ÂN NHÂN CỨU MẠNG MÈO (HALL OF FAME)
          </h3>
          <p className="text-xs text-zinc-400">
            Vinh danh những tấm lòng hảo tâm đã donate pate hoặc mua dịch vụ giúp Mèo Dev sống sót qua 60 ngày!
          </p>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-mono text-pink-400 bg-pink-950/40 border border-pink-800/40 px-2.5 py-1 rounded-lg w-fit">
          <Heart className="w-3.5 h-3.5 fill-current" />
          <span>Ghim lưu truyền trên server 24h</span>
        </div>
      </div>

      {isLoading && donors.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500 font-mono">
          Đang tải danh sách ân nhân...
        </div>
      ) : donors.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500 font-mono flex flex-col items-center justify-center gap-1.5 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/40">
          <span className="text-xl">🐟</span>
          <p className="text-zinc-300 font-medium font-sans">Chưa có ân nhân nào mở bát cứu trợ!</p>
          <p className="text-[11px] text-zinc-500 font-sans">Hãy là người đầu tiên ủng hộ 5k pate để tên của bạn được vinh danh trang trọng tại đây.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {donors.map((d, idx) => (
            <div
              key={d.id || idx}
              className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-amber-500/40 transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-amber-950/80 border border-amber-700/50 flex items-center justify-center text-xs font-mono font-bold text-amber-400 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-xs text-zinc-200 truncate">
                      {d.buyer_name || 'Ân nhân giấu tên'}
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-400 shrink-0">
                    +{d.amount.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {d.buyer_note ? (
                  <p className="text-xs text-zinc-400 italic bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/50 mb-2">
                    &ldquo;{d.buyer_note}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-zinc-600 italic mb-2">
                    (Ủng hộ âm thầm, không để lại lời nhắn)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-zinc-900 pt-2">
                <span>{formatRelativeTime(d.paid_at || d.created_at)}</span>

                <div className="flex items-center gap-2">
                  {onOpenCertificate && (
                    <button
                      onClick={() => onOpenCertificate(d)}
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Chứng chỉ
                    </button>
                  )}
                  {d.buyer_social_link && (
                    <a
                      href={d.buyer_social_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-400 flex items-center gap-0.5"
                    >
                      <span>FB</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
