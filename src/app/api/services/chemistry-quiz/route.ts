import { NextRequest, NextResponse } from 'next/server';
import { ChemistryQuizQuestion } from '@/types';

export const CHEMISTRY_TRAP_QUESTIONS: ChemistryQuizQuestion[] = [
  {
    id: 1,
    question:
      'Thủy phân hoàn toàn 0,1 mol phenyl axetat (CH3COOC6H5) bằng dung dịch NaOH dư, đun nóng. Số mol NaOH đã tham gia phản ứng là:',
    options: ['A. 0,1 mol', 'B. 0,2 mol', 'C. 0,3 mol', 'D. 0,4 mol'],
    correctIndex: 1,
    explanation:
      'BẪY ESTE CỦA PHENOL: Phenyl axetat là este của phenol! Phản ứng sinh ra CH3COONa + C6H5ONa + H2O. Tỉ lệ mol este : NaOH = 1 : 2. Vậy 0,1 mol este cần đúng 0,2 mol NaOH.',
    trapType: 'Bẫy Este của Phenol',
  },
  {
    id: 2,
    question:
      'Cho m gam hỗn hợp gồm Mg và Al tác dụng hết với dung dịch HNO3 loãng, dư thu được dung dịch X và không thấy khí màu nâu đỏ thoát ra. Kết luận nào sau đây LUÔN ĐÚNG?',
    options: [
      'A. Dung dịch X chỉ chứa 2 muối kim loại',
      'B. Phản ứng chắc chắn không tạo ra NH4NO3',
      'C. Dung dịch X có thể chứa muối NH4NO3',
      'D. Sản phẩm khử duy nhất bắt buộc là N2',
    ],
    correctIndex: 2,
    explanation:
      'BẪY SẢN PHẨM KHỬ NH4NO3: Kim loại có tính khử mạnh (Mg, Al, Zn) khi tác dụng với HNO3 loãng rất dễ tạo ra muối amoni NH4NO3 (không có khí thoát ra). Rất nhiều bạn quên tính bảo toàn e cho NH4NO3 dẫn đến tính sai khối lượng muối!',
    trapType: 'Bẫy Kim Loại + HNO3',
  },
  {
    id: 3,
    question:
      'Cho các polime sau: tơ tằm, sợi bông, tơ visco, tơ nilon-6,6, tơ lapsan. Số tơ nhân tạo (bán tổng hợp) là:',
    options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
    correctIndex: 0,
    explanation:
      'BẪY PHÂN LOẠI TƠ: Trong danh sách chỉ có Tơ Visco là tơ bán tổng hợp (nhân tạo)! Tơ tằm và sợi bông là tơ thiên nhiên; tơ nilon-6,6 và lapsan là tơ tổng hợp.',
    trapType: 'Bẫy Phân loại Polime',
  },
  {
    id: 4,
    question:
      'Thủy phân hoàn toàn 1 mol tripeptit mạch hở Gly-Ala-Val cần dùng tối đa bao nhiêu mol liên kết peptit bị bẻ gãy?',
    options: ['A. 3 mol', 'B. 2 mol', 'C. 1 mol', 'D. 4 mol'],
    correctIndex: 1,
    explanation:
      'BẪY ĐẾM LIÊN KẾT PEPTIT: Tripeptit có 3 gốc alpha-amino axit nhưng chỉ có đúng 2 liên kết peptit (số liên kết = n - 1 = 3 - 1 = 2).',
    trapType: 'Bẫy Cấu tạo Peptit',
  },
  {
    id: 5,
    question:
      'Đun nóng dung dịch chứa m gam saccarozơ với axit loãng làm xúc tác. Sau khi trung hòa axit bằng kiềm, cho toàn bộ dung dịch thu được tác dụng với lượng dư AgNO3/NH3 thấy tạo ra 21,6 gam Ag. Giả sử hiệu suất thủy phân là 80%, giá trị của m là:',
    options: ['A. 17,10 gam', 'B. 21,375 gam', 'C. 34,20 gam', 'D. 42,75 gam'],
    correctIndex: 1,
    explanation:
      'BẪY TRÁNG BẠC SACCAROZƠ: 1 Saccarozơ thủy phân thành 1 Glucozơ + 1 Fructozơ. Cả 2 chất này đều tráng bạc (mỗi chất cho 2 Ag) -> 1 Saccarozơ cho 4 Ag! nAg = 0,2 mol -> nSaccarozơ pư = 0,2 / 4 = 0,05 mol. Do H=80% -> m = 0,05 / 0,8 * 342 = 21,375g.',
    trapType: 'Bẫy Thủy phân Cacbohidrat',
  },
  {
    id: 6,
    question:
      'Khi sục từ từ khí CO2 vào dung dịch chứa đồng thời Ca(OH)2 và NaOH, hiện tượng kết tủa xảy ra theo thứ tự thế nào?',
    options: [
      'A. Kết tủa tăng dần đến cực đại, sau đó tan ngay lập tức',
      'B. Kết tủa tăng đến cực đại, không đổi trong 1 khoảng, rồi mới tan dần',
      'C. Không có kết tủa cho đến khi NaOH phản ứng hết',
      'D. Kết tủa xuất hiện và tan liên tục không có giai đoạn đi ngang',
    ],
    correctIndex: 1,
    explanation:
      'BẪY ĐỒ THỊ CO2: Thứ tự phản ứng: 1) CO2 + Ca(OH)2 -> CaCO3↓ (kết tủa tăng cực đại). 2) CO2 + NaOH -> Na2CO3 / NaHCO3 (giai đoạn kết tủa nằm ngang). 3) CO2 + CaCO3 + H2O -> Ca(HCO3)2 (kết tủa tan dần).',
    trapType: 'Bẫy Đồ thị Kết tủa',
  },
  {
    id: 7,
    question:
      'Cho đinh sắt nguyên chất vào dung dịch Cu(NO3)2 có pha thêm một ít axit H2SO4 loãng. Hiện tượng ăn mòn kim loại xảy ra là:',
    options: [
      'A. Chỉ có ăn mòn hóa học',
      'B. Chỉ có ăn mòn điện hóa học',
      'C. Đồng thời cả ăn mòn hóa học và ăn mòn điện hóa học',
      'D. Không bị ăn mòn',
    ],
    correctIndex: 2,
    explanation:
      'BẪY ĂN MÒN KIM LOẠI: Fe tác dụng H+ là ăn mòn hóa học; Fe đẩy Cu ra bám lên thanh Fe tạo cặp cực Fe-Cu tiếp xúc dung dịch điện li gây ra ăn mòn điện hóa học! Luôn xảy ra đồng thời cả hai.',
    trapType: 'Bẫy Ăn mòn Điện hóa',
  },
  {
    id: 8,
    question:
      'Cho quỳ tím ẩm vào bình đựng khí Clo khô. Hiện tượng quan sát được là:',
    options: [
      'A. Quỳ tím hóa đỏ',
      'B. Quỳ tím hóa đỏ rồi mất màu ngay',
      'C. Quỳ tím không đổi màu',
      'D. Quỳ tím hóa xanh',
    ],
    correctIndex: 1,
    explanation:
      'BẪY KHÍ CLO TÁC DỤNG QUỲ TÍM: Clo ẩm tác dụng H2O sinh ra HCl (làm quỳ tím hóa đỏ) và HClO (chất oxi hóa cực mạnh có tính tẩy màu làm quỳ tím mất màu ngay lập tức).',
    trapType: 'Bẫy Tính chất Halogen',
  },
  {
    id: 9,
    question:
      'Chất béo lỏng (dầu thực vật) chuyển thành chất béo rắn (bơ nhân tạo) trong công nghiệp bằng phản ứng nào sau đây?',
    options: [
      'A. Thủy phân trong môi trường kiềm',
      'B. Xà phòng hóa',
      'C. Hiđro hóa xúc tác Niken, đun nóng',
      'D. Đề hiđro hóa',
    ],
    correctIndex: 2,
    explanation:
      'BẪY ĐIỀU CHẾ CHẤT BÉO: Chất béo lỏng chứa gốc axit béo không no (gốc oleat...). Khi hiđro hóa (cộng H2, Ni, to), nối đôi bị no hóa tạo chất béo rắn (gốc stearat...) dùng sản xuất bơ nhân tạo.',
    trapType: 'Bẫy Ứng dụng Lipit',
  },
  {
    id: 10,
    question:
      'Khi cô cạn dung dịch chứa các ion: Na+ (0,1 mol), Mg2+ (0,05 mol), Cl- (0,1 mol) và HCO3- (0,1 mol), khối lượng chất rắn khan thu được là:',
    options: ['A. 12,15 gam', 'B. 9,05 gam', 'C. 10,65 gam', 'D. 11,25 gam'],
    correctIndex: 1,
    explanation:
      'BẪY NHIỆT PHÂN HCO3- KHI CÔ CẠN: Khi đun nóng cô cạn, ion HCO3- bị nhiệt phân: 2HCO3- -> CO3(2-) + CO2↑ + H2O↑! Số mol CO3(2-) tạo thành = 0,1 / 2 = 0,05 mol. Khối lượng chất rắn = mNa+ (0,1*23) + mMg2+ (0,05*24) + mCl- (0,1*35,5) + mCO3(2-) (0,05*60) = 2,3 + 1,2 + 3,55 + 3,0 = 9,05 gam!',
    trapType: 'Bẫy Cô cạn Dung dịch',
  },
];

