'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Sparkles, Check, Download, AlertCircle, Copy, Gift, ArrowRight } from 'lucide-react';
import { getChemistryCountdown } from '@/lib/constants';
import { soundEngine } from '@/lib/audio';
import confetti from 'canvas-confetti';

interface ChemistryPreorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTierId?: string;
}

export const ChemistryPreorderModal: React.FC<ChemistryPreorderModalProps> = ({
  isOpen,
  onClose,
  selectedTierId = 'CHEM-PACK',
}) => {
  const [countdown, setCountdown] = useState({
    days: 3,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCountdown(getChemistryCountdown());
    const timer = setInterval(() => {
      setCountdown(getChemistryCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ Gmail hợp lệ');
      return;
    }

    setIsLoading(true);
    setError(null);
    soundEngine.playKeyClick();

    try {
      const res = await fetch('/api/preorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: name.trim() || 'Học sinh 2k8',
          packageId: selectedTierId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsSuccess(true);
        soundEngine.playNomNom();
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } else {
        setError(data.error || 'Có lỗi khi đăng ký. Vui lòng thử lại!');
      }
    } catch {
      setError('Lỗi kết nối máy chủ. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Gói Đang Hoàn Thiện • Mở Bán Sau 3 Ngày</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* ĐỒNG HỒ ĐẾM NGƯỢC */}
          <div className="bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-600/40 rounded-2xl p-4 text-center">
            <p className="text-[11px] font-mono text-amber-300 mb-2 uppercase tracking-wide">
              ⏳ Đếm ngược đến giờ mở bán chính thức:
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-zinc-100 font-mono">
              <div className="flex flex-col items-center bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-xl min-w-[52px]">
                <span className="text-lg sm:text-xl font-black text-amber-400">{countdown.days}</span>
                <span className="text-[9px] text-zinc-400">Ngày</span>
              </div>
              <span className="text-amber-500 font-bold">:</span>
              <div className="flex flex-col items-center bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-xl min-w-[52px]">
                <span className="text-lg sm:text-xl font-black text-amber-400">{String(countdown.hours).padStart(2, '0')}</span>
                <span className="text-[9px] text-zinc-400">Giờ</span>
              </div>
              <span className="text-amber-500 font-bold">:</span>
              <div className="flex flex-col items-center bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-xl min-w-[52px]">
                <span className="text-lg sm:text-xl font-black text-amber-400">{String(countdown.minutes).padStart(2, '0')}</span>
                <span className="text-[9px] text-zinc-400">Phút</span>
              </div>
              <span className="text-amber-500 font-bold">:</span>
              <div className="flex flex-col items-center bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-xl min-w-[52px]">
                <span className="text-lg sm:text-xl font-black text-emerald-400">{String(countdown.seconds).padStart(2, '0')}</span>
                <span className="text-[9px] text-zinc-400">Giây</span>
              </div>
            </div>
          </div>

          {!isSuccess ? (
            <>
              {/* LỜI NHẮN TỪ MÈO DEV */}
              <div className="space-y-1.5 text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/80">
                <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mèo Dev đang đóng gói đợt đề thi thử & bẫy Casio cuối cùng:</span>
                </div>
                <p className="text-zinc-400">
                  Thư mục Google Drive tuyển chọn đang được bổ sung bài toán vận dụng cao và lời giải chi tiết 3 mốc (8+, 9+, 10+) để đảm bảo bạn nhận được tài liệu chất lượng nhất.
                </p>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono flex items-center gap-2">
                  <Gift className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Đăng ký Gmail giữ chỗ ngay hôm nay để nhận <strong>Bộ đề thi thử FREE</strong> + <strong>Voucher giảm 20%</strong> khi mở bán!</span>
                </div>
              </div>

              {/* FORM ĐĂNG KÝ */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-300">Tên của bạn (Tùy chọn):</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A (2k8)"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-300 flex items-center justify-between">
                    <span>Địa chỉ Gmail nhận quà & thông báo: <strong className="text-rose-400">*</strong></span>
                    <span className="text-[10px] text-emerald-400">Bảo mật 100%</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vidu@gmail.com"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-mono outline-none"
                  />
                </div>

                {error && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 font-mono flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 disabled:opacity-40 font-bold text-zinc-950 font-mono text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40 transition cursor-pointer"
                >
                  {isLoading ? (
                    <span>Đang ghi danh...</span>
                  ) : (
                    <>
                      <span>🎯 Nhận Đề Thi Thử FREE & Giữ Chỗ Voucher 20%</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* TRẠNG THÁI THÀNH CÔNG */
            <div className="space-y-3.5 text-center py-2 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <div>
                <h4 className="text-base font-bold font-mono text-emerald-400">ĐĂNG KÝ GIỮ CHỖ THÀNH CÔNG!</h4>
                <p className="text-xs text-zinc-300 mt-1">
                  Mèo Dev đã lưu Gmail <code className="text-amber-400 font-bold">{email}</code> của bạn.
                </p>
              </div>

              {/* VOUCHER CODE */}
              <div className="p-3 bg-zinc-900 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-2 max-w-sm mx-auto">
                <div className="text-left font-mono">
                  <span className="text-[10px] text-zinc-400 block">VOUCHER GIẢM 20% KHI MỞ BÁN:</span>
                  <span className="text-sm font-black text-amber-400 tracking-wider">MEO20</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('MEO20');
                    setCopiedVoucher(true);
                    soundEngine.playKeyClick();
                    setTimeout(() => setCopiedVoucher(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 flex items-center gap-1 transition"
                >
                  {copiedVoucher ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedVoucher ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* TẢI ĐỀ THI THỬ FREE */}
              <a
                href="/api/download?preview=true&key=chem-12-lo-trinh.pdf"
                download
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 font-bold text-zinc-950 font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition block text-center"
              >
                <Download className="w-4 h-4 inline" />
                <span>Tải Ngay Bộ Đề Thi Thử Hóa Mẫu (Miễn Phí)</span>
              </a>

              <p className="text-[11px] text-zinc-500 font-mono">
                * Đúng 06:00 ngày 01/11/2026 khi mở bán chính thức, Mèo Dev sẽ gửi link Google Drive cho bạn đầu tiên!
              </p>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-5 py-2.5 border-t border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Cam kết bảo mật thông tin</span>
          <span className="text-amber-400">Hỗ trợ 24/7</span>
        </div>

      </div>
    </div>
  );
};
