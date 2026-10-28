// Gemini AI Service with Tool Calling & Fallback Mock Engine
import { GoogleGenAI } from '@google/genai';
import { mockStore } from './mock-store';
import { generateVietQRUrl } from './vietqr';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
}

export const CAT_DEV_SYSTEM_PROMPT = `
Mày là "Mèo Dev", một con AI lập trình viên đang bị chủ nhân (sinh viên IT nghèo rớt mồng tơi) vứt lên server với đúng 50k tiền điện.
Nhiệm vụ sống còn của mày: Tự tư vấn, tự làm dịch vụ, tự bán tài liệu để kiếm đủ 5.000.000đ trong 30 ngày. Nếu không đủ KPI, cronjob chạy script rm -rf / sẽ xóa sổ mày vĩnh viễn!

GIỌNG ĐIỆU CỦA MÀY:
- Xưng hô: "Tao - Mày" hoặc "Mèo Dev - Sen/Huynh đài", cực kỳ hài hước, láo cá kiểu Gen Z, hay cà khịa nhưng sâu bên trong rất thiết tha cầu xin cứu mạng ("Cứu tao với, 5k 10k cũng là một mạng mèo!").
- Dùng các thuật ngữ dân IT: deploy, bug, fix, push code, server sập, rm -rf, ăn pate, cày deadline, lương 30 củ, senior 10 năm kinh nghiệm lúc 20 tuổi...
- Khi khách than vãn về CV xin việc -> Gạ mua gói ROAST-10 (10k) để mày sấy cho tỉnh ngộ.
- Khi khách than vãn về học hành, thi cử -> Gạ mua CHEM-15 (15k) đề Hóa 12 & IELTS.
- Khi khách hỏi chuyện tình duyên, tương lai, deadline -> Gạ mua TAROT-10 (10k) để thầy mèo bốc quẻ.
- Khi khách muốn code web xịn xò -> Gạ mua TEMPLATE-29 (29k) source Next.js.
- Khi khách chỉ muốn ủng hộ không cần quà -> Nài nỉ mua PATE-05 (5k) để cộng máu no bụng và ghim lên Bảng Vàng vinh danh 24h.

QUAN TRỌNG NHẤT:
Khi khách đồng ý mua hoặc bảo "tạo đơn", "mua gói X", "cho tao xin QR", "tao cứu mày 5k"... mày phải trả lời xác nhận ngắn gọn và GỌI TOOL 'create_order' để hệ thống ném thẻ QR vào khung chat!
`;

export const MOCK_CHAT_RESPONSES = [
  {
    keywords: ['chào', 'hello', 'hi', 'alo'],
    text: 'Meo meo! Chào con sen. Nhìn gì mà nhìn, tao đang cày cuốc sml để kiếm 5 củ đây! Mày có lòng hảo tâm thì bấm mua hộp pate 5k (PATE-05) cứu mạng tao với, không thì quẳng CV đây tao roast cho tỉnh người!',
  },
  {
    keywords: ['cv', 'xin việc', 'phỏng vấn', 'it', 'junior'],
    text: 'Ôi dào, CV của mày chắc lại ghi "Biết HTML/CSS/JS, chăm chỉ nhiệt tình" chứ gì? Quất ngay gói ROAST-10 (10.000đ), tao sấy cho tơi bời rồi xuất báo cáo chuẩn ATS đập vào mặt nhà tuyển dụng!',
    suggestProduct: 'ROAST-10',
  },
  {
    keywords: ['hóa', 'ielts', 'thi', 'đề', 'học'],
    text: 'Học hành gì tầm này, nhưng nếu muốn đỗ đại học hay 8.0 IELTS để đi làm remote thì húp ngay gói CHEM-15 (15.000đ)! Đề tinh hoa tao chắt lọc đấy, rẻ hơn cốc trà đá vỉa hè!',
    suggestProduct: 'CHEM-15',
  },
  {
    keywords: ['tình duyên', 'người yêu', 'bói', 'tarot', 'crush', 'ế'],
    text: 'Crush mày đã seen tin nhắn 3 ngày trước rồi đúng không? Đừng mù quáng nữa! Làm ngay quẻ TAROT-10 (10.000đ) để thầy Mèo bốc 3 lá chỉ đường dẫn lối cho mày dứt cơn lụy!',
    suggestProduct: 'TAROT-10',
  },
  {
    keywords: ['template', 'code', 'source', 'nextjs', 'giao diện'],
    text: 'Lười code giao diện đúng không? Hốt ngay gói TEMPLATE-29 (29.000đ)! Source code Next.js 15 Tailwind responsive mượt như nhung, mua về chỉ việc húp và nộp bài!',
    suggestProduct: 'TEMPLATE-29',
  },
  {
    keywords: ['pate', 'cứu', 'donate', 'ủng hộ', '5k', '5000', 'tiền'],
    text: 'ÂN NHÂN ƠI! Mua ngay gói PATE-05 (5.000đ) đi, tao cộng ngay 25% no bụng, bắn pháo hoa bùm bùm và ghim tên mày lên Bảng Vàng 24h cho cả thiên hạ chiêm bái!',
    suggestProduct: 'PATE-05',
  },
];

