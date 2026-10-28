'use client';

import React, { useState } from 'react';
import { X, Flame, FileText, Download, Loader2, Sparkles, Upload, CheckCircle2, Bot, AlertCircle } from 'lucide-react';
import { soundEngine } from '@/lib/audio';

interface CVRoastModalProps {
  initialCode?: string;
  onClose: () => void;
}

export const CVRoastModal: React.FC<CVRoastModalProps> = ({ initialCode = '', onClose }) => {
  const [redeemCode, setRedeemCode] = useState(initialCode || 'RCV-FREE-TEST');
  const [inputMode, setInputMode] = useState<'TEXT' | 'UPLOAD'>('UPLOAD');
  const [cvText, setCvText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; base64: string } | null>(null);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundEngine.playKeyClick();
    setError(null);

    const sizeStr = (file.size / 1024).toFixed(1) + ' KB';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setUploadedFile({ name: file.name, size: sizeStr, base64 });
        setCvText(`[Đã tải lên tệp PDF: ${file.name}]`);
      };
      reader.readAsDataURL(file);
    } else {
      // Đọc file text thông thường
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setUploadedFile({ name: file.name, size: sizeStr, base64: '' });
        setCvText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvText.trim() && !uploadedFile?.base64) {
      setError('Vui lòng nhập nội dung CV hoặc tải lên file PDF');
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
          cvText: cvText.trim(),
          pdfBase64: uploadedFile?.base64 || undefined,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-zinc-100">
                  PHÒNG QUÉT & SẤY CV CỰC CĂNG
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Gemini 3.5 Flash Lite
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Bóc tách sáo rỗng • Nhận diện PDF tự động • Chuẩn hóa ATS 2026
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition">
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
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Báo Cáo Sửa CV (.md)</span>
                </button>
                <button
                  onClick={() => {
                    setReport(null);
                    setUploadedFile(null);
                    setCvText('');
                  }}
                  className="py-2.5 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs transition font-mono"
                >
                  Sấy lại CV khác
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Ô Nhập Mã Kích Hoạt */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 font-bold">
                    Mã kích hoạt dịch vụ:
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Đã tự động kích hoạt mã dùng thử miễn phí
                  </span>
                </div>
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Ví dụ: RCV-4829"
                  className="bg-zinc-950 border border-zinc-700 focus:border-rose-500 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono outline-none uppercase font-bold"
                />
              </div>

              {/* TABS CHỌN CÁCH NHẬP CV */}
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <button
                  type="button"
                  onClick={() => setInputMode('UPLOAD')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 transition ${
                    inputMode === 'UPLOAD'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải Lên File PDF / Word</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('TEXT')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 transition ${
                    inputMode === 'TEXT'
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-700/60 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dán Nội Dung Text</span>
                </button>
              </div>

              {/* KHU VỰC TẢI FILE */}
              {inputMode === 'UPLOAD' ? (
                <div className="space-y-2">
                  <label className="relative border-2 border-dashed border-zinc-700 hover:border-rose-500/80 bg-zinc-900/50 hover:bg-zinc-900/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center group">
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx,.doc"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-rose-950/50 border border-rose-800/60 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-200 group-hover:text-rose-400 transition font-mono">
                        Bấm để chọn file PDF CV từ máy tính
                      </span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Hỗ trợ file PDF, Word, TXT (Tối đa 10MB)
                      </p>
                    </div>
                  </label>

                  {uploadedFile && (
                    <div className="p-3 bg-emerald-950/50 border border-emerald-700/60 rounded-xl flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-emerald-300 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{uploadedFile.name}</span>
                        <span className="text-zinc-500">({uploadedFile.size})</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold shrink-0">
                        Đã nạp file
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* KHU VỰC DÁN TEXT */
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-zinc-300">
                      Nội dung CV của bạn:
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
                </div>
              )}

              {/* BẢO MẬT PII */}
              <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                <span>🔒 Bảo mật: Email, SĐT, Địa chỉ cá nhân được hệ thống tự động che sạch trước khi AI sấy.</span>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl text-xs text-rose-300 font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* NÚT SUBMIT */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/50 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mèo Dev (Gemini 3.5 Flash Lite) đang mài vuốt sấy CV...</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>Bắt Đầu Quét & Sấy CV Ngay</span>
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
