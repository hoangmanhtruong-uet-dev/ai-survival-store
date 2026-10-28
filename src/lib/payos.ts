// PayOS Official Integration Engine (payos.vn)
import { PayOS } from '@payos/node';

export function isPayOSConfigured(): boolean {
  return Boolean(
    process.env.PAYOS_CLIENT_ID &&
    process.env.PAYOS_API_KEY &&
    process.env.PAYOS_CHECKSUM_KEY &&
    process.env.PAYOS_CLIENT_ID.trim().length > 0 &&
    !process.env.PAYOS_CLIENT_ID.includes('placeholder')
  );
}

let payOSClient: PayOS | null = null;

export function getPayOSClient(): PayOS | null {
  if (!isPayOSConfigured()) return null;

  if (!payOSClient) {
    payOSClient = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID!.trim(),
      apiKey: process.env.PAYOS_API_KEY!.trim(),
      checksumKey: process.env.PAYOS_CHECKSUM_KEY!.trim(),
    });
  }
  return payOSClient;
}

export interface CreatePayOSLinkParams {
  orderCodeStr: string; // e.g. 'MEO-4829'
  amount: number;
  productName: string;
  origin?: string;
}

export interface PayOSLinkResult {
  checkoutUrl: string;
  qrCode?: string;
  orderCodeNum: number;
  paymentLinkId?: string;
}

/**
 * Tạo link thanh toán PayOS + QR Code
 */
export async function createPayOSPaymentLink(
  params: CreatePayOSLinkParams
): Promise<PayOSLinkResult | null> {
  const payOS = getPayOSClient();
  if (!payOS) return null;

  // PayOS yêu cầu orderCode là số nguyên (Int64)
  // Bóc tách số từ 'MEO-4829' -> 4829 hoặc sinh số ngẫu nhiên 6 chữ số
  const numericPart = parseInt(params.orderCodeStr.replace(/\D/g, ''), 10);
  const orderCodeNum = Number.isInteger(numericPart) && numericPart > 0
    ? numericPart
    : Math.floor(100000 + Math.random() * 900000);

  // PayOS giới hạn description tối đa 25 ký tự không dấu hoặc ngắn gọn
  const cleanOrderCode = params.orderCodeStr.replace('-', ' ');
  const description = cleanOrderCode.slice(0, 25);

  const baseUrl = params.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const paymentLink = await payOS.paymentRequests.create({
      orderCode: orderCodeNum,
      amount: params.amount,
      description,
      items: [
        {
          name: params.productName.slice(0, 50),
          quantity: 1,
          price: params.amount,
        },
      ],
      cancelUrl: `${baseUrl}/?cancel=true`,
      returnUrl: `${baseUrl}/?success=true&order=${params.orderCodeStr}`,
    });

    return {
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      orderCodeNum,
      paymentLinkId: paymentLink.paymentLinkId,
    };
  } catch (error) {
    console.error('PayOS createPaymentLink error:', error);
    return null;
  }
}

/**
 * Xác thực dữ liệu Webhook gửi từ PayOS
 */
export async function verifyPayOSWebhook(webhookBody: unknown) {
  const payOS = getPayOSClient();
  if (!payOS) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await payOS.webhooks.verify(webhookBody as any);
  } catch (error) {
    console.error('PayOS verify error:', error);
    return null;
  }
}
