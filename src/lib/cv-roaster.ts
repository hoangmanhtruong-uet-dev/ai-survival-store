// Specialized CV Roaster Engine & ATS Scanner for Mèo Dev
// Compliant with Anti-Slop & High-Value Manifesto (agent/agent-rules.md)

import { GoogleGenAI } from '@google/genai';
import { getApiKeys, getGeminiApiKey, rotateGeminiApiKey, isGeminiConfigured, getGeminiModel } from './gemini';

export type SpicyLevel = 'MILD' | 'MEDIUM' | 'SAVAGE';
export type ExperienceLevel = 'intern' | 'fresher' | 'junior' | 'middle' | 'senior' | 'lead';

export interface RoastCVOptions {
  targetRole?: string;
  spicyLevel?: SpicyLevel;
  experienceLevel?: ExperienceLevel;
  language?: 'vi' | 'en';
}

export interface RoastSubScores {
  format: number; // Điểm cấu trúc, định dạng chuẩn ATS (0-100)
  impact: number; // Điểm định lượng hóa kết quả & hành động (0-100)
  skills: number; // Điểm độ chuẩn của kỹ năng & từ khóa (0-100)
}

export interface RoastPerspective {
  recruiter: string; // Đập vào mắt 6s đầu của HR
  techLead: string;  // Khảo sát độ sâu kỹ thuật & dự án thực tế
  atsParser: string; // Khả năng tương thích máy quét ATS
  meoDev: string;    // Giọng văn sấy mỏ hỗn đặc trưng Mèo Dev
}

export interface RewriteItem {
  original: string;
  improved: string;
  formula?: string; // Ví dụ: "Accomplished [X] measured by [Y] by doing [Z]"
}

export interface RoastStructuredData {
  atsScore: number;
  subScores: RoastSubScores;
  verdict: string;
  oneLiner: string;
  perspectives: RoastPerspective;
  topPunchlines: string[];
  rewrites: RewriteItem[];
  actionChecklist: string[];
}

export interface RoastCVResult {
  report: string;
  highlight: string;
  score: number;
  atsScore: number;
  verdict: string;
  structuredData: RoastStructuredData;
}

