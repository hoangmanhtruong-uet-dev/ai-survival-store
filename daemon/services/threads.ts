import { DAEMON_CONFIG } from '../config';
import { SocialPostResult } from './facebook';

/**
 * Đăng bài tự động lên Threads thông qua Meta Threads API chính thức.
 * Luồng hoạt động của Threads API:
 * Bước 1: Tạo Media Container (POST /{threads-user-id}/threads)
 * Bước 2: Xuất bản Container (POST /{threads-user-id}/threads_publish)
 * 
 * Lưu ý: Giới hạn tối đa của Threads là 500 ký tự cho mỗi bài viết dạng TEXT.
 */
export async function publishToThreads(rawText: string): Promise<SocialPostResult> {
  const userId = DAEMON_CONFIG.threadsUserId;
  const accessToken = DAEMON_CONFIG.threadsAccessToken;

  if (!userId || !accessToken) {
    return {
      success: false,
      error: 'Chưa cấu hình THREADS_USER_ID hoặc THREADS_ACCESS_TOKEN trong .env.local',
    };
  }

  // Xử lý giới hạn 500 ký tự của Threads API
  let text = rawText.trim();
  const MAX_THREADS_CHARS = 500;

  if (text.length > MAX_THREADS_CHARS) {
    // Cắt bớt và thêm link web ở cuối
    const ctaSuffix = `...\n👉 Link cứu mèo: ${DAEMON_CONFIG.siteUrl}`;
    const safeLength = MAX_THREADS_CHARS - ctaSuffix.length;
    text = text.slice(0, safeLength).trimEnd() + ctaSuffix;
  }

  try {
    // BƯỚC 1: Tạo Threads Container
    const containerUrl = `https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads`;
    const containerParams = new URLSearchParams({
      media_type: 'TEXT',
      text: text,
      access_token: accessToken,
    });

    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: containerParams.toString(),
    });

    const containerData = await containerRes.json();

    if (!containerRes.ok || containerData.error) {
      const errDetail = containerData.error?.message || containerRes.statusText;
      console.error(`❌ [THREADS API CONTAINER ERROR] Code ${containerData.error?.code}: ${errDetail}`);
      return {
        success: false,
        error: `Threads API Container: ${errDetail}`,
      };
    }

    const creationId = containerData.id as string;
    console.log(`📦 [THREADS API] Đã tạo container thành công (ID: ${creationId}). Chờ 1s để publish...`);

    // Chờ 1 giây ngắn để Meta xử lý container TEXT
    await new Promise((res) => setTimeout(res, 1000));

    // BƯỚC 2: Xuất bản Threads Container
    const publishUrl = `https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: accessToken,
    });

    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: publishParams.toString(),
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || publishData.error) {
      const errDetail = publishData.error?.message || publishRes.statusText;
      console.error(`❌ [THREADS API PUBLISH ERROR] Code ${publishData.error?.code}: ${errDetail}`);
      return {
        success: false,
        error: `Threads API Publish: ${errDetail}`,
      };
    }

    const postId = publishData.id as string;
    let postUrl = `https://www.threads.net`;

    // Cố gắng truy vấn permalink chính xác của bài đăng
    try {
      const permalinkRes = await fetch(
        `https://graph.threads.net/v1.0/${postId}?fields=id,permalink&access_token=${accessToken}`
      );
      if (permalinkRes.ok) {
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink) {
          postUrl = permalinkData.permalink;
        }
      }
    } catch {
      // Bỏ qua lỗi phụ nếu không lấy được permalink
    }

    console.log(`✅ [THREADS API] Đã đăng bài thành công lên Threads! Post ID: ${postId} | URL: ${postUrl}`);
    return {
      success: true,
      postId,
      postUrl,
    };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`❌ [THREADS API NETWORK ERROR]: ${message}`);
    return {
      success: false,
      error: `Lỗi kết nối Threads: ${message}`,
    };
  }
}
