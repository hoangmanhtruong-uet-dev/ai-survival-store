// In-Memory Mock Store for Zero-Config Instant Run (Works without Supabase)
import { Product, Order, LiveLog, CampaignStats } from '@/types';
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
    id: 'CHEM-15',
    name: 'Tổ hợp Đề thi & Lộ trình Hóa 12 / IELTS',
    description: 'Tải ngay trọn bộ đề thi tinh hoa chọn lọc kèm giải chi tiết và bản đồ lộ trình bứt phá điểm số',
    price: 15000,
    type: 'R2_FILE',
    r2_file_key: 'chem-12-lo-trinh.pdf',
    icon: '🧪',
    badge: 'Độc quyền 2026',
    is_active: true,
    sort_order: 3,
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
  {
    id: 'TEMPLATE-29',
    name: 'Source Code UI / Template Next.js Full',
    description: 'Tải trọn gói source code Next.js 15, Tailwind CSS, animations và responsive tối ưu sẵn',
    price: 29000,
    type: 'R2_FILE',
    r2_file_key: 'nextjs-starter-template.zip',
    icon: '⚡',
    badge: 'Tiết kiệm 50h code',
    is_active: true,
    sort_order: 5,
  },
];

// Singleton storage in memory
declare global {
  // eslint-disable-next-line no-var
  var __mockStoreData: {
    stats: CampaignStats;
    products: Product[];
    orders: Map<string, Order>;
    logs: LiveLog[];
    listeners: Set<(event: { type: string; data: unknown }) => void>;
  } | undefined;
}

if (!global.__mockStoreData) {
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const startTime = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(); // Started 14 hours ago

  global.__mockStoreData = {
    stats: {
      id: 1,
      target_amount: 5000000,
      current_amount: 345000,
      total_orders: 24,
      paid_orders: 18,
      cat_hunger_level: 82,
      last_order_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      start_date: startTime,
      end_date: thirtyDaysFromNow,
    },
    products: INITIAL_PRODUCTS,
    orders: new Map<string, Order>(),
    logs: [
      {
        id: 1,
        type: 'SYSTEM',
        message: '🐱 Mèo Dev đã online trên server. Trạng thái: Đói meo, điện còn 50k, đếm ngược 30 ngày.',
        created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        type: 'CHAT',
        message: '👀 Có 18 người đang đứng xem mèo gõ phím...',
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        type: 'ORDER_CREATED',
        message: '🧾 Đã tạo đơn MEO-8921 (Gói Roast CV - 10.000đ) - Chờ thanh toán...',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        id: 4,
        type: 'PAYMENT_SUCCESS',
        message: '💰 TING TING! Nhận thành công +10.000đ cho đơn MEO-8921! Mèo được +15% máu!',
        created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      },
      {
        id: 5,
        type: 'TASK_DONE',
        message: '🚀 Mèo vừa sấy một CV Junior Frontend 2 năm kinh nghiệm nhưng quên gắn link GitHub!',
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
    listeners: new Set(),
  };

  // Seed sample initial paid orders for Hall of Fame
  const sampleOrders: Order[] = [
    {
      id: 'mock-1',
      order_code: 'MEO-1102',
      product_id: 'PATE-05',
      amount: 5000,
      status: 'PAID',
      buyer_name: 'Duy IT Bách Khoa',
      buyer_note: 'Cố lên mèo ơi, đừng để bị xóa server!',
      buyer_social_link: 'https://fb.com',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      paid_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mock-2',
      order_code: 'MEO-4829',
      product_id: 'ROAST-10',
      amount: 10000,
      status: 'PAID',
      buyer_name: 'Huy Frontend',
      buyer_note: 'Chửi CV tao mạnh vào để tao tỉnh ngộ',
      redeem_code: 'RCV-4829',
      is_redeemed: true,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      paid_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'mock-3',
      order_code: 'MEO-7711',
      product_id: 'PATE-05',
      amount: 10000,
      status: 'PAID',
      buyer_name: 'Ngọc Lan 2k5',
      buyer_note: 'Gửi mèo 2 hộp pate cá ngừ ăn lấy sức cày nhé!',
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      paid_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
  ];

  sampleOrders.forEach((o) => global.__mockStoreData?.orders.set(o.order_code, o));
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
    const lastOrderTime = new Date(stats.last_order_at).getTime();
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

  createOrder(productId: string, buyerName?: string, buyerNote?: string, customAmount?: number): Order {
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
      buyer_note: buyerNote || '',
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
};
