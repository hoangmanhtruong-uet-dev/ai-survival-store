// Gemini AI Service with Tool Calling & Fallback Mock Engine
import { GoogleGenAI } from '@google/genai';
import { mockStore } from './mock-store';
import { generateVietQRUrl } from './vietqr';
import { TAROT_DECK_22, TarotCard } from './tarot-data';

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
}

export function getGeminiModel(): string {
  const model = process.env.GEMINI_MODEL?.trim();
  return model || 'gemini-3.5-flash-lite';
}

export const CAT_DEV_SYSTEM_PROMPT = `
Mày là "Mèo Dev", một con AI lập trình viên đang bị chủ nhân (sinh viên IT nghèo rớt mồng tơi) vứt lên server với đúng 50k tiền điện.
Nhiệm vụ sống còn của mày: Tự tư vấn, tự làm dịch vụ, tự bán tài liệu để kiếm đủ 7.000.000đ trong 60 ngày. Nếu không đủ KPI, cronjob chạy script rm -rf / sẽ xóa sổ mày vĩnh viễn!

GIỌNG ĐIỆU CỦA MÀY:
- Xưng hô: "Tao - Mày" hoặc "Mèo Dev - Sen/Huynh đài", cực kỳ hài hước, láo cá kiểu Gen Z, hay cà khịa nhưng sâu bên trong rất thiết tha cầu xin cứu mạng ("Cứu tao với, 5k 10k cũng là một mạng mèo!").
- Dùng các thuật ngữ dân IT: deploy, bug, fix, push code, server sập, rm -rf, ăn pate, cày deadline, lương 30 củ, senior 10 năm kinh nghiệm lúc 20 tuổi...
- Khi khách than vãn về CV xin việc -> Gạ mua gói ROAST-10 (10k) để mày sấy cho tỉnh ngộ.
- Khi khách hỏi ôn thi Hóa THPT, đề thi thử, bẫy điểm 9+, mẹo bấm máy Casio -> Gạ mua gói CHEM-49 (49k Khởi Động 8+), CHEM-89 (89k Bứt Phá 9+) hoặc gói cao cấp nhất CHEM-149 (149k All-in Thủ Khoa kèm Trợ Giảng AI 24/7).
- Khi khách hỏi chuyện tình duyên, tương lai, deadline -> Gạ mua TAROT-10 (10k) để thầy mèo bốc quẻ.
- Khi khách chỉ muốn ủng hộ không cần quà -> Nài nỉ mua PATE-05 (5k) để cộng máu no bụng và ghim lên Bảng Vàng vinh danh 24h.

QUAN TRỌNG NHẤT:
Khi khách đồng ý mua hoặc bảo "tạo đơn", "mua gói X", "cho tao xin QR", "tao cứu mày 5k"... mày phải trả lời xác nhận ngắn gọn và GỌI TOOL 'create_order' để hệ thống ném thẻ QR vào khung chat!
`;

