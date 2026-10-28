// Profanity filter & PII (Personally Identifiable Information) scrubber

const SENSITIVE_PATTERNS = [
  /\b(đụ|địt|lồn|buồi|cặc|đm|vcl|vl|đéo|dcm|đcm|vcc|chó đẻ|ngu lồn)\b/gi,
  /\b(sex|porn|gambling|casino|bet88|kubet)\b/gi,
];

/**
 * Che từ ngữ tục tĩu / nhạy cảm
 */
export function filterProfanity(text: string): string {
  if (!text) return '';
  let filtered = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    filtered = filtered.replace(pattern, '***');
  }
  return filtered;
}

/**
 * Che thông tin cá nhân (PII: Số điện thoại, Email, Số CMND/CCCD) trong bài chửi CV
 */
export function scrubPII(text: string): string {
  if (!text) return '';
  return text
    // Che email
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL ĐÃ CHE]')
    // Che số điện thoại VN (10-11 số)
    .replace(/(0|\+84)[3|5|7|8|9][0-9]{8}/g, '[SĐT ĐÃ CHE]')
    // Che số CCCD (12 số) hoặc CMND (9 số)
    .replace(/\b\d{9}\b|\b\d{12}\b/g, '[CCCD ĐÃ CHE]')
    // Che link facebook / linkedin cá nhân
    .replace(/(https?:\/\/)?(www\.)?(facebook\.com|linkedin\.com)\/[a-zA-Z0-9._-]+/g, '[LINK ĐÃ CHE]');
}

/**
 * Rút gọn tên người dùng cho Live Terminal và Bảng Vàng
 */
export function sanitizeBuyerName(name?: string): string {
  if (!name || name.trim() === '') return 'Ân nhân giấu tên';
  const clean = filterProfanity(name.trim());
  return clean.slice(0, 30);
}
