/**
 * Mốc thời gian mở bán chính thức Gói Đề Hóa Học (sau 3 ngày kể từ 29/10/2026)
 * Giờ hẹn: 06:00 sáng ngày 01/11/2026 (GMT+7)
 */
export const CHEMISTRY_LAUNCH_DATE = '2026-11-01T06:00:00+07:00';

/**
 * Kiểm tra xem Gói Đề Hóa có đang trong thời gian hoàn thiện (chưa mở bán) hay không
 */
export function isChemistryComingSoon(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return Date.now() < new Date(CHEMISTRY_LAUNCH_DATE).getTime();
}

/**
 * Tính toán thời gian đếm ngược còn lại đến giờ mở bán
 */
export function getChemistryCountdown(): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = typeof window !== 'undefined' ? Date.now() : new Date('2026-10-29T00:00:00+07:00').getTime();
  const diff = new Date(CHEMISTRY_LAUNCH_DATE).getTime() - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, isExpired: false };
}
