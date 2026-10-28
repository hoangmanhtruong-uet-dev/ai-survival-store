// VietQR URL Generator & Bank Transfer parser

export interface VietQRConfig {
  bankId: string;
  accountNo: string;
  accountName?: string;
  amount: number;
  description: string;
}

export function getBankConfig() {
  return {
    bankId: process.env.NEXT_PUBLIC_VIETQR_BANK_ID || 'MBBank',
    accountNo: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO || '0987654321',
    accountName: process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME || 'NGUYEN VAN DEV',
  };
}

/**
 * Tạo URL ảnh VietQR chuẩn compact2 từ vietqr.io
 */
export function generateVietQRUrl(amount: number, orderCode: string): string {
  const config = getBankConfig();
  const encodedDesc = encodeURIComponent(orderCode);
  const encodedName = encodeURIComponent(config.accountName);

  // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>
  return `https://img.vietqr.io/image/${config.bankId}-${config.accountNo}-compact2.png?amount=${amount}&addInfo=${encodedDesc}&accountName=${encodedName}`;
}

/**
 * Bóc tách mã đơn MEO-XXXX từ nội dung chuyển khoản ngân hàng
 * Hỗ trợ các biến thể: "MEO 4829", "MEO4829", "MEO-4829", "meo 4829", "MEO_4829"
 */
export function extractOrderCode(content: string): string | null {
  if (!content) return null;
  const match = content.match(/MEO[\s\-_]*([A-Za-z0-9]{4,6})/i);
  if (match && match[1]) {
    return `MEO-${match[1].toUpperCase()}`;
  }
  return null;
}

/**
 * Sinh mã đơn hàng ngẫu nhiên định dạng MEO-XXXX (4 chữ số dễ nhớ cho khách nhập ngân hàng)
 */
export function generateOrderCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `MEO-${randomNum}`;
}

/**
 * Sinh mã kích hoạt dịch vụ AI (VD: RCV-9821)
 */
export function generateRedeemCode(prefix: string = 'RCV'): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
}