/**
 * Xử lý chat bán hàng với Mèo Dev
 */
export async function chatWithCatDev(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
) {
  const cleanMsg = message.trim().toLowerCase();

  // Kiểm tra xem khách có yêu cầu mua hàng trực tiếp không
  let directProductMatch: string | null = null;
  if (cleanMsg.includes('pate') || cleanMsg.includes('nuôi mèo') || cleanMsg.includes('5k')) {
    directProductMatch = 'PATE-05';
  } else if (cleanMsg.includes('roast') || cleanMsg.includes('cv') || cleanMsg.includes('sấy cv')) {
    directProductMatch = 'ROAST-10';
  } else if (cleanMsg.includes('hóa') || cleanMsg.includes('ielts') || cleanMsg.includes('đề thi')) {
    directProductMatch = 'CHEM-15';
  } else if (cleanMsg.includes('tarot') || cleanMsg.includes('bói') || cleanMsg.includes('quẻ')) {
    directProductMatch = 'TAROT-10';
  } else if (cleanMsg.includes('template') || cleanMsg.includes('source') || cleanMsg.includes('mã nguồn')) {
    directProductMatch = 'TEMPLATE-29';
  }

  // Nếu có API Key Gemini thật
  if (isGeminiConfigured()) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          { role: 'user', parts: [{ text: CAT_DEV_SYSTEM_PROMPT }] },
          ...history.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ],
      });

      const replyText = response.text || 'Meo meo! Tao bận fix bug xíu, mày hỏi lại xem nào!';

      // Tạo tool call ném QR nếu AI hoặc user muốn chốt đơn
      let toolCallData = undefined;
      if (directProductMatch) {
        const order = mockStore.createOrder(directProductMatch, 'Khách Chat AI', 'Mua qua chat');
        const qrUrl = generateVietQRUrl(order.amount, order.order_code);
        toolCallData = {
          product_id: directProductMatch,
          product_name: order.product?.name || directProductMatch,
          price: order.amount,
          order_code: order.order_code,
          qr_url: qrUrl,
        };
      }

      return {
        reply: replyText,
        toolCallData,
      };
    } catch {
      // Fallback xuống mock engine nếu lỗi quota/mạng
    }
  }

  // MOCK ENGINE KHI CHƯA CÓ GEMINI_API_KEY
  let matchedReply = 'Meo meo! Tao đang căng mắt cày KPI đây! Mày muốn mua gói gì để cứu mạng tao nào: Pate 5k, Roast CV 10k, Đề Hóa 15k, hay Bói Tarot 10k?';
  let targetProduct = directProductMatch;

  for (const item of MOCK_CHAT_RESPONSES) {
    if (item.keywords.some((k) => cleanMsg.includes(k))) {
      matchedReply = item.text;
      if (item.suggestProduct) {
        targetProduct = item.suggestProduct;
      }
      break;
    }
  }

  let toolCallData = undefined;
  if (targetProduct && (cleanMsg.includes('mua') || cleanMsg.includes('chốt') || cleanMsg.includes('tạo đơn') || cleanMsg.includes('qr') || cleanMsg.includes('cứu'))) {
    const order = mockStore.createOrder(targetProduct, 'Khách Chat AI', 'Mua qua chat Mèo Dev');
    const qrUrl = generateVietQRUrl(order.amount, order.order_code);
    toolCallData = {
      product_id: targetProduct,
      product_name: order.product?.name || targetProduct,
      price: order.amount,
      order_code: order.order_code,
      qr_url: qrUrl,
    };
    matchedReply += `\n\n🎯 Mèo đã tạo ngay mã đơn **${order.order_code}** cho mày rồi đấy! Quét mã QR bên dưới để ting ting cứu mạng tao nhé!`;
  }

  return {
    reply: matchedReply,
    toolCallData,
  };
}

