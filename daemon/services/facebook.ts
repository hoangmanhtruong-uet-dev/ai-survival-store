import { DAEMON_CONFIG } from '../config';

export interface SocialPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Đăng bài tự động lên Facebook Fanpage thông qua Meta Graph API chính thức.
 * Yêu cầu:
 * - FB_PAGE_ID: ID của Fanpage (VD: 100083219481234)
 * - FB_PAGE_ACCESS_TOKEN: Page Access Token dài hạn có quyền pages_manage_posts, pages_read_engagement
 */
export async function publishToFacebookPage(message: string, linkUrl?: string): Promise<SocialPostResult> {
  const pageId = DAEMON_CONFIG.facebookPageId;
  const accessToken = DAEMON_CONFIG.facebookPageAccessToken;

  if (!pageId || !accessToken) {
    return {
      success: false,
      error: 'Chưa cấu hình FB_PAGE_ID hoặc FB_PAGE_ACCESS_TOKEN trong .env.local',
    };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(pageId)}/feed`;

    const payload: Record<string, string> = {
      message,
      access_token: accessToken,
    };

    if (linkUrl) {
      payload.link = linkUrl;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errDetail = data.error?.message || response.statusText;
      console.error(`❌ [FACEBOOK API ERROR] Code ${data.error?.code}: ${errDetail}`);
      return {
        success: false,
        error: `Facebook API: ${errDetail} (Mã lỗi: ${data.error?.code || response.status})`,
      };
    }

    const postId = data.id as string;
    let postUrl = `https://facebook.com/${postId}`;

    // Cố gắng lấy link permalink_url chính xác
    try {
      const permalinkRes = await fetch(
        `https://graph.facebook.com/v20.0/${postId}?fields=permalink_url&access_token=${accessToken}`
      );
      if (permalinkRes.ok) {
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink_url) {
          postUrl = permalinkData.permalink_url;
        }
      }
    } catch {
      // Bỏ qua lỗi phụ nếu không lấy được permalink
    }

    console.log(`✅ [FACEBOOK API] Đã đăng bài thành công lên Fanpage! Post ID: ${postId}`);
    return {
      success: true,
      postId,
      postUrl,
    };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`❌ [FACEBOOK API NETWORK ERROR]: ${message}`);
    return {
      success: false,
      error: `Lỗi kết nối Facebook: ${message}`,
    };
  }
}
