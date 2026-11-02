'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('App Router Caught Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900/80 border border-red-500/30 rounded-2xl p-6 md:p-8 backdrop-blur-sm text-center shadow-2xl shadow-red-950/20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-400 mb-5 border border-red-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
          ERROR 500 — MÈO DEV BỊ NẤC CỤC
        </div>

        <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
          Hệ thống gặp sự cố tạm thời!
        </h1>

        <p className="text-zinc-400 text-sm mb-6">
          Boss AI vừa chạy một đoạn code kỳ quặc hoặc server bị nghẽn mạng. Đừng lo, dữ liệu và đơn hàng của bạn vẫn an toàn!
        </p>

        {error.digest && (
          <p className="text-xs font-mono text-zinc-600 mb-6 bg-zinc-950 p-2 rounded border border-zinc-800">
            Digest: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại ngay
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition-all border border-zinc-700/50"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
