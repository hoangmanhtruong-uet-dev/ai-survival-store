'use client';

import React, { useState } from 'react';
import {
  X,
  Flame,
  FileText,
  Download,
  Loader2,
  Sparkles,
  Upload,
  CheckCircle2,
  Bot,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Target,
  BarChart3,
  Lightbulb,
  CheckSquare,
} from 'lucide-react';
import { soundEngine } from '@/lib/audio';
import { RoastStructuredData, SpicyLevel } from '@/lib/cv-roaster';

interface CVRoastModalProps {
  initialCode?: string;
  onClose: () => void;
}

interface RoastApiResponse {
  success: boolean;
  report?: string;
  highlight?: string;
  score?: number;
  atsScore?: number;
  verdict?: string;
  structuredData?: RoastStructuredData;
  error?: string;
  cached?: boolean;
}

export const CVRoastModal: React.FC<CVRoastModalProps> = ({ initialCode = '', onClose }) => {
  const [redeemCode, setRedeemCode] = useState(initialCode || '');
  const [inputMode, setInputMode] = useState<'TEXT' | 'UPLOAD'>('UPLOAD');
  const [cvText, setCvText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [spicyLevel, setSpicyLevel] = useState<SpicyLevel>('SAVAGE');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; base64: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [roastData, setRoastData] = useState<RoastApiResponse | null>(null);
  const [resultTab, setResultTab] = useState<'DASHBOARD' | 'MARKDOWN'>('DASHBOARD');
  const [copied, setCopied] = useState(false);
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
          targetRole: targetRole.trim() || undefined,
          spicyLevel,
        }),
      });

      const data: RoastApiResponse = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        setRoastData(data);
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
    link.download = `meo-dev-roast-report-${redeemCode || 'cv'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    soundEngine.playKeyClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const atsScore = roastData?.atsScore ?? roastData?.score ?? 45;
  const structured = roastData?.structuredData;

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400 border-emerald-500 bg-emerald-950/40';
    if (score >= 50) return 'text-amber-400 border-amber-500 bg-amber-950/40';
    return 'text-rose-400 border-rose-500 bg-rose-950/40';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[92vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold text-zinc-100">
                  PHÒNG QUÉT & SẤY CV CỰC CĂNG 2.0
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  Gemini 3.5 Flash Lite
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Bóc tách 4 góc nhìn • Tối ưu Google XYZ • Đo điểm ATS chuẩn 2026
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5 overflow-y-auto space-y-4 grow">
          {report ? (
            <div className="space-y-4 animate-in fade-in">
              {/* HEADER TỔNG KẾT KẾT QUẢ VỚI ĐIỂM ATS */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-mono shrink-0 shadow-lg ${getScoreColor(
                      atsScore
                    )}`}
                  >
                    <span className="text-xl font-black">{atsScore}</span>
                    <span className="text-[9px] uppercase tracking-wider font-bold">ATS Score</span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-200">
                        {roastData?.verdict || structured?.verdict || 'Báo cáo sấy CV'}
                      </span>
                      {targetRole && (
                        <span className="text-[10px] font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700">
                          {targetRole}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 italic font-mono">
                      &quot;{roastData?.highlight || structured?.oneLiner || 'Bản sấy chuẩn Anti-Slop từ Mèo Dev'}&quot;
                    </p>
                  </div>
                </div>

                {/* TABS CHỌN CHẾ ĐỘ XEM */}
                <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setResultTab('DASHBOARD')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      resultTab === 'DASHBOARD'
                        ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Phân Tích</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultTab('MARKDOWN')}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      resultTab === 'MARKDOWN'
                        ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Toàn Văn .md</span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: DASHBOARD TRỰC QUAN */}
              {resultTab === 'DASHBOARD' && (
                <div className="space-y-4">
                  {/* Điểm thành phần */}
                  {structured?.subScores && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center font-mono">
                        <span className="text-[11px] text-zinc-400 block mb-1">Định dạng ATS</span>
                        <span className="text-base font-bold text-emerald-400">
                          {structured.subScores.format}/100
                        </span>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center font-mono">
                        <span className="text-[11px] text-zinc-400 block mb-1">Số liệu Tác động</span>
                        <span className="text-base font-bold text-amber-400">
                          {structured.subScores.impact}/100
                        </span>
                      </div>
                      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 text-center font-mono">
                        <span className="text-[11px] text-zinc-400 block mb-1">Từ khóa Kỹ năng</span>
                        <span className="text-base font-bold text-rose-400">
                          {structured.subScores.skills}/100
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4 Góc Nhìn */}
                  {structured?.perspectives && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                        <span>4 Góc Nhìn Bóc Tách Đa Chiều:</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
                        <div className="bg-zinc-900/70 border border-zinc-800 p-3 rounded-xl space-y-1">
                          <span className="text-rose-400 font-bold block text-[11px]">
                            👀 Recruiter (6 giây đầu):
                          </span>
                          <p className="text-zinc-300 leading-relaxed text-[11px]">
                            {structured.perspectives.recruiter}
                          </p>
                        </div>
                        <div className="bg-zinc-900/70 border border-zinc-800 p-3 rounded-xl space-y-1">
                          <span className="text-amber-400 font-bold block text-[11px]">
                            💻 Tech Lead (Độ sâu kỹ thuật):
                          </span>
                          <p className="text-zinc-300 leading-relaxed text-[11px]">
                            {structured.perspectives.techLead}
                          </p>
                        </div>
                        <div className="bg-zinc-900/70 border border-zinc-800 p-3 rounded-xl space-y-1">
                          <span className="text-blue-400 font-bold block text-[11px]">
                            🤖 ATS Parser (Khả năng đọc):
                          </span>
                          <p className="text-zinc-300 leading-relaxed text-[11px]">
                            {structured.perspectives.atsParser}
                          </p>
                        </div>
                        <div className="bg-zinc-900/70 border border-rose-900/40 bg-rose-950/10 p-3 rounded-xl space-y-1">
                          <span className="text-rose-300 font-bold block text-[11px]">
                            🐱 Mèo Dev (Sấy mỏ hỗn):
                          </span>
                          <p className="text-zinc-300 leading-relaxed text-[11px]">
                            {structured.perspectives.meoDev}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rewrite theo Google XYZ */}
                  {structured?.rewrites && structured.rewrites.length > 0 && (
                    <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Rewrite Mẫu Thực Chiến (Google XYZ Formula):</span>
                      </h4>
                      <div className="space-y-2 text-xs font-mono">
                        {structured.rewrites.map((rw, idx) => (
                          <div key={idx} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 space-y-1">
                            <div className="text-rose-400/90 text-[11px]">
                              ❌ <strong>Gốc:</strong> &quot;{rw.original}&quot;
                            </div>
                            <div className="text-emerald-300 text-[11px] font-semibold">
                              ✅ <strong>XYZ:</strong> {rw.improved}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Checklist việc cần làm */}
                  {structured?.actionChecklist && structured.actionChecklist.length > 0 && (
                    <div className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl space-y-2">
                      <h4 className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Checklist 3 Việc Sửa Ngay Tuần Này:</span>
                      </h4>
                      <ul className="space-y-1.5 text-xs font-mono text-zinc-300">
                        {structured.actionChecklist.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 2: MARKDOWN RAW */}
              {resultTab === 'MARKDOWN' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {report}
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-zinc-950 text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Báo Cáo Sửa CV (.md)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="py-2.5 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs transition font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép Markdown'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setRoastData(null);
                    setUploadedFile(null);
                    setCvText('');
                  }}
                  className="py-2.5 px-4 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs transition font-mono cursor-pointer"
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
                    Mã kích hoạt dịch vụ (ROAST-10):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ Hỗ trợ mã đơn hàng hoặc mã dùng thử RCV-FREE-TEST
                  </span>
                </div>
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Ví dụ: RCV-4829 hoặc MEO-4829"
                  className="bg-zinc-950 border border-zinc-700 focus:border-rose-500 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono outline-none uppercase font-bold"
                />
              </div>

              {/* TÙY CHỈNH CHUYÊN SÂU: TARGET ROLE & SPICY LEVEL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl space-y-1.5">
                  <label className="block text-xs font-mono text-zinc-300 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-rose-400" />
                    <span>Vị trí ứng tuyển mục tiêu:</span>
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="VD: Senior Frontend, AI Engineer..."
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-rose-500 rounded-xl px-3 py-1.5 text-xs text-zinc-100 font-mono outline-none"
                  />
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800/80 p-3 rounded-2xl space-y-1.5">
                  <label className="block text-xs font-mono text-zinc-300 font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>Mức độ cay sấy CV:</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSpicyLevel('MILD')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer border ${
                        spicyLevel === 'MILD'
                          ? 'bg-amber-950 text-amber-300 border-amber-600 font-bold'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      🌶️ Vừa miệng
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpicyLevel('MEDIUM')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer border ${
                        spicyLevel === 'MEDIUM'
                          ? 'bg-orange-950 text-orange-300 border-orange-600 font-bold'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      🌶️🌶️ Cay nồng
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpicyLevel('SAVAGE')}
                      className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer border ${
                        spicyLevel === 'SAVAGE'
                          ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      🌶️🌶️🌶️ Mỏ hỗn
                    </button>
                  </div>
                </div>
              </div>

              {/* TABS CHỌN CÁCH NHẬP CV */}
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                <button
                  type="button"
                  onClick={() => setInputMode('UPLOAD')}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 transition cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 transition cursor-pointer ${
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
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      Dán CV mẫu thử
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    value={cvText}
                    onChange={(e) => setCvText(e.target.value)}
                    placeholder="Dán toàn bộ thông tin học vấn, kỹ năng, kinh nghiệm dự án của bạn vào đây..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-rose-500 rounded-xl p-3 text-xs text-zinc-200 outline-none resize-none font-mono"
                  />
                </div>
              )}

              {/* BẢO MẬT PII */}
              <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                <span>🔒 Bảo mật: Email, SĐT, Ngày sinh, CCCD tự động được che sạch trước khi AI sấy.</span>
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 font-bold text-white text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-rose-950/50 disabled:opacity-50 cursor-pointer"
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
