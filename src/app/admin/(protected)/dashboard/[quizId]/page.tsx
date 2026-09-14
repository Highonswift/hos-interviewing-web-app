'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Question } from '@/lib/types';
import Link from 'next/link';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function OptionLetter({ label, correct }: { label: string; correct: boolean }) {
  return (
    <span className={`
      flex-shrink-0 w-7 h-7 rounded-lg
      flex items-center justify-center
      font-display font-bold text-xs
      ${correct
        ? 'bg-green-500 text-white'
        : 'bg-warm-100 text-charcoal-500'
      }
    `}>
      {label}
    </span>
  );
}

/* ─── Loading ────────────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="flex items-center gap-2 text-charcoal-400 text-sm font-medium">
        <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading editor…
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function QuizEditor() {
  const { quizId } = useParams();

  const [questions,    setQuestions]    = useState<Question[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [successMsg,   setSuccessMsg]   = useState(false);

  /* Form state */
  const [questionText, setQuestionText] = useState('');
  const [options,      setOptions]      = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [timeLimit,    setTimeLimit]    = useState(60);

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });
    if (data) setQuestions(data);
    setLoading(false);
  }, [quizId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const updateOption = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (options.some(o => o.trim() === '')) {
      alert('Please fill in all 4 options.');
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from('questions').insert([{
      quiz_id:            quizId,
      question_text:      questionText,
      options,
      correct_answer:     options[correctIndex],
      time_limit_seconds: timeLimit,
    }]);

    if (!error) {
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
      setTimeLimit(60);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2500);
      await fetchQuestions();
    } else {
      alert('Error adding question: ' + error.message);
    }
    setSubmitting(false);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-7 animate-fade-up">

      {/* ── Page header ── */}
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-charcoal-500 hover:text-brand-600 mb-3 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight">
              Question Editor
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-charcoal-400 text-xs font-medium font-mono bg-warm-100 border border-warm-200 px-2 py-0.5 rounded-lg">
                {String(quizId)}
              </span>
              <span className="text-charcoal-400 text-xs">·</span>
              <span className="text-charcoal-500 text-xs font-medium">{questions.length} question{questions.length !== 1 ? 's' : ''} added</span>
            </div>
          </div>

          {/* Question count badge */}
          <div className="flex-shrink-0 text-right hidden sm:block">
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-display font-semibold px-3 py-1.5 rounded-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
              </svg>
              {questions.length} / ∞ Questions
            </div>
          </div>
        </div>
      </div>

      {/* ── Add question form ── */}
      <div className="bg-white border border-warm-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />

        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <h2 className="font-display font-bold text-charcoal-900 text-base">Add a New Question</h2>
          </div>

          {/* Success toast */}
          {successMsg && (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-2xl px-4 py-3 mb-5 animate-fade-down">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Question added successfully!
            </div>
          )}

          <form onSubmit={handleAddQuestion} className="space-y-5">

            {/* Question text */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="q-text" className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">
                Question Text
              </label>
              <textarea
                id="q-text"
                required
                rows={3}
                placeholder="Type the question here… e.g. What is the time complexity of binary search?"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                className="
                  w-full px-4 py-3 rounded-2xl
                  font-body text-sm text-charcoal-900
                  placeholder:text-charcoal-400
                  bg-white border-2 border-warm-300
                  hover:border-warm-400
                  focus:border-brand-400 focus:outline-none
                  focus:shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)]
                  resize-none transition-all duration-200
                "
              />
            </div>

            {/* Options */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">
                  Answer Options
                </label>
                <span className="text-xs text-charcoal-400 font-medium">
                  Click the circle to mark the correct answer
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt, i) => {
                  const isCorrect = correctIndex === i;
                  return (
                    <div
                      key={i}
                      className={`
                        flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-150
                        ${isCorrect
                          ? 'border-green-400 bg-green-50'
                          : 'border-warm-200 bg-white hover:border-warm-300'
                        }
                      `}
                    >
                      {/* Correct answer radio */}
                      <button
                        type="button"
                        onClick={() => setCorrectIndex(i)}
                        className={`
                          flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                          transition-all duration-150
                          ${isCorrect
                            ? 'border-green-500 bg-green-500'
                            : 'border-warm-400 bg-white hover:border-green-400'
                          }
                        `}
                        aria-label={`Mark option ${OPTION_LABELS[i]} as correct`}
                        aria-pressed={isCorrect}
                      >
                        {isCorrect && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>

                      {/* Letter badge */}
                      <span className={`
                        flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center
                        font-display font-bold text-xs
                        ${isCorrect ? 'bg-green-500 text-white' : 'bg-warm-100 text-charcoal-500'}
                      `}>
                        {OPTION_LABELS[i]}
                      </span>

                      {/* Option input */}
                      <input
                        required
                        placeholder={`Option ${OPTION_LABELS[i]}`}
                        value={opt}
                        onChange={e => updateOption(i, e.target.value)}
                        className={`
                          flex-1 min-w-0 text-sm font-body
                          bg-transparent focus:outline-none
                          placeholder:text-charcoal-400
                          ${isCorrect ? 'text-green-800 font-semibold' : 'text-charcoal-800'}
                        `}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time limit */}
            <div className="flex items-center gap-4 pt-1">
              <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider flex-shrink-0">
                Time Limit
              </label>
              <div className="flex items-center gap-2">
                {[30, 45, 60, 90, 120].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeLimit(t)}
                    className={`
                      px-3 py-1.5 rounded-xl text-xs font-display font-semibold
                      border transition-all duration-150
                      ${timeLimit === t
                        ? 'bg-brand-600 text-white border-brand-600 shadow-brand-sm'
                        : 'bg-white text-charcoal-600 border-warm-300 hover:border-brand-300 hover:text-brand-600'
                      }
                    `}
                  >
                    {t}s
                  </button>
                ))}
                {/* Custom time input */}
                <div className="flex items-center gap-1.5 ml-1">
                  <input
                    type="number"
                    min="5"
                    value={timeLimit}
                    onChange={e => setTimeLimit(Number(e.target.value))}
                    className="w-16 text-center text-sm font-body font-medium text-charcoal-900 bg-white border-2 border-warm-300 rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-400 transition-colors"
                    aria-label="Custom time limit in seconds"
                  />
                  <span className="text-xs text-charcoal-400 font-medium">sec</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="
                  inline-flex items-center gap-2
                  bg-brand-600 hover:bg-brand-700
                  disabled:opacity-60 disabled:cursor-not-allowed
                  text-white font-display font-semibold text-sm
                  px-6 py-3 rounded-2xl
                  shadow-brand-sm hover:shadow-brand-md
                  active:scale-[0.97] transition-all duration-200
                "
              >
                {submitting ? (
                  <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Adding…</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Question</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Question list ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-charcoal-900 text-base">
            Current Questions
            <span className="ml-2 text-xs font-semibold text-charcoal-400 bg-warm-100 border border-warm-200 px-2 py-0.5 rounded-pill">
              {questions.length}
            </span>
          </h2>
        </div>

        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center bg-white border border-warm-200 border-dashed rounded-3xl animate-fade-up">
            <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center mb-3 text-charcoal-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <p className="font-display font-bold text-charcoal-600 text-sm mb-1">No questions yet</p>
            <p className="text-charcoal-400 text-xs max-w-xs">Use the form above to add the first question to this quiz.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white border border-warm-200 rounded-2xl shadow-xs hover:shadow-sm hover:border-warm-300 transition-all duration-200 overflow-hidden animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Question header */}
                <div className="flex items-start gap-3 p-5 pb-3">
                  {/* Index bubble */}
                  <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-brand-100 text-brand-700 font-display font-bold text-xs flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="font-display font-semibold text-charcoal-900 text-sm leading-snug flex-1">
                    {q.question_text}
                  </p>
                </div>

                {/* Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-5 pb-4">
                  {q.options.map((opt, i) => {
                    const isCorrect = opt === q.correct_answer;
                    return (
                      <div
                        key={i}
                        className={`
                          flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm
                          ${isCorrect
                            ? 'bg-green-50 border border-green-200 text-green-800 font-semibold'
                            : 'bg-warm-50 border border-warm-200 text-charcoal-600'
                          }
                        `}
                      >
                        <OptionLetter label={OPTION_LABELS[i]} correct={isCorrect} />
                        <span className="flex-1 leading-snug">{opt}</span>
                        {isCorrect && (
                          <svg width="13" height="13" className="flex-shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-warm-100 bg-warm-50">
                  <span className="flex items-center gap-1.5 text-xs text-charcoal-400 font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {q.time_limit_seconds}s time limit
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-display font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-pill">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    1 correct answer
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}