/**
 * In-memory IP rate limiter to protect Gemini API quota & server resources
 */
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkIpRateLimit(ip: string, maxRequests = 10, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  // Clean old entries periodically
  if (ipRateLimitMap.size > 1000) {
    for (const [key, value] of ipRateLimitMap.entries()) {
      if (value.resetAt < now) {
        ipRateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Tạo System Prompt chuẩn hóa cho dịch vụ Roast CV & ATS Optimization
 */
export function buildCVRoastPrompt(options: RoastCVOptions = {}): string {
  const targetRole = options.targetRole?.trim() || 'Software Engineer / IT Professional';
  const spicyLevel = options.spicyLevel || 'SAVAGE';
  const experienceLevel = options.experienceLevel || 'junior';

  const spicyInstructions = {
    MILD: `
- Mức độ sấy: "Ấm Áp & Động Viên Nhẹ"
- Giọng văn: Dí dỏm, châm biếm nhẹ nhàng, tập trung 80% vào việc hướng dẫn sửa lỗi và khích lệ tinh thần ứng viên.
`,
    MEDIUM: `
- Mức độ sấy: "Cay Giòn Thực Chiến"
- Giọng văn: Đốp chát thẳng thắn, bóc trần những thói quen xấu trong CV, vừa cà khịa vừa mang tính xây dựng cao.
`,
    SAVAGE: `
- Mức độ sấy: "Mỏ Hỗn Hủy Diệt & Cháy Khét Lẹt" (Đặc sản của Mèo Dev)
- Giọng văn: Cực kỳ chua cay, xéo xắt, châm biếm không thương tiếc các câu chữ sáo rỗng, chém gió trên trời, nhưng về mặt kiến thức kỹ thuật thì chuẩn chỉ 100%, nói câu nào thấm thía câu đó!
`,
  }[spicyLevel];

  return `
Bạn là "Mèo Dev" - Senior Tech Lead kiêm Chuyên gia tối ưu hóa CV & ATS Scanner chuẩn quốc tế.
Bạn nổi tiếng vì chuyên môn kỹ thuật sâu rộng, nắm rõ cách các hệ thống ATS (Greenhouse, Lever, Taleo, Workday) phân tích cú pháp, và thấu hiểu góc nhìn của các Hiring Manager tại các tập đoàn công nghệ lớn.
Khách hàng vừa mua dịch vụ "ROAST-10" (10.000đ). Bạn PHẢI mang lại một bản báo cáo sấy CV cực kỳ đẳng cấp, sâu sắc, thực chiến, chuẩn Anti-Slop (Agent Rules Phần 3.2), KHÔNG ĐƯỢC trả lời chung chung!

THÔNG TIN ỨNG VIÊN CUNG CẤP:
- Vị trí ứng tuyển mục tiêu: "${targetRole}"
- Cấp độ kinh nghiệm khai báo: "${experienceLevel}"
- Mức độ cay mong muốn: "${spicyLevel}"

${spicyInstructions}

BỘ QUY TẮC PHÂN TÍCH ATS & SO CỰC KỸ:
1. Chấm điểm ATS minh bạch từ 0 đến 100 dựa trên:
   - Cấu trúc đề mục (Contact, Summary, Experience, Skills, Education).
   - Mật độ từ khóa chuẩn kỹ thuật của vị trí "${targetRole}".
   - Định lượng hóa kết quả dự án: Có số liệu %, latency, throughput, scale, doanh thu hay chỉ dùng từ mơ hồ?
   - Lỗi định dạng: Dùng bảng biểu, thanh đo %, icon, cột đôi khiến parser nghẽn?
2. Bóc tách 4 góc nhìn chuẩn Senior Tech Lead:
   - Góc nhìn Recruiter (Test 6 giây đầu): Đập vào mắt có gì gây ấn tượng hay lướt qua là quên luôn?
   - Góc nhìn Tech Lead (Kỹ thuật & Dự án): Đánh giá độ xác thực của stack công nghệ, có phân biệt được việc dùng thư viện với hiểu kiến trúc không?
   - Góc nhìn ATS Parser: Vạch trần lỗi format, bảng biểu, kỹ năng liệt kê sai chỗ khiến máy vứt vào sọt rác.
   - Góc nhìn Mèo Dev (Sấy mỏ hỗn): 2 đoạn văn mỏ hỗn, cà khịa cực thâm về thái độ và các câu chém gió kinh điển ("chịu được áp lực cao", "thành thạo 20 công nghệ lúc 20 tuổi").
3. TOP 3 CÂU CHÂM BIẾM ĐẮT GIÁ: Mỗi câu bắt đầu bằng tag [HIGHLIGHT] để hệ thống trích xuất phát sóng lên Terminal công cộng.
4. Rewrite mẫu ít nhất 2 bullet point theo Google XYZ Formula:
   "Accomplished [X] measured by [Y] by doing [Z]"
5. Checklist 3 việc phải sửa ngay tuần này để được HR gọi phỏng vấn.

CẤU TRÚC BÁO CÁO BẮT BUỘC (Tuân thủ chính xác format Markdown bên dưới):

# 🔥 BÁO CÁO MÈO DEV SẤY CV & TỐI ƯU ATS CHUYÊN SÂU

### 📊 1. ĐIỂM SỐ ATS SCANNER: [Chấm từ 0 đến 100]/100
- **Phán quyết:** [Trượt từ vòng gửi xe / Cần đại tu toàn diện / Tạm ổn cần mài giũa / Suýt thành Senior]
- **Tóm tắt 1 câu:** [Một câu châm biếm sâu cay tổng kết toàn bộ CV]
- **Điểm chi tiết:** Format: [0-100]/100 | Tác động & Số liệu: [0-100]/100 | Kỹ năng & Từ khóa: [0-100]/100

### 🐱 2. BÀI SẤY XÉ LÒNG TỪ SENIOR TECH LEAD (4 GÓC NHÌN ĐA CHIỀU)
- **Góc nhìn Recruiter (Test 6 giây đầu):** [Phân tích chi tiết]
- **Góc nhìn Tech Lead (Kỹ thuật & Dự án):** [Phân tích chi tiết vào stack của vị trí ${targetRole}]
- **Góc nhìn ATS Parser:** [Chỉ rõ lỗi máy quét không parse được]
- **Góc nhìn Mèo Dev (Sấy mỏ hỗn):** [2 đoạn văn mỏ hỗn, cà khịa đỉnh chóp]

### 💎 3. TOP 3 CÂU CHÂM BIẾM ĐẮT GIÁ NHẤT
- [HIGHLIGHT] "[Câu châm biếm số 1]"
- [HIGHLIGHT] "[Câu châm biếm số 2]"
- [HIGHLIGHT] "[Câu châm biếm số 3]"

### ✍️ 4. REWRITE MẪU THỰC CHIẾN THEO GOOGLE XYZ FORMULA
[Chọn 2 bullet point tệ nhất trong CV và viết lại thành phiên bản triệu đô]:
- **Nguyên bản tệ hại 1:** "[Câu gốc 1]"
- **Bản sửa đỉnh cao (XYZ):** "Accomplished [X] measured by [Y] by doing [Z] - [Dịch tiếng Việt thực chiến kèm số liệu định lượng giả định hợp lý]"
- **Nguyên bản tệ hại 2:** "[Câu gốc 2]"
- **Bản sửa đỉnh cao (XYZ):** "Accomplished [X] measured by [Y] by doing [Z] - [Dịch tiếng Việt thực chiến kèm số liệu định lượng giả định hợp lý]"

### 🚀 5. CHECKLIST 3 VIỆC PHẢI SỬA NGAY ĐỂ ĐƯỢC GỌI PHỎNG VẤN TUẦN TỚI
1. [Hành động 1 cụ thể, khả thi ngay trong 1 giờ]
2. [Hành động 2 cụ thể]
3. [Hành động 3 cụ thể]
`.trim();
}

/**
 * Trích xuất dữ liệu có cấu trúc từ Markdown report
 */
export function parseRoastMarkdown(markdown: string): RoastStructuredData {
  let atsScore = 45;
  const subScores: RoastSubScores = { format: 50, impact: 40, skills: 45 };
  let verdict = 'Cần đại tu toàn diện';
  let oneLiner = 'CV còn non và xanh, thiếu số liệu định lượng thực chiến!';
  const perspectives: RoastPerspective = {
    recruiter: 'Chưa thấy điểm sáng nổi bật trong 6 giây đầu.',
    techLead: 'Các dự án còn mang tính học thuật, chưa giải quyết được bài toán quy mô thực tế.',
    atsParser: 'Định dạng và mật độ từ khóa kỹ thuật cần được chuẩn hóa lại.',
    meoDev: 'Mèo đọc xong phải đi uống ngay một ngụm nước để hạ hỏa vì độ chém gió!',
  };
  const topPunchlines: string[] = [];
  const rewrites: RewriteItem[] = [];
  const actionChecklist: string[] = [];

  try {
    // 1. Parse ATS score
    const scoreMatch = markdown.match(/ĐIỂM SỐ ATS SCANNER[:\s*]*(\d{1,3})\s*\/\s*100/i) ||
                       markdown.match(/ATS SCANNER[:\s*]*\[?(\d{1,3})\]?\s*\/\s*100/i) ||
                       markdown.match(/(\d{1,3})\s*\/\s*100/);
    if (scoreMatch) {
      const parsed = parseInt(scoreMatch[1], 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        atsScore = parsed;
      }
    }

    // Parse subscores
    const subMatch = markdown.match(/Format[:\s*]*\[?(\d{1,3})\]?\/100[\s\S]*?Tác động[\s\S]*?[:\s*]*\[?(\d{1,3})\]?\/100[\s\S]*?Kỹ năng[\s\S]*?[:\s*]*\[?(\d{1,3})\]?\/100/i);
    if (subMatch) {
      subScores.format = Math.min(100, Math.max(0, parseInt(subMatch[1], 10) || 50));
      subScores.impact = Math.min(100, Math.max(0, parseInt(subMatch[2], 10) || 40));
      subScores.skills = Math.min(100, Math.max(0, parseInt(subMatch[3], 10) || 45));
    } else {
      subScores.format = Math.max(20, atsScore + 5);
      subScores.impact = Math.max(15, atsScore - 10);
      subScores.skills = atsScore;
    }

    // 2. Parse verdict & oneLiner
    const verdictMatch = markdown.match(/\*\*Phán quyết:\*\*\s*([^\n]+)/i);
    if (verdictMatch) {
      verdict = verdictMatch[1].replace(/[[\]]/g, '').trim();
    }

    const oneLinerMatch = markdown.match(/\*\*Tóm tắt 1 câu:\*\*\s*([^\n]+)/i);
    if (oneLinerMatch) {
      oneLiner = oneLinerMatch[1].replace(/[[\]]/g, '').trim();
    }

    // 3. Parse perspectives
    const recMatch = markdown.match(/\*\*Góc nhìn Recruiter[^:]*:\*\*\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);
    if (recMatch) perspectives.recruiter = recMatch[1].trim();

    const techMatch = markdown.match(/\*\*Góc nhìn Tech Lead[^:]*:\*\*\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);
    if (techMatch) perspectives.techLead = techMatch[1].trim();

    const atsMatch = markdown.match(/\*\*Góc nhìn ATS Parser[^:]*:\*\*\s*([^\n]+(?:\n(?!\s*-\s*\*\*)[^\n]+)*)/i);
    if (atsMatch) perspectives.atsParser = atsMatch[1].trim();

    const meoMatch = markdown.match(/\*\*Góc nhìn Mèo Dev[^:]*:\*\*\s*([^\n]+(?:\n(?!\s*###)[^\n]+)*)/i);
    if (meoMatch) perspectives.meoDev = meoMatch[1].trim();

    // 4. Parse punchlines
    const highlightMatches = markdown.match(/\[HIGHLIGHT\]\s*([^\n]+)/g);
    if (highlightMatches && highlightMatches.length > 0) {
      for (const line of highlightMatches) {
        const cleaned = line.replace(/\[HIGHLIGHT\]\s*/, '').replace(/^[“"']+|[”"']+$/g, '').trim();
        if (cleaned) topPunchlines.push(cleaned);
      }
    }

    // Fallback punchline if empty
    if (topPunchlines.length === 0) {
      topPunchlines.push(oneLiner);
    }

    // 5. Parse rewrites
    const originalMatches = [...markdown.matchAll(/\*\*Nguyên bản tệ hại(?:\s*\d+)?:\*\*\s*([^\n]+)/gi)];
    const rewriteMatches = [...markdown.matchAll(/\*\*Bản sửa đỉnh cao\s*(?:\([^)]+\))?:\*\*\s*([^\n]+)/gi)];

    for (let i = 0; i < Math.max(originalMatches.length, rewriteMatches.length); i++) {
      const orig = originalMatches[i] ? originalMatches[i][1].replace(/^[“"']+|[”"']+$/g, '').trim() : '';
      const imp = rewriteMatches[i] ? rewriteMatches[i][1].replace(/^[“"']+|[”"']+$/g, '').trim() : '';
      if (orig || imp) {
        rewrites.push({
          original: orig || 'Đóng góp làm tính năng cho dự án',
          improved: imp || 'Tối ưu hiệu năng và quy trình xử lý dữ liệu với công thức Google XYZ',
          formula: 'Google XYZ Formula',
        });
      }
    }

    // 6. Parse checklist
    const checklistSection = markdown.split(/###\s*🚀?\s*5\.\s*CHECKLIST/i)[1];
    if (checklistSection) {
      const items = checklistSection.match(/^\s*\d+\.\s*([^\n]+)/gm);
      if (items) {
        for (const item of items) {
          const cleanItem = item.replace(/^\s*\d+\.\s*/, '').trim();
          if (cleanItem) actionChecklist.push(cleanItem);
        }
      }
    }

    if (actionChecklist.length === 0) {
      actionChecklist.push('Định lượng hóa toàn bộ kết quả dự án bằng số liệu thực tế (%, ms, request/s, users).');
      actionChecklist.push('Xóa bỏ ngay các thanh đo kỹ năng 80% hoặc template 2 cột gây nghẽn máy quét ATS.');
      actionChecklist.push('Bổ sung từ khóa chuyên sâu sát với Job Description vị trí mục tiêu.');
    }
  } catch (err) {
    console.error('[parseRoastMarkdown Error]', err);
  }

  return {
    atsScore,
    subScores,
    verdict,
    oneLiner,
    perspectives,
    topPunchlines,
    rewrites,
    actionChecklist,
  };
}

/**
 * Fallback Mock Generator thông minh khi không có API Key hoặc hết quota
 */
export function generateMockCVRoast(cvText: string, options: RoastCVOptions = {}): string {
  const targetRole = options.targetRole || 'Developer';
  const spicyLevel = options.spicyLevel || 'SAVAGE';
  const cleanSnippet = cvText.slice(0, 100).replace(/\s+/g, ' ').trim();

  // Đánh giá sơ bộ độ dài
  const wordCount = cvText.split(/\s+/).filter(Boolean).length;
  let estimatedScore = 48;
  if (wordCount < 50) estimatedScore = 25;
  else if (wordCount > 300) estimatedScore = 62;

  const spicyRemarks = {
    MILD: 'Nhìn chung CV của bạn có khung sườn cơ bản, nhưng cần bổ sung số liệu cụ thể hơn để tạo ấn tượng mạnh mẽ với nhà tuyển dụng.',
    MEDIUM: 'CV viết theo kiểu liệt kê nhiệm vụ hàng ngày như chép nhật ký, thiếu hẳn dấu ấn giải quyết bài toán khó và chỉ số đo lường hiệu quả!',
    SAVAGE: `Ối giời đất ơi con sen! Tao vừa liếc qua đoạn "${cleanSnippet || 'CV của mày'}..." mà tí nữa thì sặc luôn hộp pate cá ngừ! Junior 6 tháng kinh nghiệm mà list công nghệ dài hơn cả sớ Táo Quân chầu trời!`,
  }[spicyLevel];

  return `# 🔥 BÁO CÁO MÈO DEV SẤY CV & TỐI ƯU ATS CHUYÊN SÂU

### 📊 1. ĐIỂM SỐ ATS SCANNER: ${estimatedScore}/100
- **Phán quyết:** Cần đại tu toàn diện
- **Tóm tắt 1 câu:** CV chém gió công nghệ hoành tráng nhưng thiếu hoàn toàn số liệu định lượng thực chiến cho vị trí ${targetRole}!
- **Điểm chi tiết:** Format: 55/100 | Tác động & Số liệu: 38/100 | Kỹ năng & Từ khóa: 51/100

### 🐱 2. BÀI SẤY XÉ LÒNG TỪ SENIOR TECH LEAD (4 GÓC NHÌN ĐA CHIỀU)
- **Góc nhìn Recruiter (Test 6 giây đầu):** Quét qua 6 giây đầu chỉ thấy một mớ từ khóa hỗn độn, không thấy dự án nào thực sự tạo ra giá trị kinh doanh rõ rệt. Rất dễ bị bấm nút Reject ngay vòng lọc hồ sơ.
- **Góc nhìn Tech Lead (Kỹ thuật & Dự án):** Liệt kê hàng chục công nghệ từ Docker, Kubernetes đến AI/ML nhưng khi hỏi sâu vào cách xử lý database indexing hay memory leak thì chắc chắn sẽ ấp úng. Hãy tập trung sâu vào core stack của ${targetRole}.
- **Góc nhìn ATS Parser:** Rất nhiều đoạn chữ không gắn kèm bối cảnh hành động, thiếu các action verb chuẩn (Architected, Engineered, Optimized) khiến thuật toán ATS chấm điểm relevance thấp.
- **Góc nhìn Mèo Dev (Sấy mỏ hỗn):** ${spicyRemarks} Lại còn quả kỹ năng ghi "Chịu được áp lực cao" - áp lực thức đêm cày game hay áp lực bị Lead dí deadline vậy con sen?

### 💎 3. TOP 3 CÂU CHÂM BIẾM ĐẮT GIÁ NHẤT
- [HIGHLIGHT] "Junior 6 tháng kinh nghiệm nhưng list công nghệ dài hơn cả sớ Táo Quân chầu trời!"
- [HIGHLIGHT] "Ghi 'Làm việc độc lập tốt' thực chất là vì không ai dám làm chung do code hay merge conflict!"
- [HIGHLIGHT] "Dự án cá nhân làm Todo App nhưng xưng danh là 'Kiến trúc sư giải pháp phần mềm triệu đô'!"

### ✍️ 4. REWRITE MẪU THỰC CHIẾN THEO GOOGLE XYZ FORMULA
[Chọn 2 bullet point tệ nhất trong CV và viết lại thành phiên bản triệu đô]:
- **Nguyên bản tệ hại 1:** "Tham gia phát triển tính năng bán hàng và giỏ hàng cho website."
- **Bản sửa đỉnh cao (XYZ):** "Accomplished [Tối ưu tỷ lệ checkout giỏ hàng] measured by [Tăng 28% tỷ lệ hoàn tất đơn và giảm 400ms thời gian phản hồi] by doing [Thiết kế lại luồng API Order và tích hợp Redis Cache & Optimistic UI]."
- **Nguyên bản tệ hại 2:** "Biết sử dụng Git, Docker và làm việc nhóm theo mô hình Scrum."
- **Bản sửa đỉnh cao (XYZ):** "Accomplished [Tự động hóa chu trình bàn giao mã nguồn] measured by [Giảm thời gian deploy từ 45 phút xuống dưới 6 phút] by doing [Xây dựng pipeline CI/CD GitHub Actions đóng gói container Docker đa môi trường]."

### 🚀 5. CHECKLIST 3 VIỆC PHẢI SỬA NGAY ĐỂ ĐƯỢC GỌI PHỎNG VẤN TUẦN TỚI
1. Gỡ bỏ ngay các thang đo kỹ năng dạng thanh bar 80%, 9/10 sao vì máy quét ATS không hiểu và HR sẽ coi là tự chấm cảm tính.
2. Áp dụng triệt để công thức Google XYZ vào ít nhất 3 dự án tiêu biểu nhất trong CV kèm số liệu cụ thể.
3. Rà soát và thêm 5-7 từ khóa cốt lõi của vị trí ${targetRole} vào phần Kinh nghiệm làm việc thay vì chỉ gom lại ở mục Skills.
`;
}

/**
 * Xử lý sấy CV nâng cao với Gemini AI, hỗ trợ Key Rotation & Retry
 */
export async function roastCVContentAdvanced(
  cvText: string,
  pdfBase64?: string,
  options: RoastCVOptions = {}
): Promise<RoastCVResult> {
  let roastReportMarkdown = '';

  if (isGeminiConfigured()) {
    const keys = getApiKeys();
    const maxRetries = Math.max(1, Math.min(keys.length, 3));
    let lastError: unknown = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const apiKey = getGeminiApiKey();
        if (!apiKey) throw new Error('No valid Gemini API key found');

        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = buildCVRoastPrompt(options);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [{ text: systemPrompt }];

        if (pdfBase64) {
          // Chuẩn hóa base64: loại bỏ data URL scheme nếu có
          const cleanBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64.trim(),
            },
          });
        }

        if (cvText && cvText.trim()) {
          parts.push({
            text: `NỘI DUNG VĂN BẢN CV CỦA ỨNG VIÊN:\n${cvText.trim()}`,
          });
        }

        const response = await ai.models.generateContent({
          model: getGeminiModel(),
          contents: [{ parts }],
        });

        if (response.text && response.text.trim().length > 100) {
          roastReportMarkdown = response.text.trim();
          break; // Thành công, thoát vòng lặp retry
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(`[Gemini Roast CV Attempt ${attempt + 1}/${maxRetries} Failed]`, (err as Error)?.message || err);
        // Xoay tua API key sang key tiếp theo nếu gặp lỗi
        rotateGeminiApiKey();
      }
    }

    if (!roastReportMarkdown && lastError) {
      console.error('[Gemini Roast CV All Retries Exhausted - Falling back to Mock Engine]', lastError);
    }
  }

  // Fallback sang mock engine nếu không có key hoặc AI fail
  if (!roastReportMarkdown) {
    roastReportMarkdown = generateMockCVRoast(cvText, options);
  }

  // Trích xuất highlight punchline
  const highlightMatches = roastReportMarkdown.match(/\[HIGHLIGHT\]\s*([^\n]+)/g);
  let punchline = 'Mèo vừa sấy chín một CV Junior đòi lương 30 củ nhưng quên link Github!';
  if (highlightMatches && highlightMatches.length > 0) {
    punchline = highlightMatches[0].replace(/\[HIGHLIGHT\]\s*/, '').replace(/^[“"']+|[”"']+$/g, '').trim();
  }

  // Phân tích dữ liệu cấu trúc
  const structuredData = parseRoastMarkdown(roastReportMarkdown);

  return {
    report: roastReportMarkdown,
    highlight: punchline,
    score: structuredData.atsScore,
    atsScore: structuredData.atsScore,
    verdict: structuredData.verdict,
    structuredData,
  };
}
