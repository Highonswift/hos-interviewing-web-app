'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Quiz, Result, Question, CodingQuestion, TestCase, QuizSection } from '@/lib/types';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function CandidateResultDetail() {
  const params = useParams();
  const router = useRouter();
  const resultId = params?.resultId as string;

  const [result, setResult] = useState<Result | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sections, setSections] = useState<QuizSection[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [testCasesMap, setTestCasesMap] = useState<Record<string, TestCase[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'correct' | 'wrong'>('all');

  useEffect(() => {
    if (!resultId) return;

    (async () => {
      setLoading(true);

      // 1. Fetch Result
      const { data: resData, error: resError } = await supabase
        .from('results')
        .select('*')
        .eq('id', resultId)
        .single();

      if (resError || !resData) {
        setLoading(false);
        return;
      }
      setResult(resData);

      // 2. Fetch Quiz
      const { data: qData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', resData.quiz_id)
        .single();
      if (qData) setQuiz(qData);

      // 3. Fetch Questions (MCQ) & Sections
      const [qRes, secRes, codeRes] = await Promise.all([
        supabase.from('questions').select('*').eq('quiz_id', resData.quiz_id),
        supabase.from('quiz_sections').select('*').eq('quiz_id', resData.quiz_id).order('position', { ascending: true }),
        supabase.from('coding_questions').select('*').eq('quiz_id', resData.quiz_id),
      ]);

      const fetchedQs: Question[] = qRes.data || [];
      const fetchedSecs: QuizSection[] = secRes.data || [];
      const fetchedCode: CodingQuestion[] = codeRes.data || [];

      setQuestions(fetchedQs);
      setSections(fetchedSecs);
      setCodingQuestions(fetchedCode);

      // Fetch test cases if coding questions exist
      if (fetchedCode.length > 0) {
        const { data: tcData } = await supabase
          .from('test_cases')
          .select('*')
          .in('question_id', fetchedCode.map(c => c.id));
        const tcMap: Record<string, TestCase[]> = {};
        (tcData || []).forEach((tc: TestCase) => {
          if (!tcMap[tc.question_id]) tcMap[tc.question_id] = [];
          tcMap[tc.question_id].push(tc);
        });
        setTestCasesMap(tcMap);
      }

      setLoading(false);
    })();
  }, [resultId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-9 h-9 rounded-full border-3 border-brand-500 border-t-transparent animate-spin" />
        <p className="text-sm font-display font-medium text-charcoal-500">Loading candidate submission…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <h2 className="font-display font-extrabold text-charcoal-900 text-2xl mb-2">Submission Not Found</h2>
        <p className="text-sm text-charcoal-500 mb-6">The requested candidate attempt could not be found or has been removed.</p>
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-display font-semibold text-sm shadow-brand-sm hover:bg-brand-700 transition-all"
        >
          ← Return to Results
        </Link>
      </div>
    );
  }

  const answers = result.answers || {};
  const totalMcqs = questions.length;
  let correctMcqs = 0;
  questions.forEach(q => {
    if (answers[q.id] && answers[q.id] === q.correct_answer) {
      correctMcqs += 1;
    }
  });

  const totalQuestionsCount = totalMcqs + codingQuestions.length;
  const attemptedMcqCount = Object.keys(answers).length;

  // Filter questions for Google Forms-like view
  const filteredQuestions = questions.filter(q => {
    const candidateAnswer = answers[q.id];
    const isCorrect = candidateAnswer === q.correct_answer;
    if (activeTab === 'correct') return isCorrect;
    if (activeTab === 'wrong') return !isCorrect;
    return true;
  });

  // Section name helper
  const sectionMap = new Map(sections.map(s => [s.id, s.name]));

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-fade-up pb-16">
      {/* ── Breadcrumb & Back button ── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-2 text-sm font-display font-semibold text-charcoal-600 hover:text-brand-600 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
          </svg>
          Back to Candidate Results
        </Link>
        <span className="text-xs font-mono text-charcoal-400">
          Result ID: {result.id.slice(0, 8)}
        </span>
      </div>

      {/* ── Google Forms Style Header Card ── */}
      <div className="bg-white border border-warm-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-display font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-100 mb-2">
                Candidate Assessment Submission
              </span>
              <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl leading-tight">
                {result.candidate_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-charcoal-500">
                {result.candidate_email && (
                  <span className="flex items-center gap-1 font-mono text-charcoal-600">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    {result.candidate_email}
                  </span>
                )}
                <span>•</span>
                <span>Submitted {new Date(result.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                {quiz && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-charcoal-700">{quiz.title}</span>
                  </>
                )}
              </div>
            </div>

            {/* Score Pill Card */}
            <div className="bg-warm-50 border border-warm-200 rounded-2xl p-4 text-center min-w-[140px]">
              <span className="text-[11px] font-display font-bold uppercase tracking-wider text-charcoal-400 block mb-0.5">
                Total Score
              </span>
              <div className="font-display font-extrabold text-3xl text-charcoal-900 leading-none">
                {result.score}
                <span className="text-sm font-semibold text-charcoal-400">
                  {totalQuestionsCount > 0 ? ` / ${totalQuestionsCount}` : ''}
                </span>
              </div>
              <span className="inline-block mt-1 text-xs font-medium text-brand-600">
                {totalQuestionsCount > 0 ? `${Math.round((result.score / totalQuestionsCount) * 100)}% accuracy` : ''}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-warm-100">
            <div className="bg-warm-50/70 border border-warm-200/60 rounded-xl p-3">
              <span className="text-[11px] font-display font-semibold text-charcoal-500 uppercase tracking-wider block">Status</span>
              <span className="font-display font-bold text-sm text-charcoal-800 capitalize">
                {result.status || 'Completed'}
              </span>
            </div>
            <div className="bg-warm-50/70 border border-warm-200/60 rounded-xl p-3">
              <span className="text-[11px] font-display font-semibold text-charcoal-500 uppercase tracking-wider block">MCQ Correct</span>
              <span className="font-display font-bold text-sm text-green-700">
                {correctMcqs} / {totalMcqs}
              </span>
            </div>
            <div className="bg-warm-50/70 border border-warm-200/60 rounded-xl p-3">
              <span className="text-[11px] font-display font-semibold text-charcoal-500 uppercase tracking-wider block">Tab Switches</span>
              <span className={`font-display font-bold text-sm ${result.tab_switch_count > 0 ? 'text-red-600' : 'text-charcoal-800'}`}>
                {result.tab_switch_count === 0 ? 'Clean (0)' : `${result.tab_switch_count} violations`}
              </span>
            </div>
            <div className="bg-warm-50/70 border border-warm-200/60 rounded-xl p-3">
              <span className="text-[11px] font-display font-semibold text-charcoal-500 uppercase tracking-wider block">Type</span>
              <span className="font-display font-bold text-sm text-charcoal-800 capitalize">
                {result.submission_type || 'MCQ'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MCQ Filter Tabs (Google Forms style: All, Correct, Incorrect) ── */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-warm-200 pb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-charcoal-900 text-white shadow-xs'
                  : 'bg-warm-100 text-charcoal-600 hover:bg-warm-200'
              }`}
            >
              All Questions ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('correct')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'correct'
                  ? 'bg-green-600 text-white shadow-xs'
                  : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              }`}
            >
              Correct ({correctMcqs})
            </button>
            <button
              onClick={() => setActiveTab('wrong')}
              className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                activeTab === 'wrong'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              Incorrect ({totalMcqs - correctMcqs})
            </button>
          </div>

          <span className="text-xs text-charcoal-400 font-medium">
            Showing {filteredQuestions.length} of {questions.length} questions
          </span>
        </div>
      )}

      {/* ── Questions List: Google Forms Style ── */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const candidateAnswer = answers[q.id];
          const isAnswered = Boolean(candidateAnswer);
          const isCorrect = candidateAnswer === q.correct_answer;
          const sectionTitle = q.section_id ? sectionMap.get(q.section_id) : null;

          return (
            <div
              key={q.id}
              className={`bg-white border rounded-3xl p-6 sm:p-7 shadow-xs transition-all ${
                isCorrect ? 'border-warm-200' : 'border-red-200 bg-red-50/10'
              }`}
            >
              {/* Card Top Pill */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-xs text-charcoal-500 uppercase tracking-wider">
                    Question {idx + 1}
                  </span>
                  {sectionTitle && (
                    <span className="text-xs px-2.5 py-0.5 rounded-pill bg-warm-100 border border-warm-200 text-charcoal-600 font-medium">
                      {sectionTitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-display font-bold px-3 py-1 rounded-pill bg-green-50 text-green-700 border border-green-200">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Correct (+1 pt)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-display font-bold px-3 py-1 rounded-pill bg-red-50 text-red-700 border border-red-200">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="12"/>
                      </svg>
                      {isAnswered ? 'Incorrect (0 pt)' : 'Unanswered (0 pt)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Question text */}
              <h3 className="font-display font-bold text-charcoal-900 text-base sm:text-lg mb-4 leading-snug">
                {q.question_text}
              </h3>

              {/* Question Image if present */}
              {q.image_url && (
                <div className="mb-5 rounded-2xl overflow-hidden border border-warm-200 bg-warm-50 p-2 max-w-md">
                  <img src={q.image_url} alt="Question figure" className="max-h-60 object-contain rounded-xl mx-auto" />
                </div>
              )}

              {/* Options Breakdown */}
              <div className="space-y-2.5">
                {q.options.map((opt, optIdx) => {
                  const isCandidateChoice = candidateAnswer === opt;
                  const isCorrectChoice = q.correct_answer === opt;

                  let rowStyle = 'border-warm-200 bg-white text-charcoal-700';
                  let badge = null;

                  if (isCorrectChoice) {
                    rowStyle = 'border-green-300 bg-green-50/70 text-green-900 font-medium';
                    badge = (
                      <span className="flex items-center gap-1 text-[11px] font-display font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full ml-auto">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Correct Answer
                      </span>
                    );
                  }

                  if (isCandidateChoice && !isCorrectChoice) {
                    rowStyle = 'border-red-300 bg-red-50 text-red-900 font-medium';
                    badge = (
                      <span className="flex items-center gap-1 text-[11px] font-display font-bold text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full ml-auto">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="12"/></svg>
                        Candidate Selected
                      </span>
                    );
                  }

                  if (isCandidateChoice && isCorrectChoice) {
                    badge = (
                      <span className="flex items-center gap-1 text-[11px] font-display font-bold text-green-800 bg-green-200/80 px-2.5 py-0.5 rounded-full ml-auto">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Candidate Answer (Correct)
                      </span>
                    );
                  }

                  return (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border transition-all text-sm ${rowStyle}`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs flex-shrink-0 ${
                        isCorrectChoice
                          ? 'bg-green-600 text-white'
                          : isCandidateChoice
                          ? 'bg-red-500 text-white'
                          : 'bg-warm-100 text-charcoal-500'
                      }`}>
                        {OPTION_LABELS[optIdx] || optIdx + 1}
                      </span>
                      <span className="flex-1 text-sm leading-snug break-words">
                        {opt}
                      </span>
                      {badge}
                    </div>
                  );
                })}
              </div>

              {!isAnswered && (
                <div className="mt-3 text-xs text-amber-600 font-medium flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Candidate skipped or did not answer this question.
                </div>
              )}
            </div>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div className="bg-white border border-warm-200 rounded-3xl p-10 text-center text-charcoal-400">
            No questions in this filter tab.
          </div>
        )}
      </div>

      {/* ── Coding Problems Detail (if candidate had coding questions) ── */}
      {codingQuestions.length > 0 && (
        <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <h2 className="font-display font-bold text-charcoal-900 text-lg">Coding Submissions</h2>
          </div>

          {codingQuestions.map((cq, i) => {
            const testResults = result.test_results || [];
            const cases = testCasesMap[cq.id] || [];

            return (
              <div key={cq.id} className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-display font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-pill">
                    Problem {i + 1}
                  </span>
                  {result.language && (
                    <span className="text-xs font-mono font-medium text-charcoal-500 bg-warm-100 px-2.5 py-1 rounded-lg">
                      {result.language}
                    </span>
                  )}
                </div>

                <h3 className="font-display font-bold text-charcoal-900 text-lg">{cq.title}</h3>
                <p className="text-charcoal-600 text-sm whitespace-pre-wrap font-body">{cq.description}</p>

                {/* Submitted Code */}
                {result.code && (
                  <div>
                    <label className="block text-xs font-display font-semibold uppercase tracking-wider text-charcoal-500 mb-2">
                      Candidate Code
                    </label>
                    <pre className="p-4 rounded-2xl bg-charcoal-900 text-charcoal-100 text-xs font-mono overflow-x-auto leading-relaxed border border-charcoal-800">
                      {result.code}
                    </pre>
                  </div>
                )}

                {/* Test results breakdown */}
                {testResults.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-display font-semibold uppercase tracking-wider text-charcoal-500">
                      Test Case Evaluations
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {testResults.map((tr, trIdx) => (
                        <div
                          key={trIdx}
                          className={`p-3 rounded-2xl border text-xs ${
                            tr.passed
                              ? 'bg-green-50/70 border-green-200 text-green-800'
                              : 'bg-red-50/70 border-red-200 text-red-800'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span>Case {trIdx + 1}: {tr.passed ? 'Passed ✓' : 'Failed ✗'}</span>
                            <span className="text-[10px] opacity-70">{tr.time_ms}ms</span>
                          </div>
                          <div className="font-mono text-[11px] space-y-0.5">
                            <div><span className="font-semibold opacity-75">Expected:</span> {tr.expected_output}</div>
                            <div><span className="font-semibold opacity-75">Actual:</span> {tr.actual_output || tr.error || '(empty)'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
