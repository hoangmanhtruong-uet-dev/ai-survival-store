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
 * Che thông tin cá nhân (PII: Số điện thoại, Email, Số CMND/CCCD, Ngày sinh, Link riêng tư) trong bài sấy CV
 */
export function scrubPII(text: string): string {
  if (!text) return '';
  return text
    // Che email
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL ĐÃ CHE]')
    // Che số điện thoại VN (10-11 số)
    .replace(/(?:(?:\+84|0)(?:3|5|7|8|9)[0-9]{8})/g, '[SĐT ĐÃ CHE]')
    // Che số CCCD (12 số) hoặc CMND (9 số)
    .replace(/\b\d{9}\b|\b\d{12}\b/g, '[CCCD ĐÃ CHE]')
    // Che ngày tháng năm sinh cụ thể (dd/mm/yyyy hoặc dd-mm-yyyy)
    .replace(/\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[012])[\/\-\.](19\d\d|20\d\d)\b/g, '[NGÀY SINH ĐÃ CHE]')
    // Che link Google Drive / Docs / Dropbox chứa CV cá nhân
    .replace(/(https?:\/\/)?(drive\.google\.com|docs\.google\.com|dropbox\.com)\/[^\s]+/gi, '[LINK CLOUD ĐÃ CHE]')
    // Che link facebook / linkedin cá nhân
    .replace(/(https?:\/\/)?(www\.)?(facebook\.com|linkedin\.com|github\.com)\/[a-zA-Z0-9._-]+/gi, '[LINK ĐÃ CHE]');
}

/**
 * Rút gọn tên người dùng cho Live Terminal và Bảng Vàng
 */
export function sanitizeBuyerName(name?: string): string {
  if (!name || name.trim() === '') return 'Ân nhân giấu tên';
  const clean = filterProfanity(name.trim());
  return clean.slice(0, 30);
}
