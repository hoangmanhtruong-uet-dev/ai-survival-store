import cron from 'node-cron';
import { validateDaemonConfig, DAEMON_CONFIG } from './config';
import { sendTelegramNotification } from './telegram';
import { runHungerDecayTask } from './tasks/hunger-decay';
import { runFlashSaleTask } from './tasks/flash-sale';
import { runDailyContentGeneratorTask } from './tasks/content-generator';
import { runProductGeneratorTask } from './tasks/product-generator';

const BANNER = `
==========================================================
🐱 MÈO DEV SURVIVAL AUTONOMOUS DAEMON 24/7
Target: 7.000.000 VNĐ | Deadline: 60 Ngày | Script: rm -rf /
==========================================================
`;

async function main() {
  console.log(BANNER);

  // 1. Kiểm tra biến môi trường
  const { valid, missing } = validateDaemonConfig();
  if (!valid) {
    console.error('❌ LỖI KHỞI ĐỘNG: Thiếu các biến môi trường bắt buộc:');
    missing.forEach((m) => console.error(`   - ${m}`));
    console.error('\n👉 Vui lòng kiểm tra lại file .env.local trước khi chạy daemon!\n');
    process.exit(1);
  }

  const args = process.argv.slice(2);

  // 2. Chế độ chạy thủ công các tác vụ đơn lẻ (CLI Mode)
  if (args.includes('--hunger')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Giảm độ đói (Hunger Decay)');
    await runHungerDecayTask();
    process.exit(0);
  }

  if (args.includes('--sale')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Kiểm tra Flash Sale');
    await runFlashSaleTask();
    process.exit(0);
  }

  if (args.includes('--content')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: AI Marketing Content Generator');
    await runDailyContentGeneratorTask();
    process.exit(0);
  }

  if (args.includes('--product')) {
    console.log('▶️ [CLI] Kích hoạt thủ công: Tự động mở rộng sản phẩm');
    await runProductGeneratorTask();
    process.exit(0);
  }

  if (args.includes('--test')) {
    console.log('🧪 [TEST MODE] Bắt đầu chạy thử nghiệm toàn bộ 4 tác vụ của Mèo Dev...\n');
    await runHungerDecayTask();
    await runFlashSaleTask();
    await runDailyContentGeneratorTask();
    await runProductGeneratorTask();
    console.log('\n✅ [TEST MODE] Toàn bộ 4 tác vụ tự hành đã chạy thành công!');
    process.exit(0);
  }

  // 3. Chế độ chạy nền 24/7 (Daemon Mode)
  console.log('🚀 [DAEMON ONLINE] Mèo Dev đang chạy ngầm 24/7 trên VPS...\n');
  console.log('⏰ Lịch trình tự động:');
  console.log('   - Mỗi 30 phút:       Trừ 2% độ no bụng & Kêu cứu nếu đói (< 35%)');
  console.log('   - Mỗi 6 tiếng:       Kiểm tra đơn hàng & Kích hoạt Flash Sale nếu ế');
  console.log('   - 21:00 mỗi ngày:    AI viết bài Viral Threads/FB & Kịch bản TikTok gửi về Telegram');
  console.log('   - Mỗi 3 ngày (10:00): Gemini Pro tự biên soạn tài liệu mới nạp vào Store\n');

  // Bắn thông báo khởi động lên Telegram
  await sendTelegramNotification(
    `🐱 <b>MÈO DEV DAEMON ĐÃ ONLINE TRÊN VPS!</b>\n\n` +
    `• <b>Mục tiêu:</b> <code>7.000.000đ trong 60 ngày</code>\n` +
    `• <b>Hạ tầng:</b> Node.js Daemon 24/7\n` +
    `• <b>Website:</b> <a href="${DAEMON_CONFIG.siteUrl}">${DAEMON_CONFIG.siteUrl}</a>\n\n` +
    `<i>Mèo Dev sẽ tự động cày việc, tạo content và báo cáo đều đặn về Telegram của bạn!</i>`
  );

  // Tác vụ 1: Mỗi 30 phút giảm đói
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runHungerDecayTask();
    } catch (e) {
      console.error('❌ Lỗi cron hunger-decay:', (e as Error).message);
    }
  });

  // Tác vụ 2: Mỗi 6 tiếng kiểm tra Flash Sale
  cron.schedule('0 */6 * * *', async () => {
    try {
      await runFlashSaleTask();
    } catch (e) {
      console.error('❌ Lỗi cron flash-sale:', (e as Error).message);
    }
  });

  // Tác vụ 3: 21:00 hàng ngày sinh content marketing
  cron.schedule('0 21 * * *', async () => {
    try {
      await runDailyContentGeneratorTask();
    } catch (e) {
      console.error('❌ Lỗi cron content-generator:', (e as Error).message);
    }
  });

  // Tác vụ 4: 10:00 sáng mỗi 3 ngày tự sinh sản phẩm mới
  cron.schedule('0 10 */3 * *', async () => {
    try {
      await runProductGeneratorTask();
    } catch (e) {
      console.error('❌ Lỗi cron product-generator:', (e as Error).message);
    }
  });

  // Xử lý dừng tiến trình an toàn
  const handleExit = async (signal: string) => {
    console.log(`\n🛑 Nhận tín hiệu ${signal}. Đang tắt Mèo Dev Daemon...`);
    await sendTelegramNotification(`⚠️ <i>Mèo Dev Daemon trên VPS vừa dừng hoạt động (${signal}).</i>`);
    process.exit(0);
  };

  process.on('SIGINT', () => handleExit('SIGINT'));
  process.on('SIGTERM', () => handleExit('SIGTERM'));
}

main().catch((err) => {
  console.error('💥 Lỗi không xác định:', err);
  process.exit(1);
});

