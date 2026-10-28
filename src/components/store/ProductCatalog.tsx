'use client';

import React from 'react';
import { Product } from '@/types';
import { ShoppingBag, Sparkles, Zap, Heart, CheckCircle2 } from 'lucide-react';

interface ProductCatalogProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ products, onSelectProduct }) => {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            CỬA HÀNG MÌ ĂN LIỀN (INSTANT STORE)
          </h2>
          <p className="text-xs text-zinc-400">
            Giá siêu rẻ từ 5.000đ đến 29.000đ. Quét QR là giao hàng tức thì trong 2-5 giây qua Webhook!
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1 rounded-lg w-fit">
          <Zap className="w-3.5 h-3.5" />
          <span>Tự động 100% không cần Admin duyệt</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {products.map((p) => {
          const isDonate = p.type === 'DONATE';
          return (
            <div
              key={p.id}
              className={`relative flex flex-col justify-between bg-zinc-900/90 border rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                isDonate
                  ? 'border-pink-500/40 hover:border-pink-400 hover:shadow-pink-950/30'
                  : 'border-zinc-800 hover:border-emerald-500/50 hover:shadow-emerald-950/20'
              }`}
            >
              {/* Badge trên góc card */}
              {p.badge && (
                <div className="absolute -top-2.5 left-4">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border shadow-sm ${
                      isDonate
                        ? 'bg-pink-950 text-pink-300 border-pink-700/60'
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
                <div className="border-t border-zinc-800/80 pt-2.5 mb-3 flex items-baseline justify-between">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Giá cứu đói:</span>
                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-400">
                      {p.price.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-xs font-mono text-emerald-500/80 ml-0.5">đ</span>
                  </div>
                </div>

                {/* Nút Mua Ngay */}
                <button
                  onClick={() => onSelectProduct(p)}
                  className={`w-full py-2 px-3 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-1.5 transition shadow-lg ${
                    isDonate
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white shadow-pink-950/40'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-emerald-950/40'
                  }`}
                >
                  {isDonate ? (
                    <>
                      <Heart className="w-3.5 h-3.5 fill-current" />
                      <span>Nuôi Mèo Ngay</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mua Ngay (QR)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
