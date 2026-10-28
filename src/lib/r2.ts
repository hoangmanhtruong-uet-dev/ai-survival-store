// Cloudflare R2 (S3-compatible) & Local Storage Fallback Engine
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Lấy URL tải file (Ưu tiên Cloudflare R2 Presigned URL 30 phút, Fallback về thư mục mẫu có sẵn)
 */
export async function getDownloadUrlForFile(fileKey: string): Promise<string> {
  const r2 = getR2Client();

  if (r2 && process.env.R2_BUCKET_NAME) {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileKey,
      });
      // Tạo link có hạn 30 phút (1800 giây)
      const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 1800 });
      return presignedUrl;
    } catch {
      // Fallback xuống local nếu lỗi kết nối R2
    }
  }

  // Chế độ Zero-config Fallback: Tải trực tiếp từ static sample-files
  return `/sample-files/${fileKey}`;
}