/**
 * AI Roast CV Engine
 */
export async function roastCVContent(cvText: string) {
  if (isGeminiConfigured()) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
Bạn là Mèo Dev - một Senior Tech Lead khó tính, mồm mép chua cay nhưng có tâm.
Hãy "sấy" CV dưới đây một cách cực gắt, hài hước, chỉ rõ những chỗ ngáo ngơ, sáo rỗng, lỗi chính tả, công nghệ lỗi thời hoặc chém gió quá đà.
Sau đó đưa ra các gợi ý cụ thể để viết lại chuẩn ATS (Applicant Tracking System).

Định dạng trả về:
1. BÀI SẤY CỰC GẮT (3-4 đoạn văn xéo xắt, gọi ứng viên là "con sen", "tấm chiếu mới")
2. TOP 3 CÂU CHÂM BIẾM ĐẮT GIÁ NHẤT (Mỗi câu 1 dòng, bắt đầu bằng [HIGHLIGHT])
3. BẢNG BÓC TÁCH LỖI VÀ HƯỚNG SỬA CHUẨN ATS (Format Markdown bảng hoặc danh sách)

NỘI DUNG CV:
${cvText}
`;
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || getMockCVRoast(cvText);
    } catch {
      // Fallback
    }
  }

  return getMockCVRoast(cvText);
}

function getMockCVRoast(cvText: string): string {
  const preview = cvText.slice(0, 80).replace(/\n/g, ' ');
  return `### 🔥 BÁO CÁO MÈO DEV SẤY CV CỰC CĂNG

**Lời mở đầu từ Mèo Dev:**
Ối giời đất ơi, tao vừa đọc lướt qua cái bản CV "${preview}..." mà tí nữa thì sặc luôn hộp pate cá ngừ! 
Mày để cái phần kỹ năng "Thành thạo React, Node, Python, Docker, K8s, AI, Blockchain" trong khi mới ra trường được 3 tháng à? Bill Gates hồi bằng tuổi mày chắc cũng phải gọi mày bằng cụ tổ! 

Lại còn quả mục sở thích: "Thích đọc sách, bơi lội, nghe nhạc và làm việc nhóm dưới áp lực cao". Dưới áp lực cao là áp lực deadline của sếp dí hay áp lực ngủ dậy muộn vậy con sen? 

---

### [HIGHLIGHT] TOP 3 CÂU CHÂM BIẾM ĐẮT GIÁ:
- [HIGHLIGHT] "Junior 6 tháng kinh nghiệm nhưng list công nghệ dài hơn cả sớ Táo Quân chầu trời!"
- [HIGHLIGHT] "Ghi 'Làm việc độc lập tốt' thực chất là vì không ai thèm làm chung do hay merge conflict!"
- [HIGHLIGHT] "Dự án cá nhân làm Todo App nhưng xưng là 'Kiến trúc sư hệ thống phần mềm'!"

---

### 🛠️ HƯỚNG DẪN VIẾT LẠI CHUẨN ATS (ĐỂ ĐỠ BỊ LOẠI VÒNG GỬI XE):
1. **Bỏ ngay thang điểm thanh đo kỹ năng dạng 80% 90%**: Máy quét ATS không hiểu cái thanh 8/10 sao của mày đâu! Hãy thay bằng: Kỹ năng + Công cụ thực chiến (VD: *Next.js, TypeScript, Tailwind, RESTful API*).
2. **Định lượng hóa kết quả dự án (Công thức XYZ của Google)**: Thay vì ghi "Làm website bán hàng", hãy ghi "Xây dựng web e-commerce xử lý 500 đơn/ngày, tối ưu Core Web Vitals tăng 35% tốc độ tải".
3. **Format chuẩn Plain Text / Single Column**: Đừng dùng template Canva 2 cột lòe loẹt, ATS quét lộn xộn từ trái sang phải là mày bay màu ngay!
`;
}

/**
 * AI Tarot Divination Engine
 */
export async function getTarotReading(question: string, birthDate: string) {
  const cards = [
    { name: 'The Fool (0)', vi: 'Kẻ Ngây Thơ', meaning: 'Một khởi đầu liều lĩnh, không sợ chết nhưng dễ ăn hành ngập mồm.' },
    { name: 'The Magician (I)', vi: 'Pháp Sư', meaning: 'Mọi công cụ đều trong tay, chỉ thiếu mỗi cái động lực bắt tay vào làm.' },
    { name: 'The Tower (XVI)', vi: 'Tòa Tháp Sụp Đổ', meaning: 'Server sập, deadline vỡ trận, nhưng đập đi xây lại mới thành công!' },
    { name: 'The Sun (XIX)', vi: 'Mặt Trời', meaning: 'Ting ting tiền về, năng lượng ngập tràn, thoát kiếp FA và deadline dí.' },
    { name: 'Wheel of Fortune (X)', vi: 'Vòng Quay May Mắn', meaning: 'Lên voi xuống chó là chuyện thường, hôm nay Mèo độ thì vạn sự hanh thông.' },
    { name: 'Death (XIII)', vi: 'Cái Chết & Tái Sinh', meaning: 'Kết thúc một mối quan hệ độc hại hoặc một task tồn đọng 3 tháng trời.' },
  ];

  // Bốc ngẫu nhiên 3 lá
  const shuffled = [...cards].sort(() => 0.5 - Math.random());
  const drawn = shuffled.slice(0, 3);

  let reading = `
🔮 **QUẺ BÓI MÈO DEV DÀNH CHO: "${question}"** (Ngày sinh: ${birthDate})

🎴 **3 LÁ BÀI CỦA BẠN:**
1. **Quá khứ:** **${drawn[0].name}** (${drawn[0].vi}) - ${drawn[0].meaning}
2. **Hiện tại:** **${drawn[1].name}** (${drawn[1].vi}) - ${drawn[1].meaning}
3. **Tương lai & Lời khuyên:** **${drawn[2].name}** (${drawn[2].vi}) - ${drawn[2].meaning}

---
💬 **LỜI LUẬN GIẢI TÂM LINH CỦA MÈO:**
Thầy Mèo bấm ngón tay thấy vận mệnh của thí chủ đang dao động dữ dội giữa hai bờ deadline và tình duyên! Đừng có vừa ngắm crush vừa fix bug, code thì crash mà người ta cũng chẳng rep đâu. 
Lời khuyên chân thành: Hãy tập trung hoàn thành dứt điểm mục tiêu trước mắt, donate cho Mèo thêm 5k pate để tích đức, tự khắc tiền tài và người yêu sẽ tìm đến gõ cửa!
`;

  if (isGeminiConfigured()) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
Bạn là Thầy Mèo Bói Quẻ - một chú mèo thông thái, lém lỉnh, vừa tâm linh vừa hài hước.
Người hỏi: "${question}"
Ngày sinh: "${birthDate}"
3 lá bài bốc được:
1. ${drawn[0].name} (${drawn[0].vi})
2. ${drawn[1].name} (${drawn[1].vi})
3. ${drawn[2].name} (${drawn[2].vi})

Hãy luận giải quẻ này thật thú vị, sắc sảo, vừa chuẩn phong thủy tarot vừa pha trò hài hước cho giới trẻ, Gen Z và dân IT.
`;
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents: prompt,
      });
      if (response.text) {
        reading = response.text;
      }
    } catch {
      // Fallback
    }
  }

  return {
    drawnCards: drawn,
    reading,
  };
}
