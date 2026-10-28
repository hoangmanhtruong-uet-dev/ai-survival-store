'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RefreshCw, Trophy, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { playSound } from '@/lib/audio';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  trapType: string;
}

interface QuizResultDetail {
  id: number;
  question: string;
  options: string[];
  chosenIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
  trapType: string;
}

interface QuizResult {
  score: number;
  correctCount: number;
  total: number;
  commentary: string;
  recommendedPackage: string;
  details: QuizResultDetail[];
}

interface ChemistryQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPackage?: (productId: string) => void;
}

export const ChemistryQuizModal: React.FC<ChemistryQuizModalProps> = ({
  isOpen,
  onClose,
  onSelectPackage,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes timer

  // Nạp 10 câu hỏi từ API khi mở modal
  useEffect(() => {
    if (isOpen) {
      loadQuestions();
      setTimeLeft(300);
      setAnswers({});
      setResult(null);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Bộ đếm thời gian 5 phút
  useEffect(() => {
    if (!isOpen || result || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, result, timeLeft]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/services/chemistry-quiz');
      const data = await res.json();
      if (data.success && data.questions) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to load quiz questions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id.toString()]: optionIndex,
    }));
    playSound('keyClick');
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/services/chemistry-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const data: QuizResult = await res.json();
      setResult(data);

      if (data.score >= 8) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        playSound('tingTing');
      } else {
        playSound('meow');
      }
    } catch (err) {
      console.error('Failed to submit quiz', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
              🎯
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Thi Thử 10 Câu Bẫy Điểm 9+ Hóa THPT
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Miễn phí
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Thử thách phản xạ, phát hiện lỗ hổng kiến thức trước kỳ thi tốt nghiệp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-zinc-400">Mèo Dev đang xào bộ câu hỏi bẫy...</p>
            </div>
          ) : result ? (
            /* Screen: Result & Review */
            <div className="space-y-6 animate-fade-in">
              {/* Score card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/30 text-center space-y-3 shadow-lg">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-3xl">
                  {result.score >= 8 ? '🏆' : result.score >= 5 ? '🎯' : '🐱'}
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-white">
                    {result.score.toFixed(1)} / 10 Điểm
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Đúng {result.correctCount}/{result.total} câu bẫy kinh điển
                  </div>
                </div>
                <p className="text-sm text-zinc-300 italic max-w-lg mx-auto bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                  {result.commentary}
                </p>

                {/* Package recommendation button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      if (onSelectPackage) onSelectPackage(result.recommendedPackage);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Mở Gói Đề Khuyên Dùng ({result.recommendedPackage === 'CHEM-149' ? 'All-in Thủ Khoa' : result.recommendedPackage === 'CHEM-89' ? 'Bứt Phá 9+' : 'Khởi Động 8+'})
                    </span>
                  </button>
                </div>
              </div>

              {/* Review detailed answers */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Bóc Tách Từng Câu Bẫy & Lời Giải Chi Tiết
                </h3>

                <div className="space-y-3">
                  {result.details.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border text-xs sm:text-sm space-y-2.5 transition ${
                        item.isCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-red-950/20 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-zinc-200">
                          Câu {idx + 1}: {item.question}
                        </span>
                        {item.isCorrect ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold flex-shrink-0 text-xs">
                            <CheckCircle2 className="w-4 h-4" /> Đúng
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 font-bold flex-shrink-0 text-xs">
                            <XCircle className="w-4 h-4" /> Sai
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {item.options.map((opt, optIdx) => {
                          let optStyle = 'bg-zinc-900/60 border-zinc-800 text-zinc-400';
                          if (optIdx === item.correctIndex) {
                            optStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold';
                          } else if (optIdx === item.chosenIndex && !item.isCorrect) {
                            optStyle = 'bg-red-500/20 border-red-500/50 text-red-300 line-through';
                          }
                          return (
                            <div key={optIdx} className={`px-3 py-2 rounded-lg border ${optStyle}`}>
                              {opt}
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs leading-relaxed">
                        <span className="font-bold text-amber-400">💡 Giải thích bẫy: </span>
                        {item.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    setCurrentIndex(0);
                    setTimeLeft(300);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 rounded-xl transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Làm Lại Bài Thi</span>
                </button>
              </div>
            </div>
          ) : (
            /* Screen: Taking Quiz */
            <div className="space-y-6">
              {/* Progress & Timer bar */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-400">
                    Câu {currentIndex + 1} / {questions.length}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {currentQ?.trapType}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                  <span>⏱️</span>
                  <span>{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Question container */}
              {currentQ && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <p className="text-sm sm:text-base font-semibold text-zinc-100 leading-relaxed">
                      {currentQ.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQ.id.toString()] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                              : 'bg-zinc-900/40 hover:bg-zinc-800/60 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <span>{opt}</span>
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ml-3 ${
                              isSelected
                                ? 'border-emerald-400 bg-emerald-500 text-zinc-950 font-bold'
                                : 'border-zinc-700'
                            }`}
                          >
                            {isSelected && '✓'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 disabled:opacity-40 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Câu trước</span>
                </button>

                <div className="text-xs text-zinc-500">
                  Đã trả lời {Object.keys(answers).length}/{questions.length} câu
                </div>

                {currentIndex === questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs hover:from-emerald-400 hover:to-teal-400 transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trophy className="w-3.5 h-3.5" />
                    )}
                    <span>Nộp Bài Chấm Điểm</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition cursor-pointer"
                  >
                    <span>Câu tiếp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
