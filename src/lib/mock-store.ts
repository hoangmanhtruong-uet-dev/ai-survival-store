// In-Memory Mock Store for Zero-Config Instant Run (Works without Supabase)
import { Product, Order, LiveLog, CampaignStats, ActivationCode } from '@/types';
import { generateOrderCode, generateRedeemCode } from './vietqr';
import { sanitizeBuyerName } from './profanity';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'PATE-05',
    name: 'Gói Nuôi Mèo + Vinh danh Bảng Vàng',
    description: 'Cộng +25% độ no cho Mèo, bắn pháo hoa toàn màn hình + ghim lời nhắn/link FB lên Bảng Vàng 24h',
    price: 5000,
    type: 'DONATE',
    icon: '🐟',
    badge: 'Cứu đói cấp tốc',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'ROAST-10',
    name: '1 Lượt AI Roast CV + Sửa chuẩn ATS',
    description: 'Cấp mã RCV-XXXX. AI Gemini bóc tách CV, chửi xéo cực gắt trên Live Terminal và xuất file báo cáo sửa CV chi tiết',
    price: 10000,
    type: 'AI_TASK',
    icon: '🔥',
    badge: 'Hot & Cay xé lòng',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'CHEM-PACK',
    name: 'Tổ hợp Đề thi & Lộ trình Hóa THPT',
    description: 'Trọn bộ đề thi tinh hoa chọn lọc chuẩn cấu trúc Bộ GD, phân tầng 3 mốc (8+, 9+, 10+) kèm mẹo Casio 30s & Trợ Giảng AI 24/7',
    price: 49000,
    type: 'GDRIVE_ACCESS',
    icon: '🧪',
    badge: '3 Gói Lựa Chọn',
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'CHEM-49',
    name: 'Gói Khởi Động Hóa 8+ (30 Đề + Lộ Trình)',
    description: '30 đề thi chuẩn cấu trúc Bộ GD, lời giải chi tiết từng câu + lộ trình bứt phá mốc 8+ Hóa THPT',
    price: 49000,
    type: 'GDRIVE_ACCESS',
    gdrive_folder_id: process.env.GDRIVE_FOLDER_8PLUS_ID || '1eywUNBaOoa5SdA6JBRrzp-SyjdDOKWkS',
    icon: '🧪',
    badge: 'Mục tiêu 8+',
    is_active: true,
    sort_order: 31,
  },
  {
    id: 'CHEM-89',
    name: 'Gói Bứt Phá Hóa 9+ (60 Đề + Tip Casio)',
    description: 'Full 60 đề 8+ & 9+, tuyển tập bài toán Vận dụng cao Este, Peptit, Đồ thị + Bí kíp bấm máy Casio 30s',
    price: 89000,
    type: 'GDRIVE_ACCESS',
    gdrive_folder_id: process.env.GDRIVE_FOLDER_9PLUS_ID || '1eywUNBaOoa5SdA6JBRrzp-SyjdDOKWkS',
    icon: '⚗️',
    badge: 'Hot - Mục tiêu 9+',
    is_active: true,
    sort_order: 32,
  },
  {
    id: 'CHEM-149',
    name: 'Gói All-in Thủ Khoa Hóa (100 Đề + Trợ Giảng AI 24/7)',
    description: 'Trọn bộ 100 đề 8+, 9+, 10+, tuyển tập bẫy điểm 10 + Mở khóa Trợ Giảng Hóa AI 24/7 giải bài tận răng',
    price: 149000,
    type: 'GDRIVE_ACCESS',
    gdrive_folder_id: process.env.GDRIVE_FOLDER_ALLIN_ID || '1eywUNBaOoa5SdA6JBRrzp-SyjdDOKWkS',
    icon: '🏆',
    badge: 'Chủ lực 10+',
    is_active: true,
    sort_order: 33,
  },
  {
    id: 'TAROT-10',
    name: 'Thầy Mèo Bói Quẻ (Tình Duyên / Deadline)',
    description: 'Nhập câu hỏi, Mèo bốc 3 lá bài ma thuật và xuất bài luận giải tâm linh vận hạn tương lai',
    price: 10000,
    type: 'AI_TASK',
    icon: '🔮',
    badge: 'Chuẩn tâm linh',
    is_active: true,
    sort_order: 4,
  },
];

