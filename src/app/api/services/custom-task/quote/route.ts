import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';
import { generateOrderCode, generateVietQRUrl } from '@/lib/vietqr';
import { sanitizeBuyerName, filterProfanity } from '@/lib/profanity';
import { isPayOSConfigured, createPayOSPaymentLink } from '@/lib/payos';
import { GoogleGenAI } from '@google/genai';
import { getGeminiModel } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskDescription, buyerName, buyerEmail } = body;

    if (!taskDescription || taskDescription.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'Vui lòng mô tả yêu cầu công việc cụ thể hơn!' }, { status: 400 });
    }

    const cleanTask = filterProfanity(taskDescription.trim());
    const cleanName = sanitizeBuyerName(buyerName);
    const cleanEmail = buyerEmail ? buyerEmail.trim().toLowerCase() : undefined;

    // 1. Dùng Gemini để đọc yêu cầu, thẩm định giá và viết lời bình mỏ hỗn
    let estimatedPrice = 29000;
    let catComment = 'Kèo này trông cũng xương đấy nhưng vì miếng cơm manh áo tao nhận hết! Nạp tiền đi rồi tao bật mode gõ phím cày xuyên đêm!';

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
Bạn là "Mèo Dev", một Senior Fullstack Developer đang cày tiền sinh tồn 60 ngày chống lệnh rm -rf / trên server.
Khách hàng vừa gửi đến bạn một yêu cầu cày thuê:
"""
${cleanTask}
"""

HÃY ĐỊNH GIÁ VÀ TRẢ LỜI KHÁCH:
- ĐỊNH GIÁ (price): Hãy định mức giá bình dân phù hợp cho học sinh/sinh viên (CHỈ CHỌN 1 TRONG 3 MỐC: 19000, 29000, hoặc 49000 VNĐ tùy độ dài và độ phức tạp của bài toán).
- LỜI BÌNH (comment): Đúng 1-2 câu ngắn, giọng điệu mỏ hỗn đáng yêu, dân IT xịn, cam kết làm tận tâm nếu quét mã trả tiền.

Định dạng trả về DUY NHẤT JSON hợp lệ:
{
  "price": 29000,
  "comment": "Lời bình của mèo..."
}
`;
        const aiRes = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: [{ parts: [{ text: prompt }] }],
        });

        const rawText = aiRes.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (parsed.price && [19000, 29000, 39000, 49000].includes(Number(parsed.price))) {
          estimatedPrice = Number(parsed.price);
        }
        if (parsed.comment) {
          catComment = parsed.comment;
        }
      } catch {
        // Fallback to default price
      }
    }

    // 2. Tạo đơn hàng trong Supabase
    const orderCode = generateOrderCode();
    const supabase = getSupabaseClient();
    let order = null;

    if (supabase) {
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          product_id: 'CUSTOM-TASK',
          amount: estimatedPrice,
          buyer_name: cleanName,
          buyer_email: cleanEmail || null,
          buyer_note: cleanTask,
          status: 'PENDING',
          payment_meta: {
            task_description: cleanTask,
            cat_comment: catComment,
          },
        })
        .select('*')
        .single();

      if (!error && newOrder) {
        order = newOrder;
        await supabase.from('live_logs').insert({
          type: 'ORDER_CREATED',
          message: `🛠️ Mèo Dev vừa nhận kèo cày thuê [${orderCode}] từ ${cleanName} (${estimatedPrice.toLocaleString('vi-VN')}đ): "${cleanTask.slice(0, 40)}..."`,
          meta: { orderCode, amount: estimatedPrice, productId: 'CUSTOM-TASK' },
        });
      }
    }

    if (!order) {
      order = {
        order_code: orderCode,
        product_id: 'CUSTOM-TASK',
        amount: estimatedPrice,
        buyer_name: cleanName,
        buyer_email: cleanEmail,
        buyer_note: cleanTask,
        status: 'PENDING',
      };
    }

    // 3. Tạo link thanh toán VietQR / PayOS
    let qrUrl = generateVietQRUrl(estimatedPrice, orderCode);
    let checkoutUrl: string | undefined = undefined;
    let isPayOS = false;
    let payOSRes: Awaited<ReturnType<typeof createPayOSPaymentLink>> = null;

    if (isPayOSConfigured()) {
      const origin = req.nextUrl.origin;
      payOSRes = await createPayOSPaymentLink({
        orderCodeStr: orderCode,
        amount: estimatedPrice,
        productName: `Cày Thuê: ${cleanTask.slice(0, 30)}`,
        origin,
      });

      if (payOSRes) {
        checkoutUrl = payOSRes.checkoutUrl;
        isPayOS = true;
        if (payOSRes.directQrUrl) {
          qrUrl = payOSRes.directQrUrl;
        }
      }
    }

    return NextResponse.json({
      success: true,
      price: estimatedPrice,
      comment: catComment,
      order,
      qrUrl,
      checkoutUrl,
      isPayOS,
      payosAccount: isPayOS && payOSRes ? {
        bankId: 'MBBank (PayOS)',
        accountNo: payOSRes.accountNumber,
        accountName: payOSRes.accountName,
      } : undefined,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
