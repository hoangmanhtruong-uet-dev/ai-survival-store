import { Buffer } from 'buffer';

const BANK_ID = process.env.NEXT_PUBLIC_VIETQR_BANK_ID || 'MBBank';
const ACCOUNT_NO = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NO || '01012076666';
const ACCOUNT_NAME = process.env.NEXT_PUBLIC_VIETQR_ACCOUNT_NAME || 'HOANG MANH TRUONG';

export function getBankConfig() {
  return {
    bankId: BANK_ID,
    accountNo: ACCOUNT_NO,
    accountName: ACCOUNT_NAME,
  };
}

/**
 * Sinh link ảnh mã VietQR chuẩn NAPAS247
 * Cú pháp: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
 */
export function generateVietQRUrl(amount: number, orderCode: string): string {
  const cleanBankId = BANK_ID.trim();
  const cleanAccountNo = ACCOUNT_NO.trim();
  const cleanAccountName = encodeURIComponent(ACCOUNT_NAME.trim());
  const cleanOrderCode = encodeURIComponent(orderCode.trim());

  // Template compact2: Tối ưu hiển thị gọn gàng, rõ nét trên mobile
  return `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNo}-compact2.png?amount=${amount}&addInfo=${cleanOrderCode}&accountName=${cleanAccountName}`;
}

/**
 * Sinh chuỗi base64 VietQR data URI (dành cho môi trường không load được external image)
 */
export function generateVietQRFallbackDataUri(amount: number, orderCode: string): string {
  const text = `VIETQR|${BANK_ID}|${ACCOUNT_NO}|${amount}|${orderCode}`;
  return `data:text/plain;base64,${Buffer.from(text).toString('base64')}`;
}

/**
 * Bóc tách mã đơn MEO-XXXX từ nội dung chuyển khoản ngân hàng
 * Hỗ trợ các biến thể: "MEO 4829", "MEO4829", "MEO-4829", "MEO-7K2X9P", "meo 4829", "MEO_4829"
 */
export function extractOrderCode(content: string): string | null {
  if (!content) return null;
  const match = content.match(/MEO[\s\-_]*([A-Za-z0-9]{4,8})/i);
  if (match && match[1]) {
    return `MEO-${match[1].toUpperCase()}`;
  }
  return null;
}

// Bảng ký tự không gây nhầm lẫn (loại trừ 0, O, 1, I) cho khách gõ nội dung chuyển khoản
const SAFE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Sinh mã đơn hàng ngẫu nhiên định dạng MEO-XXXXXX (6 ký tự entropy cao, trên 1 tỷ khả năng, chống trùng lặp)
 */
export function generateOrderCode(): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARSET.length);
    result += SAFE_CHARSET[randomIndex];
  }
  return `MEO-${result}`;
}

/**
 * Sinh mã kích hoạt dịch vụ AI (VD: RCV-7K2X9P)
 */
export function generateRedeemCode(prefix: string = 'RCV'): string {
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARSET.length);
    result += SAFE_CHARSET[randomIndex];
  }
  return `${prefix}-${result}`;
}