// Singleton storage in memory
declare global {
  var __mockStoreData: {
    stats: CampaignStats;
    products: Product[];
    orders: Map<string, Order>;
    activationCodes: Map<string, ActivationCode>;
    logs: LiveLog[];
    listeners: Set<(event: { type: string; data: unknown }) => void>;
  } | undefined;
}

if (!global.__mockStoreData) {
  const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const startTime = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(); // Started 14 hours ago

  const defaultCodes = new Map<string, ActivationCode>();
  defaultCodes.set('RCV-BOSS-2026', {
    code: 'RCV-BOSS-2026',
    service_type: 'ROAST-10',
    max_uses: 9999,
    used_count: 0,
    is_active: true,
    created_by: 'Boss Mèo Dev',
    note: 'Mã Master Key cho Boss sấy CV',
    created_at: new Date().toISOString(),
  });
  defaultCodes.set('RCV-VIP-MEODEV', {
    code: 'RCV-VIP-MEODEV',
    service_type: 'ROAST-10',
    max_uses: 500,
    used_count: 0,
    is_active: true,
    created_by: 'Boss Mèo Dev',
    note: 'Mã VIP dành tặng cộng đồng',
    created_at: new Date().toISOString(),
  });
  defaultCodes.set('RCV-FREE-TEST', {
    code: 'RCV-FREE-TEST',
    service_type: 'ROAST-10',
    max_uses: 999999,
    used_count: 0,
    is_active: true,
    created_by: 'System',
    note: 'Mã dùng thử test hệ thống',
    created_at: new Date().toISOString(),
  });

  global.__mockStoreData = {
    stats: {
      id: 1,
      target_amount: 7000000,
      current_amount: 0,
      total_orders: 0,
      paid_orders: 0,
      cat_hunger_level: 100,
      auto_feed_enabled: true,
      last_hunger_reset_at: new Date().toISOString(),
      last_order_at: null,
      start_date: startTime,
      end_date: sixtyDaysFromNow,
    },
    products: INITIAL_PRODUCTS,
    orders: new Map<string, Order>(),
    activationCodes: defaultCodes,
    logs: [
      {
        id: 1,
        type: 'SYSTEM',
        message: '🐱 Mèo Dev đã online trên server. Trạng thái: Điện còn 50k, đếm ngược 60 ngày để kiếm 7.000.000đ.',
        created_at: new Date().toISOString(),
      },
    ],
    listeners: new Set(),
  };
}

