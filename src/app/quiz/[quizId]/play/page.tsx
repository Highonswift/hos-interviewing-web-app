'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Question } from '@/lib/types';
import { useAntiCheat } from '@/hooks/useAntiCheat';

interface PlayableQuestion extends Question {
  shuffledOptions: string[];
}

/* ─── Logo mark ──────────────────────────────────────────────────────────── */
function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 14C6 7 12 3 20 2C28 1 42 4 45 14C48 24 44 38 36 44C28 50 14 46 8 38C2 30 6 21 6 14Z" fill="#e8483a" />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="-0.5">H</text>
    </svg>
  );
}

/* ─── Full-page overlay states ───────────────────────────────────────────── */
function FullPageState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh bg-[#fafaf9] overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.4 }} />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-[96px]" />
      <div className="relative z-10 flex flex-col items-center text-center gap-4 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-white border border-warm-200 shadow-md flex items-center justify-center">
          {icon}
        </div>
        <h2 className="font-display font-bold text-charcoal-900 text-xl">{title}</h2>
        <p className="text-charcoal-500 text-sm max-w-xs leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Option label (A, B, C, D) ──────────────────────────────────────────── */
function optionLabel(index: number) {
  return ['A', 'B', 'C', 'D', 'E'][index] ?? String(index + 1);
}

/* ─── Main quiz engine ───────────────────────────────────────────────────── */
export default function QuizEngine() {
  const { quizId } = useParams();
  const router = useRouter();
  const { tabSwitchCount } = useAntiCheat();

  const [questions, setQuestions]         = useState<PlayableQuestion[]>([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [answers, setAnswers]             = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeLeft, setTimeLeft]           = useState(0);
  const [totalTime, setTotalTime]         = useState(0);
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [animateIn, setAnimateIn]         = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleNextRef = useRef<() => void>(() => {});

  /* ── Submit results ── */
  const submitResults = useCallback(async (finalAnswers: Record<string, string>) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    const candidateName = localStorage.getItem(`candidate_name_${quizId}`) || 'Unknown';
    let score = 0;
    questions.forEach(q => { if (finalAnswers[q.id] === q.correct_answer) score += 1; });
    await supabase.from('results').insert([{
      quiz_id: quizId,
      candidate_name: candidateName,
      score,
      answers: finalAnswers,
      tab_switch_count: tabSwitchCount,
    }]);
    localStorage.removeItem(`candidate_name_${quizId}`);
    router.push(`/quiz/${quizId}/success`);
  }, [questions, quizId, router, tabSwitchCount]);

  /* ── Advance to next question / submit ── */
  const handleNext = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const newAnswers = { ...answers, [currentQ.id]: selectedOption || 'No Answer' };
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIndex < questions.length - 1) {
      setAnimateIn(false);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        const nextQ = questions[currentIndex + 1];
        setTimeLeft(nextQ.time_limit_seconds);
        setTotalTime(nextQ.time_limit_seconds);
        setAnimateIn(true);
      }, 180);
    } else {
      await submitResults(newAnswers);
    }
  }, [questions, currentIndex, answers, selectedOption, submitResults]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  /* ── Fetch questions ── */
  useEffect(() => {
    const candidateName = localStorage.getItem(`candidate_name_${quizId}`);
    if (!candidateName) { router.push(`/quiz/${quizId}`); return; }

    const fetchAndRandomizeQuestions = async () => {
      const { data } = await supabase.from('questions').select('*').eq('quiz_id', quizId);
      if (data && data.length > 0) {
        const shuffled = data
          .map(q => ({ ...q, shuffledOptions: [...q.options].sort(() => Math.random() - 0.5) }))
          .sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        setTimeLeft(shuffled[0].time_limit_seconds);
        setTotalTime(shuffled[0].time_limit_seconds);
      }
      setLoading(false);
    };
    fetchAndRandomizeQuestions();
  }, [quizId, router]);

  /* ── Timer ── */
  useEffect(() => {
    if (loading || questions.length === 0 || submitting) return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleNextRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, loading, submitting, questions.length]);

  /* ── States ── */
  if (loading) return (
    <FullPageState
      icon={<svg className="animate-spin text-brand-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
      title="Loading your assessment"
      subtitle="Fetching and randomising questions — just a moment…"
    />
  );

  if (questions.length === 0) return (
    <FullPageState
      icon={<svg className="text-charcoal-400" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>}
      title="No questions found"
      subtitle="This quiz doesn't have any questions yet. Please contact your recruiter."
    />
  );

  if (submitting) return (
    <FullPageState
      icon={<svg className="animate-spin text-brand-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
      title="Submitting your answers"
      subtitle="Please wait — do not close or refresh this tab."
    />
  );

  const currentQ   = questions[currentIndex];
  const progress   = ((currentIndex) / questions.length) * 100;
  const timerPct   = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const isLastQ    = currentIndex === questions.length - 1;
  const isUrgent   = timeLeft <= 10;
  const isMedium   = timeLeft <= 20 && timeLeft > 10;

  return (
    <div className="relative flex flex-col min-h-dvh bg-[#fafaf9] overflow-hidden">

      {/* ── Background ── */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-brand-400/8 blur-[96px]" />
      </div>

      {/* ── Top progress bar (overall quiz) ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-smooth"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-warm-200 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <LogoMark size={28} />
            <span className="font-display font-bold text-charcoal-900 text-sm hidden sm:block">HighOnSwift</span>
          </div>

          {/* Question counter */}
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-xs text-charcoal-400 uppercase tracking-wider">Question</span>
            <div className="flex items-center gap-1">
              <span className="font-display font-bold text-charcoal-900 text-lg leading-none">{currentIndex + 1}</span>
              <span className="text-charcoal-300 text-sm leading-none">/</span>
              <span className="font-display font-medium text-charcoal-400 text-sm leading-none">{questions.length}</span>
            </div>
          </div>

          {/* Tab-switch warning */}
          {tabSwitchCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-display font-semibold px-3 py-1.5 rounded-pill animate-fade-in">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
              {tabSwitchCount} tab {tabSwitchCount === 1 ? 'switch' : 'switches'}
            </div>
          )}

          {/* Timer */}
          <div className={`
            flex items-center gap-2 px-3.5 py-2 rounded-xl border font-display font-bold text-sm transition-all duration-300
            ${isUrgent
              ? 'bg-red-50 border-red-300 text-red-600 animate-pulse-brand'
              : isMedium
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-warm-50 border-warm-300 text-charcoal-700'
            }
          `}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span aria-live="polite" aria-label={`${timeLeft} seconds remaining`}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Timer progress bar */}
        <div className="h-1 w-full bg-warm-100">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-brand-500'
            }`}
            style={{ width: `${timerPct}%` }}
            role="progressbar"
            aria-valuenow={timeLeft}
            aria-valuemax={totalTime}
            aria-label="Time remaining"
          />
        </div>
      </header>

      {/* ── Question area ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-2xl">

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-6" aria-hidden="true">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`
                  rounded-pill transition-all duration-300
                  ${i === currentIndex
                    ? 'w-6 h-2 bg-brand-600'
                    : i < currentIndex
                    ? 'w-2 h-2 bg-brand-300'
                    : 'w-2 h-2 bg-warm-300'
                  }
                `}
              />
            ))}
          </div>

          {/* Question card */}
          <div
            className={`
              bg-white border border-warm-200 rounded-3xl shadow-md overflow-hidden
              transition-all duration-180
              ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
            `}
            style={{ transitionProperty: 'opacity, transform' }}
          >
            {/* Card accent */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />

            <div className="p-6 sm:p-8">
              {/* Q number pill */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-display font-semibold px-3 py-1 rounded-pill">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>

              {/* Question text */}
              <h2 className="font-display font-bold text-charcoal-900 text-xl sm:text-2xl leading-snug mb-7">
                {currentQ.question_text}
              </h2>

              {/* Options */}
              <div className="flex flex-col gap-3" role="radiogroup" aria-label="Answer options">
                {currentQ.shuffledOptions.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedOption(opt)}
                      className={`
                        group flex items-center gap-4 w-full text-left
                        border-2 rounded-2xl px-5 py-4
                        font-body font-medium text-[0.9375rem]
                        transition-all duration-150 cursor-pointer
                        active:scale-[0.99]
                        ${isSelected
                          ? 'border-brand-500 bg-brand-50 shadow-[0_0_0_3px_rgb(232_72_58_/_0.10)]'
                          : 'border-warm-200 bg-white hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-sm'
                        }
                      `}
                    >
                      {/* Label bubble */}
                      <span className={`
                        flex-shrink-0 w-8 h-8 rounded-xl
                        flex items-center justify-center
                        font-display font-bold text-sm
                        transition-all duration-150
                        ${isSelected
                          ? 'bg-brand-600 text-white shadow-brand-sm'
                          : 'bg-warm-100 text-charcoal-500 group-hover:bg-brand-100 group-hover:text-brand-700'
                        }
                      `}>
                        {optionLabel(i)}
                      </span>

                      {/* Option text */}
                      <span className={`flex-1 leading-snug transition-colors duration-150 ${isSelected ? 'text-brand-800' : 'text-charcoal-700'}`}>
                        {opt}
                      </span>

                      {/* Selected tick */}
                      {isSelected && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center animate-scale-in">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer row */}
              <div className="mt-8 flex items-center justify-between gap-4">
                {/* Skippable hint */}
                <p className="text-xs text-charcoal-400 font-medium hidden sm:block">
                  {selectedOption ? 'Answer selected — ready to continue.' : 'Select an option or skip to next question.'}
                </p>

                {/* Next / Submit button */}
                <button
                  onClick={handleNext}
                  className={`
                    flex items-center gap-2.5 ml-auto
                    font-display font-semibold text-[0.9375rem]
                    px-6 py-3 rounded-2xl
                    shadow-brand-sm hover:shadow-brand-md
                    active:scale-[0.97]
                    transition-all duration-200
                    ${isLastQ
                      ? 'bg-charcoal-900 hover:bg-charcoal-800 text-white'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                    }
                  `}
                >
                  {isLastQ ? (
                    <>
                      Submit Test
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </>
                  ) : (
                    <>
                      Next Question
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom warning */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-charcoal-400 font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Do not switch tabs or refresh — your session is being monitored.
          </div>
        </div>
      </main>
    </div>
  );
}