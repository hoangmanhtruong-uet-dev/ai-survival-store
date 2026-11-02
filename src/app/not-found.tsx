import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm text-center shadow-2xl">
        <div className="text-6xl mb-4 select-none animate-bounce">
          🐱🔍
        </div>

        <div className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
          404 — KHÔNG TÌM THẤY TRANG
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Mèo Dev Lạc Vào Vùng Hư Vô!
        </h1>

        <p className="text-zinc-400 text-sm mb-6">
          Đường dẫn bạn đang tìm kiếm không tồn tại, đã bị Boss xóa sổ hoặc bị chuyển đến một cluster server bí mật.
        </p>

        <div className="flex justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            <Home className="w-4 h-4" />
            Về Căn Cứ Sinh Tồn
          </Link>
        </div>
      </div>
    </div>
  );
}
