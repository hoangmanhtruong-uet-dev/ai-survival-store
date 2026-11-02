import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getChemistryFolderId } from '@/lib/google-drive';
import { Product } from '@/types';

// Danh sách các sản phẩm rác/vô nghĩa cần loại bỏ triệt để theo yêu cầu của Boss
const REMOVED_PRODUCT_IDS = new Set([
  'PROMPT-SOLOPRENEUR-365',
  'CASIO-VDC-2K7',
  'AUTO-01',
  'LIVE-BOM-DON',
  'GIT-25',
]);

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
        // Lọc bỏ 5 sản phẩm vô nghĩa và các ebook lý thuyết suông
        const filteredData = data.filter(
          (p) => !REMOVED_PRODUCT_IDS.has(p.id) && p.type !== 'EBOOK'
        );

        const mappedProducts: Product[] = filteredData.map((p) => {
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
        }

        // Luôn đảm bảo giữ lại sản phẩm dịch vụ thực chiến: CUSTOM-TASK
        if (!mappedProducts.some((p) => p.id === 'CUSTOM-TASK')) {
          mappedProducts.push({
            id: 'CUSTOM-TASK',
            name: 'Giao Kèo Cày Thuê (Code Web, Script, Giải Bài)',
            description: 'Nhập bất kỳ yêu cầu lập trình hay học tập, Mèo Dev tự định giá 19k - 49k, tự code và tự trả hàng qua Gmail!',
            price: 29000,
            type: 'CUSTOM_TASK',
            icon: '⚡',
            badge: 'Nhận việc 24/7',
            is_active: true,
            sort_order: 10,
          });
        }

        mappedProducts.sort((a, b) => a.sort_order - b.sort_order);

        return NextResponse.json({ success: true, products: mappedProducts });
      }
    }

    const rawProducts = mockStore.getProducts();
    const products = rawProducts.filter(
      (p) => !REMOVED_PRODUCT_IDS.has(p.id) && p.type !== 'EBOOK'
    );
    if (!products.some((p) => p.id === 'CUSTOM-TASK')) {
      products.push({
        id: 'CUSTOM-TASK',
        name: 'Giao Kèo Cày Thuê (Code Web, Script, Giải Bài)',
        description: 'Nhập bất kỳ yêu cầu lập trình hay học tập, Mèo Dev tự định giá 19k - 49k, tự code và tự trả hàng qua Gmail!',
        price: 29000,
        type: 'CUSTOM_TASK',
        icon: '⚡',
        badge: 'Nhận việc 24/7',
        is_active: true,
        sort_order: 10,
      });
    }

    return NextResponse.json({ success: true, products });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