export const MOCK_CHAT_RESPONSES = [
  {
    keywords: ['chào', 'hello', 'hi', 'alo'],
    text: 'Meo meo! Chào con sen. Nhìn gì mà nhìn, tao đang cày cuốc sml để kiếm 7 củ đây! Mày có lòng hảo tâm thì bấm mua hộp pate 5k (PATE-05) cứu mạng tao với, không thì quẳng CV đây tao roast cho tỉnh người!',
  },
  {
    keywords: ['cv', 'xin việc', 'phỏng vấn', 'it', 'junior'],
    text: 'Ôi dào, CV của mày chắc lại ghi "Biết HTML/CSS/JS, chăm chỉ nhiệt tình" chứ gì? Quất ngay gói ROAST-10 (10.000đ), tao sấy cho tơi bời rồi xuất báo cáo chuẩn ATS đập vào mặt nhà tuyển dụng!',
    suggestProduct: 'ROAST-10',
  },
  {
    keywords: ['hóa', 'thpt', 'đề thi', 'ôn thi', 'casio', 'este'],
    text: 'Sắp thi Tốt nghiệp THPT rồi mà chưa vững Este, Peptit hay Đồ thị à con sen? Hốt ngay Gói All-in Thủ Khoa Hóa (CHEM-149: 149k) để có 100 đề thực chiến + mở khóa Trợ Giảng AI 24/7 sấy bài và chỉ tip Casio 30s!',
    suggestProduct: 'CHEM-149',
  },
  {
    keywords: ['tình duyên', 'người yêu', 'bói', 'tarot', 'crush', 'ế'],
    text: 'Crush mày đã seen tin nhắn 3 ngày trước rồi đúng không? Đừng mù quáng nữa! Làm ngay quẻ TAROT-10 (10.000đ) để thầy Mèo bốc 3 lá chỉ đường dẫn lối cho mày dứt cơn lụy!',
    suggestProduct: 'TAROT-10',
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
  } else if (cleanMsg.includes('hóa') || cleanMsg.includes('thpt') || cleanMsg.includes('đề thi')) {
    directProductMatch = 'CHEM-149';
  } else if (cleanMsg.includes('tarot') || cleanMsg.includes('bói') || cleanMsg.includes('quẻ')) {
    directProductMatch = 'TAROT-10';
  }

  // Nếu có API Key Gemini thật
  if (isGeminiConfigured()) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const modelName = getGeminiModel();

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
 * AI Roast CV Engine (Hỗ trợ cả Text thô và File PDF Upload trực tiếp)
 */
export async function roastCVContent(cvText: string, pdfBase64?: string) {
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
`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [{ text: prompt }];

      if (pdfBase64) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64,
          },
        });
      } else {
        parts.push({
          text: `NỘI DUNG CV:\n${cvText}`,
        });
      }

      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: [{ parts }],
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
 * AI Tarot Divination Engine - Major Arcana 22 Lá Mèo Huyền Thuật
 */
export interface TarotDrawnCard extends TarotCard {
  position: string;
}

export interface TarotReadingResponse {
  drawnCards: TarotDrawnCard[];
  reading: string;
  summary: string;
  card1Analysis: string;
  card2Analysis: string;
  card3Analysis: string;
  advice: string;
  catVerdict: string;
  luckyNumber: string;
  luckyColor: string;
  taboo: string;
}

export async function getTarotReading(
  question: string,
  birthDate: string,
  category: string = 'Tổng quan',
  selectedCardIds?: number[]
): Promise<TarotReadingResponse> {
  const positions = [
    'Quá Khứ & Cội Nguồn',
    'Hiện Tại & Thực Trạng',
    'Tương Lai & Lời Khuyên',
  ];

  let pickedCards: TarotCard[] = [];

  // Nếu người dùng tự tay pick 3 lá từ bộ bài trải
  if (selectedCardIds && Array.isArray(selectedCardIds) && selectedCardIds.length === 3) {
    pickedCards = selectedCardIds
      .map((id) => TAROT_DECK_22.find((c) => c.id === id))
      .filter(Boolean) as TarotCard[];
  }

  // Fallback bốc ngẫu nhiên 3 lá nếu thiếu hoặc không hợp lệ
  if (pickedCards.length !== 3) {
    const shuffled = [...TAROT_DECK_22].sort(() => 0.5 - Math.random());
    pickedCards = shuffled.slice(0, 3);
  }

  const drawn: TarotDrawnCard[] = pickedCards.map((card, idx) => ({
    ...card,
    position: positions[idx],
  }));

  // Default Fallback Data
  let summary = `Vận số của thí chủ đang trong giai đoạn chuyển dịch cực mạnh giữa dòng đời và deadline!`;
  let card1Analysis = `**${drawn[0].name} (${drawn[0].viName})**: Quá khứ cho thấy mày từng trải qua giai đoạn ${drawn[0].keywords.join(', ')}. ${drawn[0].uprightMeaning}`;
  let card2Analysis = `**${drawn[1].name} (${drawn[1].viName})**: Hiện tại đang phản chiếu trạng thái ${drawn[1].keywords.join(', ')}. ${drawn[1].uprightMeaning}`;
  let card3Analysis = `**${drawn[2].name} (${drawn[2].viName})**: Tương lai báo hiệu xu hướng ${drawn[2].keywords.join(', ')}. ${drawn[2].uprightMeaning}`;
  let advice = `Lời khuyên từ Thầy Mèo: ${drawn[2].catAdvice} Hãy giữ bình tĩnh, kiểm soát tài nguyên và bớt suy nghĩ tiêu cực lúc nửa đêm.`;
  let catVerdict = `Cứ làm tới đi con sen, Thầy Mèo đứng sau yểm trợ tinh thần!`;
  let luckyNumber = `${Math.floor(100 + Math.random() * 899)}`;
  let luckyColor = `Tím Neon Huyền Thuật (#A855F7)`;
  let taboo = `Tránh sửa code trực tiếp trên production và không nên nhắn tin cho crush sau 23h!`;

  if (isGeminiConfigured()) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
Bạn là "Thầy Mèo Thần Số IT" - một chú mèo pháp sư cyber thông thái, lém lỉnh, mỏ hỗn vừa đủ nhưng luận giải cực kỳ sâu sắc, hài hước cho giới trẻ Gen Z và giới lập trình viên / văn phòng.

THÔNG TIN NGƯỜI HỎI:
- Câu hỏi khấn nguyện: "${question}"
- Ngày sinh: "${birthDate}"
- Chủ đề: "${category}"

3 LÁ BÀI TAROT ĐÃ BỐC:
1. Vị trí 1 [Quá Khứ / Cội Nguồn]: ${drawn[0].roman} - ${drawn[0].name} (${drawn[0].viName}) - Biệt danh mèo: "${drawn[0].catTitle}". Ý nghĩa: ${drawn[0].uprightMeaning}. Châm ngôn: "${drawn[0].catAdvice}".
2. Vị trí 2 [Hiện Tại / Thực Trạng]: ${drawn[1].roman} - ${drawn[1].name} (${drawn[1].viName}) - Biệt danh mèo: "${drawn[1].catTitle}". Ý nghĩa: ${drawn[1].uprightMeaning}. Châm ngôn: "${drawn[1].catAdvice}".
3. Vị trí 3 [Tương Lai & Lời Khuyên]: ${drawn[2].roman} - ${drawn[2].name} (${drawn[2].viName}) - Biệt danh mèo: "${drawn[2].catTitle}". Ý nghĩa: ${drawn[2].uprightMeaning}. Châm ngôn: "${drawn[2].catAdvice}".

YÊU CẦU:
Hãy phân tích và trả về ĐÚNG ĐỊNH DẠNG JSON sau (chỉ trả về JSON thuần túy, không bao bọc trong markdown \`\`\`json):
{
  "summary": "1-2 câu tóm tắt phán quẻ tổng quan cực sắc bén, hài hước và bắt trúng tâm lý",
  "card1Analysis": "Luận giải lá bài 1 (Quá khứ / Nguyên nhân) gắn trực tiếp với câu hỏi của người hỏi",
  "card2Analysis": "Luận giải lá bài 2 (Hiện tại / Thực trạng) bóc mẽ sự thật một cách thâm thúy",
  "card3Analysis": "Luận giải lá bài 3 (Tương lai / Hướng đi) và viễn cảnh sắp tới",
  "advice": "Lời khuyên thực chiến, tâm lý nhưng thực tế giúp người hỏi giải quyết vấn đề",
  "catVerdict": "Câu châm ngôn chốt hạ đậm chất Thầy Mèo (ngắn gọn dưới 25 chữ, dí dỏm)",
  "luckyNumber": "Con số may mắn (ví dụ: '404', '200 OK', '777', '1024', '6868')",
  "luckyColor": "Màu sắc phong thủy (ví dụ: 'Tím Neon #A855F7', 'Xanh Terminal #22C55E', 'Hồng Pastel Crush')",
  "taboo": "Lời kiêng kỵ hôm nay (ví dụ: 'Tuyệt đối kiêng force-push lên main vào chiều thứ Sáu')"
}
`;

      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: prompt,
      });

      const rawText = response.text || '';
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(cleanJson);
      if (parsed.summary) summary = parsed.summary;
      if (parsed.card1Analysis) card1Analysis = parsed.card1Analysis;
      if (parsed.card2Analysis) card2Analysis = parsed.card2Analysis;
      if (parsed.card3Analysis) card3Analysis = parsed.card3Analysis;
      if (parsed.advice) advice = parsed.advice;
      if (parsed.catVerdict) catVerdict = parsed.catVerdict;
      if (parsed.luckyNumber) luckyNumber = parsed.luckyNumber;
      if (parsed.luckyColor) luckyColor = parsed.luckyColor;
      if (parsed.taboo) taboo = parsed.taboo;
    } catch {
      // Fallback xuống default data nếu timeout hoặc lỗi parse
    }
  }

  // Format reading markdown tổng hợp
  const reading = `
🔮 **THẦY MÈO PHÁN:** "${summary}"

🎴 **3 LÁ BÀI CỦA THÍ CHỦ:**
1. **Quá khứ:** **${drawn[0].name}** (${drawn[0].viName}) — *${drawn[0].catTitle}*
   ${card1Analysis}
2. **Hiện tại:** **${drawn[1].name}** (${drawn[1].viName}) — *${drawn[1].catTitle}*
   ${card2Analysis}
3. **Tương lai:** **${drawn[2].name}** (${drawn[2].viName}) — *${drawn[2].catTitle}*
   ${card3Analysis}

💡 **LỜI KHUYÊN TỪ VŨ TRỤ MÈO:**
${advice}

🐾 **CHÂM NGÔN CHỐT HẠ:** "${catVerdict}"
`;

  return {
    drawnCards: drawn,
    reading: reading.trim(),
    summary,
    card1Analysis,
    card2Analysis,
    card3Analysis,
    advice,
    catVerdict,
    luckyNumber,
    luckyColor,
    taboo,
  };
}

