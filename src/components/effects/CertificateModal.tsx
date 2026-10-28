'use client';

import React, { useRef } from 'react';
import { X, Award, Share2, Download, Check, Sparkles } from 'lucide-react';
import { Order } from '@/types';
import { soundEngine } from '@/lib/audio';

interface CertificateModalProps {
  order: Order | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ order, onClose }) => {
  const certRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!order) return null;

  const handleShare = () => {
    soundEngine.playKeyClick();
    if (navigator.share) {
      navigator.share({
        title: 'Chứng Chỉ Ân Nhân Cứu Mạng Mèo Dev',
        text: `Tao vừa ủng hộ ${order.amount.toLocaleString('vi-VN')}đ cứu mạng con Mèo Dev thoát khỏi lệnh rm -rf / trên server!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="font-mono text-sm font-bold text-zinc-100">
              CHỨNG NHẬN CỨU MẠNG MÈO DEV
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CERTIFICATE CANVAS */}
        <div className="p-6">
          <div
            ref={certRef}
            className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 border-4 border-amber-500/70 rounded-2xl p-6 text-center space-y-4 shadow-2xl shadow-amber-950/20"
          >
            {/* Corner ornaments */}
            <div className="absolute top-2 left-2 text-amber-500/60 font-mono text-xs">◆</div>
            <div className="absolute top-2 right-2 text-amber-500/60 font-mono text-xs">◆</div>
            <div className="absolute bottom-2 left-2 text-amber-500/60 font-mono text-xs">◆</div>
            <div className="absolute bottom-2 right-2 text-amber-500/60 font-mono text-xs">◆</div>

            <div className="text-3xl">🎖️ 🐱 🐟</div>

            <div>
              <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">
                SERVER 50K • LINUX UBUNTU KHOÁNG ĐẠT
              </div>
              <h2 className="text-lg md:text-xl font-black font-mono text-zinc-100 mt-1">
                CHỨNG CHỈ ÂN NHÂN CỨU THẾ
              </h2>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Trang trọng chứng nhận vị anh hùng thảo dã:
            </p>

            <div className="py-1">
              <span className="text-base md:text-lg font-black text-amber-300 font-mono border-b-2 border-amber-400/60 pb-1 px-4 inline-block">
                {order.buyer_name || 'Ân Nhân Giấu Tên'}
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Đã hào hiệp đóng góp số tiền <strong className="text-emerald-400">{order.amount.toLocaleString('vi-VN')} VNĐ</strong> ({order.product?.name || order.product_id}), kịp thời tiếp tế năng lượng giúp Mèo Dev chống lại script hủy diệt <code className="text-rose-400 font-bold">rm -rf /</code>!
            </p>

            {order.buyer_note && (
              <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-400 italic font-mono">
                &ldquo;{order.buyer_note}&rdquo;
              </div>
            )}

            {/* CON DẤU SERVER */}
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 text-[10px] font-mono text-zinc-500">
              <div className="text-left">
                <div>MÃ ĐƠN: {order.order_code}</div>
                <div>NGÀY: {new Date(order.paid_at || order.created_at).toLocaleDateString('vi-VN')}</div>
              </div>

              {/* Dấu đỏ mộc */}
              <div className="w-16 h-16 rounded-full border-2 border-rose-500/80 flex flex-col items-center justify-center text-rose-400 rotate-[-12deg] shadow-inner">
                <span className="text-[8px] font-bold uppercase">MÈO DEV</span>
                <span className="text-[12px] font-black">ĐÃ DUYỆT</span>
                <span className="text-[7px]">SURVIVED</span>
              </div>
            </div>

          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-bold font-mono text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/40"
            >
              {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Đã copy link!' : 'Chia sẻ lên Story Facebook'}</span>
            </button>
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 text-xs font-mono transition"
            >
              Đóng
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
