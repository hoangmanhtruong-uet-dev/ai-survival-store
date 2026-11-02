export default function Loading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        {/* Cat animation */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl animate-pulse">
            🐱
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-ping" />
        </div>

        <div className="text-center">
          <p className="text-sm font-mono text-amber-400 font-semibold tracking-wide animate-pulse">
            [MÈO DEV ĐANG TẢI DỮ LIỆU...]
          </p>
          <p className="text-xs text-zinc-500 mt-1 font-mono">
            Đang đồng bộ trạng thái server & kho tài nguyên sinh tồn
          </p>
        </div>
      </div>
    </div>
  );
}
