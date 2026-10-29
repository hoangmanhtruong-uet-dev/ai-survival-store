// TypeScript definitions for Mèo Dev Sinh Tồn

export type ProductType = 'DONATE' | 'AI_TASK' | 'R2_FILE' | 'GDRIVE_ACCESS' | 'CUSTOM_TASK' | 'EBOOK';

export interface Product {
  id: string; // 'PATE-05' | 'ROAST-10' | 'CHEM-PACK' | 'CHEM-49' | 'CHEM-89' | 'CHEM-149' | 'TAROT-10'
  name: string;
  description: string;
  price: number;
  type: ProductType;
  r2_file_key?: string | null;
  gdrive_folder_id?: string | null;
  content_markdown?: string | null;
  icon: string;
  badge?: string;
  is_active: boolean;
  sort_order: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'EXPIRED';

export interface Order {
  id: string;
  order_code: string; // e.g. 'MEO-4829'
  product_id: string;
  product?: Product;
  amount: number;
  status: OrderStatus;
  buyer_name?: string;
  buyer_email?: string; // Gmail nhận quyền Google Drive
  buyer_note?: string;
  buyer_social_link?: string;
  ref_code?: string; // Mã giới thiệu của bạn bè
  redeem_code?: string;
  is_redeemed?: boolean;
  ai_result?: Record<string, unknown> | null;
  payment_meta?: Record<string, unknown> | null;
  created_at: string;
  paid_at?: string | null;
}

export type LogType = 'ORDER_CREATED' | 'PAYMENT_SUCCESS' | 'CHAT' | 'TASK_DONE' | 'SYSTEM';

export interface LiveLog {
  id: string | number;
  type: LogType;
  message: string;
  meta?: Record<string, unknown>;
  created_at: string;
}

export interface CampaignStats {
  id: number;
  target_amount: number; // e.g. 5,000,000
  current_amount: number; // e.g. 345,000
  total_orders: number;
  paid_orders: number;
  cat_hunger_level: number; // 0 - 100
  last_order_at?: string | null;
  start_date: string;
  end_date: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tool_call_data?: {
    product_id: string;
    product_name: string;
    price: number;
    order_code: string;
    qr_url: string;
  };
}

export interface TarotCard {
  id: string;
  name: string;
  name_vi: string;
  keywords: string[];
  emoji: string;
  upright_meaning: string;
}

export interface ChemistryQuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  trapType: string; // VD: 'Bẫy Este', 'Bẫy Đồ Thị', 'Bẫy Kim Loại'
}

export type MarketInsightStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';

export interface MarketInsight {
  id: string;
  cycle_time?: string;
  trend_summary: string;
  target_audience?: string;
  market_pain_point?: string;
  proposed_product_id: string;
  proposed_product_name: string;
  proposed_price: number;
  proposed_description: string;
  proposed_outline?: string;
  marketing_angle?: string;
  status: MarketInsightStatus;
  created_at: string;
  reviewed_at?: string | null;
}

export interface ActivationCode {
  id?: string;
  code: string;
  service_type: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at?: string | null;
  created_by?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

