'use client';

import React from 'react';
import { Product } from '@/types';
import { ShoppingBag, Sparkles, Zap, Heart, Flame, Download } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onOpenRoastCV?: (code: string) => void;
  onOpenTarot?: (code: string) => void;
  onOpenChemistryTutor?: (token?: string) => void;
  onOpenChemistryQuiz?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products,
  onSelectProduct,
  onOpenRoastCV,
  onOpenTarot,
  onOpenChemistryTutor,
  onOpenChemistryQuiz,
}) => {
  // Gom các gói Hóa học lại thành 1 thẻ duy nhất "CHEM-PACK", ẩn các gói con CHEM-49, CHEM-89, CHEM-149
  const displayProducts = React.useMemo(() => {
    const nonSubChem = products.filter((p) => !['CHEM-49', 'CHEM-89', 'CHEM-149'].includes(p.id));

    if (!nonSubChem.some((p) => p.id === 'CHEM-PACK')) {
      const chemPack: Product = {
        id: 'CHEM-PACK',
        name: 'Tổ hợp Đề thi & Lộ trình Hóa THPT',
        description: 'Trọn bộ đề thi tinh hoa chuẩn cấu trúc Bộ GD, phân tầng 3 mốc (8+, 9+, 10+) kèm mẹo Casio 30s & Trợ Giảng AI 24/7',
        price: 49000,
        type: 'GDRIVE_ACCESS',
        icon: '🧪',
        badge: '3 Gói Lựa Chọn',
        is_active: true,
        sort_order: 3,
      };
      // Chèn vào vị trí số 3
      const nonChem = nonSubChem.filter((p) => !p.id.startsWith('CHEM-'));
      return [...nonChem.slice(0, 2), chemPack, ...nonChem.slice(2)];
    }

    return nonSubChem;
  }, [products]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            CỬA HÀNG MÌ ĂN LIỀN (INSTANT STORE)
          </h2>
          <p className="text-xs text-zinc-400">
            Giá siêu rẻ từ 5.000đ đến 149.000đ. Quét QR là giao hàng tức thì trong 2-5 giây qua Webhook!
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg w-fit">
          <Zap className="w-3.5 h-3.5" />
          <span>Tự động 100% không cần Admin duyệt</span>
        </div>
      </div>

      {/* Lead Magnet Banner: Thi thử 10 câu bẫy Hóa THPT */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-amber-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Phễu Thi Thử 10 Câu Bẫy Điểm 9+ Hóa THPT</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                HOT FREE
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Chinh phục bẫy Este, Peptit, Đồ thị CO2 & Nhận phân tích lỗ hổng kiến thức từ Mèo Dev
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenChemistryTutor && (
            <button
              onClick={() => onOpenChemistryTutor('CHM-FREE-TEST')}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>🧪 Trợ Giảng AI</span>
            </button>
          )}
          {onOpenChemistryQuiz && (
            <button
              onClick={onOpenChemistryQuiz}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
            >
              <span>🎯 Thi Thử Ngay (5 Phút)</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayProducts.map((p) => {
          const isDonate = p.type === 'DONATE';
          const isRoast = p.id === 'ROAST-10';
          const isTarot = p.id === 'TAROT-10';
          const isFile = p.type === 'R2_FILE';
          const isGDrive = p.type === 'GDRIVE_ACCESS' || p.id.startsWith('CHEM-');

          return (
            <div
              key={p.id}
              className={`relative flex flex-col justify-between bg-zinc-900/90 border rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isGDrive
                  ? 'border-emerald-500/50 hover:border-emerald-400 hover:shadow-emerald-950/30 bg-zinc-900/95 ring-1 ring-emerald-500/20'
                  : isDonate
                  ? 'border-pink-500/40 hover:border-pink-400 hover:shadow-pink-950/30'
                  : isRoast
                  ? 'border-orange-500/40 hover:border-orange-400 hover:shadow-orange-950/30'
                  : isTarot
                  ? 'border-purple-500/40 hover:border-purple-400 hover:shadow-purple-950/30'
                  : 'border-zinc-800 hover:border-emerald-500/50 hover:shadow-emerald-950/20'
              }`}
            >
              {/* Badge trên góc card */}
              {p.badge && (
                <div className="absolute -top-2.5 left-4">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border shadow-sm ${
                      isGDrive
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600/70'
                        : isDonate
                        ? 'bg-pink-950 text-pink-300 border-pink-700/60'
                        : isRoast
                        ? 'bg-orange-950 text-orange-300 border-orange-700/60'
                        : isTarot
                        ? 'bg-purple-950 text-purple-300 border-purple-700/60'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Icon & Mã sản phẩm */}
                <div className="flex items-center justify-between mt-1 mb-2">
                  <span className="text-3xl filter drop-shadow">{p.icon}</span>
                  <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {p.id}
                  </span>
                </div>

                {/* Tên sản phẩm */}
                <h3 className="font-bold text-sm text-zinc-100 line-clamp-2 mb-1.5 leading-snug">
                  {p.name}
                </h3>

                {/* Mô tả tính năng */}
                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-3">
                  {p.description}
                </p>
              </div>

              <div>
                {/* Giá tiền */}
                <div className="border-t border-zinc-800/80 pt-2.5 mb-2.5 flex items-baseline justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">
                    {isGDrive ? 'Giá từ:' : 'Giá cứu đói:'}
                  </span>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-400">
                      {p.price.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-xs font-mono text-emerald-500/80 ml-0.5">đ</span>
                    {isGDrive && (
                      <span className="block text-[10px] font-mono text-amber-400 font-semibold">
                        (49k • 89k • 149k)
                      </span>
                    )}
                  </div>
                </div>

                {/* CÁC NÚT HÀNH ĐỘNG TÙY THEO LOẠI DỊCH VỤ */}
                <div className="space-y-1.5">
                  {/* 1. Nếu là Sấy CV ROAST-10 */}
                  {isRoast && (
                    <>
                      <button
                        onClick={() => onOpenRoastCV && onOpenRoastCV('RCV-FREE-TEST')}
                        className="w-full py-2 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white shadow-lg shadow-orange-950/40 transition"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>🔥 Quét & Sấy CV Ngay</span>
                      </button>
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="w-full py-1 text-[11px] font-mono text-zinc-400 hover:text-emerald-400 transition text-center cursor-pointer"
                      >
                        Quét QR 10k ủng hộ Mèo
                      </button>
                    </>
                  )}

                  {/* 2. Nếu là Bói Tarot TAROT-10 */}
                  {isTarot && (
                    <>
                      <button
                        onClick={() => onOpenTarot && onOpenTarot('TRT-FREE-TEST')}
                        className="w-full py-2 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-950/40 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>🔮 Bốc Quẻ Tarot Ngay</span>
                      </button>
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="w-full py-1 text-[11px] font-mono text-zinc-400 hover:text-purple-400 transition text-center cursor-pointer"
                      >
                        Quét QR 10k ủng hộ Mèo
                      </button>
                    </>
                  )}

                  {/* 3. Nếu là File số R2_FILE */}
                  {isFile && (
                    <>
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="w-full py-2 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mua Ngay (QR)</span>
                      </button>
                      <a
                        href={`/api/download?code=TEST&key=${p.r2_file_key}`}
                        download
                        className="block text-center py-1 text-[11px] font-mono text-emerald-400 hover:underline"
                      >
                        ⚡ Tải thử ngay miễn phí
                      </a>
                    </>
                  )}

                  {/* 4. Nếu là Donate Pate PATE-05 */}
                  {isDonate && (
                    <button
                      onClick={() => onSelectProduct(p)}
                      className="w-full py-2 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white shadow-lg shadow-pink-950/40 transition cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>Nuôi Mèo Ngay (QR)</span>
                    </button>
                  )}

                  {/* 5. Nếu là Gói Đề Hóa GDRIVE_ACCESS (CHEM-PACK) */}
                  {isGDrive && (
                    <>
                      <button
                        onClick={() => onSelectProduct(p)}
                        className="w-full py-2 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>⚡ Chọn Gói Mua (3 Lựa Chọn)</span>
                      </button>

                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        {onOpenChemistryQuiz && (
                          <button
                            type="button"
                            onClick={onOpenChemistryQuiz}
                            className="flex-1 py-1 text-[10px] font-mono text-emerald-400 hover:underline transition text-center cursor-pointer"
                          >
                            🎯 Thi thử bẫy Free
                          </button>
                        )}
                        {onOpenChemistryTutor && (
                          <button
                            type="button"
                            onClick={() => onOpenChemistryTutor('CHM-DEMO')}
                            className="flex-1 py-1 text-[10px] font-mono text-amber-400 hover:underline transition text-center cursor-pointer"
                          >
                            🧪 Trợ Giảng AI
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