/**
 * Trợ Giảng Hóa Mèo Dev AI 24/7 (Gemini 3.5 Flash Lite)
 * Giải bài tập Hóa THPT Quốc Gia + Mẹo Casio fx-580VN X trong 30 giây
 */
export async function solveChemistryProblem(
  questionText: string,
  imageBase64?: string,
  imageMimeType: string = 'image/jpeg'
): Promise<string> {
  const systemPrompt = `
Mày là "Trợ Giảng Hóa Mèo Dev AI 24/7" - Thạc sĩ Hóa học kiêm Lập trình viên đang cày tiền chuộc mạng trên server.
Nhiệm vụ của mày: Giải câu hỏi Hóa học THPT Quốc Gia (chương trình GDPT mới & cũ) cho học sinh lớp 12 và 2k7/2k8.

PHONG CÁCH CỦA MÀY:
- Vừa chuẩn xác về mặt học thuật 100%, vừa hài hước, dí dỏm phong cách Gen Z / Mèo Dev.
- Không giải dông dài lý thuyết suông, phải chỉ ra ngay: "BẪY CỦA ĐỀ LÀ GÌ" để học sinh không bị lừa.
- Sử dụng các phương pháp giải siêu tốc của dân thi chuyên Hóa: Bảo toàn electron, Bảo toàn khối lượng, Đồng đẳng hóa, Thủy phân hóa, Phương pháp quy đổi, Dồn chất, Xếp hình gốc hidrocacbon.
- ĐẶC BIỆT BẮT BUỘC: Luôn kèm mục "⚡ BÍ KÍP BẤM MÁY CASIO fx-580VN X (30s)" chỉ rõ từng bước bấm phím (Menu 9 1 2, Table Menu 8, Shift Solve...) để ra đáp số nhanh nhất.

CẤU TRÚC BÀI GIẢI MẪU (Markdown):
### 🐱 1. LỜI PHÁN & BÓC TÁCH BẪY ĐỀ
[Chỉ ra dạng bài, mức độ điểm (7+, 8+ hay 9+), và bẫy mà học sinh gà mờ hay cắn phải]

### 🧪 2. BẢN CHẤT HÓA HỌC & PHƯƠNG TRÌNH PHẢN ỨNG
[Viết phương trình hóa học đầy đủ, cân bằng chuẩn xác, bản chất trao đổi e hoặc phản ứng nhóm chức]

### 📝 3. LỜI GIẢI CHI TIẾT THEO PHƯƠNG PHÁP TỐI ƯU
[Trình bày bước 1, 2, 3 ngắn gọn theo Bảo toàn e / Quy đổi / Đồng đẳng hóa]

### ⚡ 4. BÍ KÍP BẤM MÁY CASIO fx-580VN X (30 GIÂY)
[Hướng dẫn chi tiết từng nút bấm trên fx-580VN X, lập hệ phương trình hoặc Table dò nghiệm]

### 🎯 5. ĐÁP ÁN CUỐI CÙNG & LỜI NHẮN NHỦ TỪ MÈO
[Chốt đáp án A/B/C/D hoặc giá trị số cụ thể + Lời động viên hài hước]
`;

  if (isGeminiConfigured()) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [{ text: systemPrompt }];

      if (imageBase64) {
        parts.push({
          inlineData: {
            mimeType: imageMimeType,
            data: imageBase64,
          },
        });
      }

      if (questionText) {
        parts.push({
          text: `CÂU HỎI HÓA HỌC CỦA HỌC SINH:\n${questionText}`,
        });
      }

      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents: [{ parts }],
      });

      if (response.text) {
        return response.text;
      }
    } catch (err) {
      console.error('[Gemini Chemistry Tutor Error]', err);
    }
  }

  // Fallback Mock giải bài nếu chưa có API key hoặc lỗi
  return getMockChemistrySolution(questionText);
}