export async function GET() {
  // Trả về danh sách câu hỏi KHÔNG kèm đáp án correctIndex để học sinh làm bài trung thực
  const publicQuestions = CHEMISTRY_TRAP_QUESTIONS.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    trapType: q.trapType,
  }));

  return NextResponse.json({
    success: true,
    total: publicQuestions.length,
    questions: publicQuestions,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userAnswers: Record<string, number> = body.answers || {};

    let correctCount = 0;
    const details = CHEMISTRY_TRAP_QUESTIONS.map((q) => {
      const chosen = userAnswers[q.id.toString()] ?? -1;
      const isCorrect = chosen === q.correctIndex;
      if (isCorrect) correctCount += 1;

      return {
        id: q.id,
        question: q.question,
        options: q.options,
        chosenIndex: chosen,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
        trapType: q.trapType,
      };
    });

    const score = (correctCount / CHEMISTRY_TRAP_QUESTIONS.length) * 10;

    // Đánh giá và gợi ý gói của Mèo Dev
    let commentary = '';
    let recommendedPackage = 'CHEM-49';

    if (score >= 9) {
      commentary =
        '🐱 Đỉnh chóp con sen ơi! Kiến thức Hóa của mày cứng như kim cương! Chỉ cần luyện thêm bộ 100 đề thực chiến và mẹo bấm máy Casio là 10 điểm trong tầm tay!';
      recommendedPackage = 'CHEM-149';
    } else if (score >= 7) {
      commentary =
        '🐾 Điểm số khá đấy nhưng mày vẫn dính 2-3 quả bẫy kinh điển (Este/Peptit/Đồ thị)! Cần bồi dưỡng ngay bộ 60 đề bứt phá 9+ để bịt lỗ hổng kiến thức!';
      recommendedPackage = 'CHEM-89';
    } else {
      commentary =
        '🚨 Báo động đỏ! Mày cắn trọn ổ bẫy của Bộ Giáo Dục rồi! Đừng để trượt tốt nghiệp hay mất oan điểm đại học, hốt ngay Gói Khởi Động 8+ để làm lại cuộc đời!';
      recommendedPackage = 'CHEM-49';
    }

    return NextResponse.json({
      success: true,
      score,
      correctCount,
      total: CHEMISTRY_TRAP_QUESTIONS.length,
      commentary,
      recommendedPackage,
      details,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
