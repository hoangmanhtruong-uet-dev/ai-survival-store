import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getChemistryFolderId } from '@/lib/google-drive';
import { Product } from '@/types';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        const mappedProducts: Product[] = data.map((p) => {
          if (p.id.startsWith('CHEM-')) {
            return {
              ...p,
              type: 'GDRIVE_ACCESS',
              gdrive_folder_id: p.gdrive_folder_id || getChemistryFolderId(p.id),
            };
          }
          return p;
        });

        // Đảm bảo có thẻ đại diện chung CHEM-PACK
        if (!mappedProducts.some((p) => p.id === 'CHEM-PACK')) {
          mappedProducts.push({
            id: 'CHEM-PACK',
            name: 'Tổ hợp Đề thi & Lộ trình Hóa THPT',
            description: 'Trọn bộ đề thi chuẩn cấu trúc Bộ GD, phân tầng 3 mốc (8+, 9+, 10+) kèm mẹo Casio 30s & Trợ Giảng AI 24/7',
            price: 49000,
            type: 'GDRIVE_ACCESS',
            icon: '🧪',
            badge: '3 Gói Lựa Chọn',
            is_active: true,
            sort_order: 3,
          });
          mappedProducts.sort((a, b) => a.sort_order - b.sort_order);
        }

        return NextResponse.json({ success: true, products: mappedProducts });
      }
    }

    const products = mockStore.getProducts();
    return NextResponse.json({ success: true, products });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