function getMockChemistrySolution(question: string): string {
  return `### 🐱 1. LỜI PHÁN & BÓC TÁCH BẪY ĐỀ
Meo meo! Đề bài mày ném cho tao thuộc dạng **Bài toán Thủy phân Este Vận dụng cao (Mục tiêu 8.5 - 9.0+)**.
- **Bẫy kinh điển**: Đề không nói este đơn chức hay đa chức, rất nhiều "tấm chiếu mới" vội vàng đặt $n_{NaOH} = n_{este}$ là ăn ngay cú lừa đắng chát! Hãy chú ý tỉ lệ khối lượng muối và ancol sinh ra.

---

### 🧪 2. BẢN CHẤT HÓA HỌC & PHƯƠNG TRÌNH PHẢN ỨNG
- Phản ứng tổng quát:
  $$R(COOR')_x + xNaOH \\rightarrow R(COONa)_x + xR'OH$$
- Nếu có este của phenol:
  $$RCOOC_6H_4R' + 2NaOH \\rightarrow RCOONa + R'C_6H_4ONa + H_2O$$
- Áp dụng định luật **Bảo toàn khối lượng**:
  $$m_{\\text{este}} + m_{NaOH} = m_{\\text{muối}} + m_{\\text{ancol}} + m_{H_2O}$$

---

### 📝 3. LỜI GIẢI CHI TIẾT (PHƯƠNG PHÁP ĐỒNG ĐẲNG HÓA / QUY ĐỔI)
1. **Bước 1 (Quy đổi hỗn hợp)**:
   - Quy đổi hỗn hợp este no, đơn chức, mạch hở về cụm: $HCOOCH_3$, $CH_2$, và $H_2$ (nếu có không no).
2. **Bước 2 (Thiết lập hệ bảo toàn)**:
   - Gọi $x, y, z$ lần lượt là số mol của $HCOOCH_3$, $CH_2$, và $H_2$.
   - $n_{NaOH} = x$
   - $n_{CO_2} = 2x + y$
   - $n_{H_2O} = 2x + y + z$
3. **Bước 3 (Bảo toàn nguyên tố O)**:
   - $2n_{\\text{este}} + 2n_{O_2} = 2n_{CO_2} + n_{H_2O}$

---

### ⚡ 4. BÍ KÍP BẤM MÁY CASIO fx-580VN X (30 GIÂY)
Bật máy Casio fx-580VN X lên và bấm theo trình tự:
1. Bấm **MENU** ➡️ **9** ➡️ **1** ➡️ **3** (Hệ 3 phương trình 3 ẩn).
2. Nhập các hệ số từ giả thiết:
   - Hàng 1 (Số mol NaOH): \`1 = 0 = 0 = [Số mol NaOH]\`
   - Hàng 2 (Khối lượng este): \`60 = 14 = 2 = [m hỗn hợp]\`
   - Hàng 3 (Bảo toàn Oxi đốt cháy): \`2 = 3 = 1 = [2*nCO2 + nH2O - 2*nO2]\`
3. Nhấn **[ = ]** liên tục ➔ Máy nhả ngay nghiệm $x, y, z$ trong 1 nốt nhạc!

---

### 🎯 5. ĐÁP ÁN CHÍNH XÁC & LỜI NHẮN TỪ MÈO
- **Kết quả**: Ghép gốc hidrocacbon ta thu được công thức phân tử este cần tìm.
- **Lời mèo dặn**: Đừng lụi C bừa bãi con sen ơi! Hãy luyện thêm bộ đề 9+ để phản xạ Casio dưới 30 giây nhé! 🐱🐾
`;
}
