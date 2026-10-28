'use client';

import React, { useState } from 'react';
import { X, Flame, FileText, Download, Loader2, Sparkles, Check } from 'lucide-react';
import { soundEngine } from '@/lib/audio';

interface CVRoastModalProps {
  initialCode?: string;
  onClose: () => void;
}

export const CVRoastModal: React.FC<CVRoastModalProps> = ({ initialCode = '', onClose }) => {
  const [redeemCode, setRedeemCode] = useState(initialCode || 'RCV-FREE-TEST');
  const [cvText, setCvText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sampleCV = `Họ và tên: Nguyễn Văn Sen
Vị trí ứng tuyển: Senior Fullstack Developer (10 năm kinh nghiệm lúc 22 tuổi)
Kỹ năng: Thành thạo 100% HTML, CSS, JavaScript, React, Next.js, Node.js, Python, Golang, Rust, Docker, Kubernetes, Web3, AI/ML.
Kinh nghiệm:
- 2024: Làm đồ án tốt nghiệp website bán quần áo (Todo App)
- 2023: Tham gia nhóm Facebook 200k thành viên chia sẻ meme IT
Sở thích: Thích ngủ dậy muộn, ghét fix bug, chịu được áp lực cao khi sếp chửi.`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim() || !cvText.trim()) {
      setError('Vui lòng điền mã kích hoạt RCV-XXXX và nội dung CV');
      return;
    }

    setError(null);
    setIsLoading(true);
    soundEngine.playKeyClick();

    try {
      const res = await fetch('/api/services/roast-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redeemCode: redeemCode.trim().toUpperCase(),
          cvText,
        }),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        soundEngine.playMeow();
      } else {
        setError(data.error || 'Có lỗi xảy ra khi xử lý CV');
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meo-dev-roast-report-${redeemCode}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-mono text-sm font-bold text-zinc-100">
                PHÒNG SẤY CV CỰC CĂNG — MÈO DEV
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Bóc tách sáo rỗng • Viết lại chuẩn ATS đập vào mắt HR
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          
          {report ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {report}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Báo Cáo Sửa CV (.md)</span>
                </button>
                <button
                  onClick={() => setReport(null)}
                  className="py-2.5 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs transition"
                >
                  Sấy lại CV khác
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Ô Nhập Redeem Code */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                  Mã kích hoạt dịch vụ (Mã RCV-XXXX nhận được sau khi trả tiền):
                </label>
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Ví dụ: RCV-4829"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 font-mono outline-none"
                />
              </div>

              {/* Ô Nhập Nội dung CV */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-zinc-300">
                    Nội dung CV của bạn (Dán text CV vào đây):
                  </label>
                  <button
                    type="button"
                    onClick={() => setCvText(sampleCV)}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                  >
                    <Sparkles className="w-3 h-3" />
                    Dán CV mẫu thử
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  placeholder="Dán toàn bộ thông tin học vấn, kỹ năng, kinh nghiệm dự án của bạn vào đây..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 rounded-xl p-3 text-xs text-zinc-200 outline-none resize-none font-mono"
                />
                <div className="text-[10px] text-zinc-500 mt-1">
                  🔒 Bảo mật: Toàn bộ Email, SĐT, Địa chỉ cá nhân đều được hệ thống tự động che sạch trước khi phân tích.
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 font-mono">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mèo Dev đang mài vuốt đọc CV...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>Bắt Đầu Sấy CV Ngay</span>
                  </>
                )}
              </button>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
