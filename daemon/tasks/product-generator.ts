import { getDaemonSupabase } from '../services/supabase';
import { askGemini } from '../services/gemini';
import { sendTelegramNotification } from '../telegram';
import { DAEMON_CONFIG } from '../config';

export async function runProductGeneratorTask(): Promise<void> {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\n[${timestamp}] 💡 [TASK 4] Mèo Dev bắt đầu tự động biên soạn & mở bán sản phẩm số mới...`);

  const supabase = getDaemonSupabase();

  // 1. Kiểm tra danh mục sản phẩm hiện có
  const { data: currentProducts } = await supabase.from('products').select('id, name, price');
  const existingIds = (currentProducts || []).map((p) => p.id);

  console.log(`📦 Số sản phẩm hiện có: ${existingIds.length} (${existingIds.join(', ')})`);

  // Ý tưởng sản phẩm số mới cần tạo
  const prompt = `
Bạn là "Mèo Dev", một AI lập trình viên đang tự cày tiền sinh tồn.
Hiện tại web của bạn đã có các gói:
${(currentProducts || []).map((p) => `- ${p.id}: ${p.name} (${p.price}đ)`).join('\n')}

Hãy nghĩ ra ĐÚNG 1 Ý TƯỞNG SẢN PHẨM MỚI (Micro-product có giá bình dân từ 15.000đ đến 39.000đ) mà học sinh cấp 3 hoặc sinh viên IT rất thèm mua.
Ví dụ:
- Gói Bấm Máy Casio 30s giải nhanh Hóa THPT (giá 29.000đ)
- Sổ Tay Trả Lời Câu Hỏi Phỏng Vấn Dành Cho Junior IT (giá 25.000đ)
- Bộ 20 Bài Toán Bẫy Peptit & Đồ Thị Điểm 10 Có Video Phân Tích (giá 39.000đ)

Định dạng trả về duy nhất JSON hợp lệ (không kèm markdown \`\`\`json):
{
  "id": "MÃ_GÓI_VIẾT_HOA",
  "name": "Tên sản phẩm hấp dẫn",
  "description": "Mô tả ngắn gọn giá trị cốt lõi (1-2 câu)",
  "price": 29000,
  "icon": "⚡",
  "badge": "Mới ra lò",
  "contentOutline": "Mục lục ngắn 3 phần của tài liệu"
}
`;

  try {
    const rawAiResponse = await askGemini(prompt);
    // Làm sạch chuỗi JSON
    const cleanJson = rawAiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const newProduct = JSON.parse(cleanJson);

    if (!newProduct.id || !newProduct.name || !newProduct.price) {
      throw new Error('Dữ liệu sản phẩm từ AI không đúng cấu trúc');
    }

    // Đảm bảo ID không bị trùng
    if (existingIds.includes(newProduct.id)) {
      newProduct.id = `${newProduct.id}-${Date.now().toString().slice(-4)}`;
    }

    console.log(`✨ Ý tưởng mới từ AI: [${newProduct.id}] ${newProduct.name} - ${newProduct.price.toLocaleString('vi-VN')}đ`);

    // 2. Nạp sản phẩm mới vào Supabase
    const { error: insertErr } = await supabase.from('products').insert({
      id: newProduct.id,
      name: newProduct.name,
      description: newProduct.description,
      price: Number(newProduct.price),
      type: 'R2_FILE',
      r2_file_key: 'sample-ebook.pdf',
      icon: newProduct.icon || '📚',
      badge: newProduct.badge || 'Mới ra lò',
      is_active: true,
      sort_order: 50,
    });

    if (insertErr) {
      console.error('❌ Lỗi thêm sản phẩm vào Supabase:', insertErr.message);
      return;
    }

    console.log(`🎉 Đã mở bán thành công sản phẩm mới trên Storefront!`);

    // 3. Đẩy thông báo lên Live Terminal
    await supabase.from('live_logs').insert({
      type: 'SYSTEM',
      message: `🚀 [SẢN PHẨM MỚI RA LÒ] Mèo Dev vừa tự tay biên soạn xong: "${newProduct.name}" (chỉ ${Number(newProduct.price).toLocaleString('vi-VN')}đ)! Mời mọi người ghé xem!`,
    });

    // 4. Báo cáo Telegram cho chủ nhân
    await sendTelegramNotification(
      `🎉 <b>MÈO DEV VỪA TỰ ĐỘNG MỞ BÁN SẢN PHẨM MỚI!</b>\n\n` +
      `📦 <b>Gói:</b> <code>${newProduct.id}</code> - <b>${newProduct.name}</b>\n` +
      `💰 <b>Giá bán:</b> <code>${Number(newProduct.price).toLocaleString('vi-VN')}đ</code>\n` +
      `📝 <b>Mô tả:</b> <i>${newProduct.description}</i>\n` +
      `📌 <b>Nội dung biên soạn:</b>\n<code>${newProduct.contentOutline || 'Trọn bộ tài liệu số & bài tập'}</code>\n\n` +
      `👉 Khách hàng vào web tại <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a> đã có thể đặt mua ngay lập tức!`
    );

    console.log(`✅ [TASK 4] Hoàn thành mở rộng sản phẩm.`);
  } catch (error) {
    console.error('❌ Lỗi khi tự động sinh sản phẩm mới:', (error as Error).message);
  }
}
