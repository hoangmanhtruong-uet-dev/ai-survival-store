'use client';

import React, { useState } from 'react';
import { X, BookOpen, Download, Copy, Check, Printer, Sparkles } from 'lucide-react';
import { soundEngine } from '@/lib/audio';

interface EbookReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  markdownContent: string;
}

export const EbookReaderModal: React.FC<EbookReaderModalProps> = ({
  isOpen,
  onClose,
  title,
  markdownContent,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    soundEngine.playKeyClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    soundEngine.playKeyClick();
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Hàm render Markdown cơ bản sang HTML đẹp mắt (Zero dependency)
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeLanguage = '';

    lines.forEach((line, idx) => {
      // Code block start / end
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().slice(3) || 'text';
          codeBlockContent = [];
        } else {
          inCodeBlock = false;
          const codeText = codeBlockContent.join('\n');
          elements.push(
            <div key={`code-${idx}`} className="my-4 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden font-mono text-xs">
              <div className="bg-zinc-900 px-3 py-1.5 flex items-center justify-between text-zinc-400 border-b border-zinc-800 text-[11px]">
                <span>{codeLanguage}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(codeText);
                    soundEngine.playKeyClick();
                  }}
                  className="hover:text-emerald-400 flex items-center gap-1 transition"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-emerald-300 select-all leading-relaxed">
                <code>{codeText}</code>
              </pre>
            </div>
          );
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // H1 Header
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={idx} className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-400 to-teal-300 mt-6 mb-3 font-mono border-b border-zinc-800 pb-2">
            {line.replace('# ', '')}
          </h1>
        );
        return;
      }

      // H2 Header
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={idx} className="text-base md:text-lg font-bold text-emerald-400 mt-5 mb-2 font-mono flex items-center gap-2">
            <span className="text-amber-400">⚡</span>
            <span>{line.replace('## ', '')}</span>
          </h2>
        );
        return;
      }

      // H3 Header
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-sm md:text-base font-semibold text-zinc-200 mt-4 mb-1.5 font-mono">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Callout Alert Box
      if (line.startsWith('> [!WARNING]') || line.startsWith('> [!CAUTION]')) {
        elements.push(
          <div key={idx} className="my-2.5 p-3 rounded-xl bg-amber-950/40 border border-amber-600/60 text-amber-200 text-xs font-mono">
            ⚠️ <strong>CẢNH BÁO BẪY SAI LẦM:</strong>
          </div>
        );
        return;
      }

      if (line.startsWith('> [!NOTE]') || line.startsWith('> [!TIP]')) {
        elements.push(
          <div key={idx} className="my-2.5 p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/60 text-emerald-200 text-xs font-mono">
            💡 <strong>MẸO THỰC CHIẾN MÈO DEV:</strong>
          </div>
        );
        return;
      }

      // Blockquote thông thường
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="my-2 pl-3 border-l-2 border-emerald-500 text-zinc-400 italic text-xs">
            {line.replace('> ', '')}
          </blockquote>
        );
        return;
      }

      // Bullet List
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <li key={idx} className="ml-4 list-disc text-zinc-300 text-xs my-0.5 leading-relaxed">
            {line.trim().slice(2)}
          </li>
        );
        return;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={idx} className="h-2" />);
        return;
      }

      // Đoạn văn thông thường
      elements.push(
        <p key={idx} className="text-zinc-300 text-xs md:text-sm leading-relaxed my-1 font-sans">
          {line}
        </p>
      );
    });

    return elements;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-emerald-400 flex items-center justify-center text-zinc-950 shrink-0">
              <BookOpen className="w-4 h-4 font-bold" />
            </div>
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-100 font-mono truncate">{title}</h3>
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Tài Liệu Số Độc Quyền • Mèo Dev 2026</span>
              </p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center gap-1 transition"
              title="Sao chép toàn bộ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono flex items-center gap-1 transition"
              title="Tải file .md"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về (.md)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 transition"
              title="In ra PDF"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTENT READER */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-2 text-zinc-200 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="max-w-3xl mx-auto">
            {renderFormattedMarkdown(markdownContent)}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span>Trang Đọc Ebook Trực Tuyến Bản Quyền Mèo Dev</span>
          <span className="text-emerald-400">Đã kích hoạt quyền đọc trọn đời</span>
        </div>

      </div>
    </div>
  );
};
