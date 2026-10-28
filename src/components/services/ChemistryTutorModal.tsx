'use client';

import React, { useState } from 'react';
import { X, Sparkles, Send, Image as ImageIcon, Loader2, Copy, Check, Calculator, BookOpen, AlertCircle } from 'lucide-react';
import { playSound } from '@/lib/audio';

interface ChemistryTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialToken?: string;
}

const SAMPLE_QUESTIONS = [
  'Thủy phân hoàn toàn 0,1 mol phenyl axetat bằng NaOH dư đun nóng. Tính số mol NaOH đã phản ứng và giải thích bẫy este của phenol?',
  'Hỗn hợp X gồm Mg và Al. Cho m gam X tác dụng HNO3 loãng dư thu được dung dịch Y (không thấy khí thoát ra). Dung dịch Y có thể chứa chất nào và làm sao bảo toàn electron?',
  'Chỉ tao cách bấm máy Casio fx-580VN X giải bài toán đồng đẳng hóa hỗn hợp Este đơn chức và đa chức trong 30 giây?',
];

export const ChemistryTutorModal: React.FC<ChemistryTutorModalProps> = ({
  isOpen,
  onClose,
  initialToken = '',
}) => {
  const [question, setQuestion] = useState('');
  const [userToken, setUserToken] = useState(initialToken);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ảnh quá lớn (tối đa 5MB)! Vui lòng chọn ảnh nhẹ hơn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const base64 = result.split(',')[1];
      setImageBase64(base64);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim() && !imageBase64) {
      setErrorMsg('Vui lòng nhập nội dung câu hỏi hoặc tải ảnh đề bài!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSolution(null);
    playSound('keyClick');

    try {
      const res = await fetch('/api/services/chemistry-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          imageBase64,
          imageMimeType: 'image/jpeg',
          userToken: userToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.solution) {
        setSolution(data.solution);
        playSound('tingTing');
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra khi gọi Trợ Giảng AI!');
      }
    } catch {
      setErrorMsg('Không thể kết nối tới server. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-zinc-950 border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              🧪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Trợ Giảng Hóa Mèo Dev AI 24/7</h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Gemini 3.5 Flash Lite
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Chuyên gia bóc tách bẫy đề Hóa THPT & Thủ thuật bấm máy Casio fx-580VN X trong 30s
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick sample chips */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gợi ý câu hỏi mẫu hay gặp trong đề thi:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuestion(q);
                    setErrorMsg(null);
                  }}
                  className="text-left text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 px-3 py-1.5 rounded-lg transition"
                >
                  {q.slice(0, 48)}...
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Nội dung câu hỏi hoặc bài toán Hóa:
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Dán đề bài Este, Peptit, Điện phân, Đồ thị CO2... vào đây..."
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono transition"
              />
            </div>

            {/* Image Preview & Upload */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-300 rounded-xl cursor-pointer transition">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>{imagePreview ? 'Đổi ảnh đề bài' : 'Chụp/Tải ảnh đề bài'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={userToken}
                  onChange={(e) => setUserToken(e.target.value)}
                  placeholder="Mã kích hoạt CHM-XXXX (Nếu đã mua Gói Thủ Khoa)"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mèo Đang Giải...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Hỏi Mèo Ngay</span>
                  </>
                )}
              </button>
            </div>

            {imagePreview && (
              <div className="relative inline-block border border-zinc-700 rounded-xl overflow-hidden mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Đề bài tải lên" className="max-h-40 object-contain bg-zinc-900" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black text-zinc-300 rounded-md transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Solution Display */}
          {solution && (
            <div className="space-y-3 animate-fade-in border-t border-zinc-800 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Lời Giải & Thủ Thuật Từ Mèo Dev</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép lời giải</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 bg-zinc-900/70 border border-zinc-800 rounded-xl text-zinc-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans space-y-4">
                {solution}
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                <Calculator className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>
                  💡 <strong>Tip Mèo:</strong> Lưu lại các bước bấm Casio trên để luyện tay mỗi ngày 15 phút, vào phòng thi chỉ cần 30 giây là lụi chuẩn xác!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