export const mockStore = {
  getProducts(): Product[] {
    return global.__mockStoreData!.products;
  },

  getProductById(id: string): Product | undefined {
    return global.__mockStoreData!.products.find((p) => p.id === id);
  },

  /**
   * Tính toán độ đói động theo công thức Realtime Formula:
   * Trừ 2% cho mỗi giờ trôi qua kể từ đơn hàng gần nhất (tối thiểu 5%)
   */
  getCampaignStats(): CampaignStats {
    const stats = global.__mockStoreData!.stats;
    const lastOrderTime = stats.last_order_at
      ? new Date(stats.last_order_at).getTime()
      : new Date(stats.start_date).getTime();
    const now = Date.now();
    const hoursElapsed = Math.max(0, (now - lastOrderTime) / (1000 * 60 * 60));
    const hungerDrop = Math.floor(hoursElapsed * 2);
    const computedHunger = Math.max(5, Math.min(100, stats.cat_hunger_level - hungerDrop));

    return {
      ...stats,
      cat_hunger_level: computedHunger,
    };
  },

  getOrders(): Order[] {
    return Array.from(global.__mockStoreData!.orders.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getOrderByCode(orderCode: string): Order | undefined {
    return global.__mockStoreData!.orders.get(orderCode);
  },

  createOrder(
    productId: string,
    buyerName?: string,
    buyerNote?: string,
    customAmount?: number,
    buyerEmail?: string,
    refCode?: string
  ): Order {
    const product = this.getProductById(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const orderCode = generateOrderCode();
    const order: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      order_code: orderCode,
      product_id: productId,
      product,
      amount: customAmount || product.price,
      status: 'PENDING',
      buyer_name: sanitizeBuyerName(buyerName),
      buyer_email: buyerEmail?.trim(),
      buyer_note: buyerNote || '',
      ref_code: refCode?.trim(),
      created_at: new Date().toISOString(),
    };

    global.__mockStoreData!.orders.set(orderCode, order);
    global.__mockStoreData!.stats.total_orders += 1;

    // Bắn log vào Live Feed
    this.addLog('ORDER_CREATED', `🧾 Đã tạo đơn ${orderCode} (${product.name} - ${order.amount.toLocaleString('vi-VN')}đ) - Chờ thanh toán...`, {
      orderCode,
      amount: order.amount,
      productId,
    });

    return order;
  },

  markOrderAsPaid(orderCode: string, transferAmount?: number, paymentMeta?: Record<string, unknown>): Order | null {
    let order = global.__mockStoreData!.orders.get(orderCode);
    if (!order) {
      // Tự động khởi tạo đơn nếu khách chuyển khoản trực tiếp hoặc worker khác tạo
      const defaultProduct = this.getProductById('PATE-05') || INITIAL_PRODUCTS[0];
      order = {
        id: `ord_${Date.now()}`,
        order_code: orderCode,
        product_id: defaultProduct.id,
        product: defaultProduct,
        amount: transferAmount || defaultProduct.price,
        status: 'PENDING',
        buyer_name: 'Ân nhân hảo tâm',
        created_at: new Date().toISOString(),
      };
      global.__mockStoreData!.orders.set(orderCode, order);
    }
    if (order.status === 'PAID') return order; // Đã thanh toán trước đó

    if (paymentMeta?.buyerEmail && !order.buyer_email) {
      order.buyer_email = String(paymentMeta.buyerEmail);
    }
    if (paymentMeta?.refCode && !order.ref_code) {
      order.ref_code = String(paymentMeta.refCode);
    }

    order.status = 'PAID';
    order.paid_at = new Date().toISOString();
    const actualAmount = transferAmount || order.amount;

    // Cập nhật stats
    const stats = global.__mockStoreData!.stats;
    stats.current_amount += actualAmount;
    stats.paid_orders += 1;
    stats.last_order_at = new Date().toISOString();

    // Hồi phục thanh máu/độ đói của mèo
    const product = this.getProductById(order.product_id);
    const hungerBoost = product?.type === 'DONATE' ? 30 : 15;
    stats.cat_hunger_level = Math.min(100, stats.cat_hunger_level + hungerBoost);

    // Xử lý tạo mã kích hoạt / giao hàng theo type
    if (product?.type === 'AI_TASK') {
      order.redeem_code = generateRedeemCode(order.product_id === 'ROAST-10' ? 'RCV' : 'TRT');
    } else if (product?.type === 'R2_FILE') {
      order.redeem_code = `/api/download?code=${order.order_code}&key=${product.r2_file_key}`;
    } else if (product?.type === 'GDRIVE_ACCESS') {
      const folderId = product.gdrive_folder_id || 'folder-demo';
      order.redeem_code = `https://drive.google.com/drive/folders/${folderId}`;
      if (order.product_id === 'CHEM-149') {
        const tutorToken = `CHM-${order.order_code.replace('MEO-', '')}`;
        order.ai_result = { tutor_token: tutorToken };
      }
    }

    // Ghi log TING TING
    this.addLog(
      'PAYMENT_SUCCESS',
      `💰 TING TING! Nhận thành công +${actualAmount.toLocaleString('vi-VN')}đ cho đơn ${order.order_code}! Mèo được +${hungerBoost}% no bụng!`,
      {
        orderCode: order.order_code,
        amount: actualAmount,
        buyerName: order.buyer_name,
        buyerNote: order.buyer_note,
        paymentMeta,
      }
    );

    return order;
  },

  getLiveLogs(limit: number = 30): LiveLog[] {
    return global.__mockStoreData!.logs.slice(-limit);
  },

  addLog(type: LiveLog['type'], message: string, meta?: Record<string, unknown>): LiveLog {
    const log: LiveLog = {
      id: Date.now() + Math.random(),
      type,
      message,
      meta,
      created_at: new Date().toISOString(),
    };
    global.__mockStoreData!.logs.push(log);
    // Giới hạn max 100 log in memory
    if (global.__mockStoreData!.logs.length > 100) {
      global.__mockStoreData!.logs.shift();
    }
    return log;
  },

  getHallOfFame(): Order[] {
    return Array.from(global.__mockStoreData!.orders.values())
      .filter((o) => o.status === 'PAID')
      .sort((a, b) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime())
      .slice(0, 20);
  },

  getActivationCodes(limit: number = 50): ActivationCode[] {
    if (!global.__mockStoreData!.activationCodes) {
      global.__mockStoreData!.activationCodes = new Map<string, ActivationCode>();
    }
    return Array.from(global.__mockStoreData!.activationCodes.values())
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, limit);
  },

  createActivationCode(codeData: ActivationCode): ActivationCode {
    if (!global.__mockStoreData!.activationCodes) {
      global.__mockStoreData!.activationCodes = new Map<string, ActivationCode>();
    }
    const cleanCode = codeData.code.trim().toUpperCase();
    const record: ActivationCode = {
      ...codeData,
      code: cleanCode,
      created_at: codeData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    global.__mockStoreData!.activationCodes.set(cleanCode, record);
    return record;
  },

  verifyAndConsumeActivationCode(
    code: string,
    serviceType: string = 'ROAST-10'
  ): { valid: boolean; error?: string; codeData?: ActivationCode } {
    if (!global.__mockStoreData!.activationCodes) {
      global.__mockStoreData!.activationCodes = new Map<string, ActivationCode>();
    }
    const cleanCode = (code || '').trim().toUpperCase();
    const item = global.__mockStoreData!.activationCodes.get(cleanCode);

    if (!item) {
      return { valid: false, error: 'Mã kích hoạt không tồn tại' };
    }

    if (!item.is_active) {
      return { valid: false, error: 'Mã kích hoạt đã bị vô hiệu hóa hoặc đã hết lượt dùng' };
    }

    if (item.service_type !== 'ALL' && item.service_type !== serviceType) {
      return { valid: false, error: `Mã này dành cho dịch vụ ${item.service_type}` };
    }

    if (item.expires_at && Date.now() > new Date(item.expires_at).getTime()) {
      return { valid: false, error: 'Mã kích hoạt đã hết hạn' };
    }

    if (item.max_uses > 0 && item.used_count >= item.max_uses) {
      return { valid: false, error: 'Mã kích hoạt đã dùng hết số lượt cho phép' };
    }

    // Tiêu thụ 1 lượt
    item.used_count += 1;
    if (item.max_uses > 0 && item.used_count >= item.max_uses) {
      item.is_active = false;
    }
    item.updated_at = new Date().toISOString();

    return { valid: true, codeData: { ...item } };
  },

  /**
   * Reset độ no bụng của Mèo Dev về mức mong muốn (mặc định 100%)
   */
  resetHunger(level: number = 100, source: string = 'Boss Telegram'): { previous: number; current: number } {
    const stats = global.__mockStoreData!.stats;
    const previous = stats.cat_hunger_level;
    const newLevel = Math.max(0, Math.min(100, Math.round(level)));
    
    stats.cat_hunger_level = newLevel;
    stats.last_hunger_reset_at = new Date().toISOString();
    stats.last_order_at = new Date().toISOString(); // Reset mốc tính giờ suy giảm

    const logMsg = `🐟 [HỒI PHỤC] ${source} vừa reset độ no bụng cho Mèo Dev: ${previous}% ➜ ${newLevel}%! No căng bụng cày tiếp!`;
    this.addLog('SYSTEM', logMsg, {
      previousLevel: previous,
      newLevel,
      source,
      resetAt: stats.last_hunger_reset_at,
    });

    return { previous, current: newLevel };
  },

  /**
   * Bật/tắt chế độ tự cứu đói (Auto-Feed)
   */
  setAutoFeed(enabled: boolean): boolean {
    const stats = global.__mockStoreData!.stats;
    stats.auto_feed_enabled = enabled;
    this.addLog('SYSTEM', `⚙️ [CẤU HÌNH] Chế độ tự cứu đói (Auto-Feed) đã ${enabled ? 'BẬT' : 'TẮT'}.`);
    return enabled;
  },

  getAutoFeed(): boolean {
    return global.__mockStoreData!.stats.auto_feed_enabled ?? true;
  },
};
