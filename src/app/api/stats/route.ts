import { NextResponse } from 'next/server';
import { mockStore } from '@/lib/mock-store';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('campaign_stats')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        // Tự động kiểm tra Flash Sale (nếu daemon đã bật hoặc nếu > 6 tiếng chưa có đơn hàng)
        const lastOrderTime = data.last_order_at
          ? new Date(data.last_order_at).getTime()
          : new Date(data.start_date || Date.now()).getTime();
        const hoursElapsed = (Date.now() - lastOrderTime) / (1000 * 60 * 60);

        // Kiểm tra thời hạn flash_sale_ends_at nếu có
        const isTimerActive = data.flash_sale_ends_at
          ? new Date(data.flash_sale_ends_at).getTime() > Date.now()
          : false;

        const isFlashSale = Boolean(data.is_flash_sale || isTimerActive || hoursElapsed >= 6);
        const discountPercent = data.flash_sale_discount_percent || 20;

        return NextResponse.json({
          success: true,
          stats: {
            ...data,
            is_flash_sale: isFlashSale,
            flash_sale_discount_percent: discountPercent,
            flash_sale_ends_at: data.flash_sale_ends_at || (isFlashSale ? new Date(Date.now() + 2 * 3600 * 1000).toISOString() : null),
            flash_sale_message: data.flash_sale_message || '🔥 GIỜ VÀNG FLASH SALE — Giảm ngay 20% toàn bộ dịch vụ và gói tài liệu!',
          },
        });
      }
    }

    const stats = mockStore.getCampaignStats();
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
