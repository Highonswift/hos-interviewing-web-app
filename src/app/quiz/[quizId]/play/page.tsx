'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import {
  Quiz, Question, CodingQuestion, TestCase,
  CodingLanguage, LANGUAGE_META, TestCaseResult,
  QuizItem,
} from '@/lib/types';
import { useAntiCheat } from '@/hooks/useAntiCheat';

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-white min-h-[300px]">
      <div className="flex items-center gap-2 text-charcoal-400 text-sm font-medium">
        <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading code editor…
      </div>
    </div>
  ),
});

interface PlayableMCQ extends Question {
  shuffledOptions: string[];
}

interface AssessmentItem {
  id: string; // unique item id or position key
  type: 'mcq' | 'coding';
  time_limit_seconds: number;
  mcq?: PlayableMCQ;
  coding?: CodingQuestion;
}

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 14C6 7 12 3 20 2C28 1 42 4 45 14C48 24 44 38 36 44C28 50 14 46 8 38C2 30 6 21 6 14Z" fill="#e8483a" />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="-0.5">H</text>
    </svg>
  );
}

function FullPageState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh bg-[#fafaf9] overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.4 }} />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-[96px]" />
      <div className="relative z-10 flex flex-col items-center text-center gap-4 animate-scale-in px-4">
        <div className="w-16 h-16 rounded-2xl bg-white border border-warm-200 shadow-md flex items-center justify-center">
          {icon}
        </div>
        <h2 className="font-display font-bold text-charcoal-900 text-xl">{title}</h2>
        <p className="text-charcoal-500 text-sm max-w-xs leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function optionLabel(index: number) {
  return ['A', 'B', 'C', 'D', 'E'][index] ?? String(index + 1);
}

function fmtTime(s: number) {
  if (s <= 0) return '00:00';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function UnifiedQuizEngine() {
  const { quizId } = useParams();
  const router = useRouter();
  const { tabSwitchCount } = useAntiCheat();

  // Python in-browser runner ref
  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
    script.async = true;
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, []);

  const getPyodide = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current;
    const pyodide = await (globalThis as any).loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
    });
    pyodideRef.current = pyodide;
    return pyodide;
  }, []);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [items, setItems] = useState<AssessmentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [animateIn, setAnimateIn] = useState(true);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleNextRef = useRef<() => void>(() => {});

  // MCQ state
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Coding state
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [langMap, setLangMap] = useState<Record<string, CodingLanguage>>({});
  const [allTestCases, setAllTestCases] = useState<Record<string, TestCase[]>>({});
  const [codingScores, setCodingScores] = useState<Record<string, number>>({});
  const [codingTab, setCodingTab] = useState<'problem' | 'testcases'>('problem');
  const [testRunResults, setTestRunResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Code runner helper
  const runOneCase = useCallback(async (
    lang: CodingLanguage,
    code: string,
    tc: TestCase,
  ): Promise<TestCaseResult> => {
    const start = Date.now();
    const normalize = (s: string) =>
      s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        .split('\n').map(l => l.trimEnd()).join('\n').trim();

    let actualRaw = '';
    let errorMsg: string | null = null;

    try {
      if (lang === 'python3') {
        const pyodide = await getPyodide();
        const escapedCode = JSON.stringify(code);
        const escapedStdin = JSON.stringify(tc.input ?? '');
        const wrapper = `
import sys, io
sys.stdin = io.StringIO(${escapedStdin})
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
__code = ${escapedCode}
__gl = {}
try:
    exec(__code, __gl)
    __out = sys.stdout.getvalue()
    __err = sys.stderr.getvalue()
except Exception as e:
    import traceback
    __out = sys.stdout.getvalue()
    __err = traceback.format_exc()
(__out, __err)
`;
        const res = await pyodide.runPythonAsync(wrapper);
        const out = res.get(0);
        const err = res.get(1);
        actualRaw = out ?? '';
        errorMsg = err && err.trim().length > 0 ? err : null;
      } else {
        // Javascript WebWorker runner
        const workerBlob = new Blob([`
          self.onmessage = function(e) {
            var code = e.data.code;
            var stdinStr = e.data.stdin;
            var lines = stdinStr ? stdinStr.split('\\n') : [];
            var lineIdx = 0;
            var logs = [];
            var origLog = console.log;
            console.log = function() {
              var args = Array.prototype.slice.call(arguments);
              logs.push(args.map(function(a){ return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' '));
            };
            function requireMock(mod) {
              if (mod === 'fs') {
                return {
                  readFileSync: function() { return stdinStr; },
                };
              }
              throw new Error('Module ' + mod + ' not supported.');
            }
            try {
              var fn = new Function('require', 'console', code);
              fn(requireMock, console);
              self.postMessage({ success: true, output: logs.join('\\n'), error: null });
            } catch(err) {
              self.postMessage({ success: false, output: logs.join('\\n'), error: err ? (err.stack || err.message) : 'Unknown error' });
            } finally {
              console.log = origLog;
            }
          };
        `], { type: 'application/javascript' });

        const worker = new Worker(URL.createObjectURL(workerBlob));
        const workerPromise = new Promise<{ output: string; error: string | null }>((resolve) => {
          const timeout = setTimeout(() => {
            worker.terminate();
            resolve({ output: '', error: 'Execution timed out (5s limit).' });
          }, 5000);

          worker.onmessage = (e) => {
            clearTimeout(timeout);
            worker.terminate();
            resolve({ output: e.data.output, error: e.data.error });
          };
          worker.postMessage({ code, stdin: tc.input });
        });

        const execRes = await workerPromise;
        actualRaw = execRes.output;
        errorMsg = execRes.error;
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Execution error';
    }

    const passed = !errorMsg && normalize(actualRaw) === normalize(tc.expected_output);
    return {
      test_case_id: tc.id,
      input: tc.input,
      expected_output: tc.expected_output,
      actual_output: actualRaw,
      passed,
      error: errorMsg,
      time_ms: Date.now() - start,
      is_public: tc.is_public,
    };
  }, [getPyodide]);

  // Submit test results
  const submitFinalAssessment = useCallback(async (
    finalAnswers: Record<string, string>,
    finalCodingScores: Record<string, number>,
  ) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    const candidateName  = localStorage.getItem(`candidate_name_${quizId}`) || 'Unknown';
    const candidateEmail = localStorage.getItem(`candidate_email_${quizId}`) || null;
    const sentinelId     = localStorage.getItem(`result_id_${quizId}`) || null;

    let mcqScore = 0;
    items.forEach(it => {
      if (it.type === 'mcq' && it.mcq) {
        if (finalAnswers[it.mcq.id] === it.mcq.correct_answer) mcqScore += 1;
      }
    });

    const codingScoreTotal = Object.values(finalCodingScores).reduce((a, b) => a + b, 0);
    const totalScore = mcqScore + codingScoreTotal;

    const payload = {
      quiz_id: quizId,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      score: totalScore,
      answers: finalAnswers,
      tab_switch_count: tabSwitchCount,
      submission_type: quiz?.type === 'mixed' ? 'mixed' : (items[0]?.type ?? 'mcq'),
      status: 'completed',
    };

    if (sentinelId) {
      await supabase.from('results').update(payload).eq('id', sentinelId);
    } else {
      await supabase.from('results').insert([payload]);
    }

    localStorage.removeItem(`candidate_name_${quizId}`);
    localStorage.removeItem(`candidate_email_${quizId}`);
    localStorage.removeItem(`result_id_${quizId}`);
    router.push(`/quiz/${quizId}/success`);
  }, [items, quizId, quiz, router, tabSwitchCount]);

  // Advance to next question
  const handleNext = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    let nextAnswers = { ...mcqAnswers };
    let nextCodingScores = { ...codingScores };

    if (currentItem.type === 'mcq' && currentItem.mcq) {
      nextAnswers[currentItem.mcq.id] = selectedOption || 'No Answer';
      setMcqAnswers(nextAnswers);
      setSelectedOption(null);
    } else if (currentItem.type === 'coding' && currentItem.coding) {
      // Evaluate test cases automatically on advance
      const code = codeMap[currentItem.coding.id] || LANGUAGE_META[langMap[currentItem.coding.id] || 'python3'].defaultCode;
      const lang = langMap[currentItem.coding.id] || 'python3';
      const cases = allTestCases[currentItem.coding.id] || [];
      let passedCount = 0;
      for (const tc of cases) {
        const res = await runOneCase(lang, code, tc);
        if (res.passed) passedCount += 1;
      }
      nextCodingScores[currentItem.coding.id] = passedCount;
      setCodingScores(nextCodingScores);
    }

    if (currentIndex < items.length - 1) {
      setAnimateIn(false);
      setTimeout(() => {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        const nextItem = items[nextIdx];
        setTimeLeft(nextItem.time_limit_seconds);
        setTotalTime(nextItem.time_limit_seconds);
        setTestRunResults([]);
        setCodingTab('problem');
        setRunError(null);
        setAnimateIn(true);
      }, 180);
    } else {
      await submitFinalAssessment(nextAnswers, nextCodingScores);
    }
  }, [items, currentIndex, mcqAnswers, codingScores, selectedOption, codeMap, langMap, allTestCases, runOneCase, submitFinalAssessment]);

  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  // Initial load
  useEffect(() => {
    const candidateName = localStorage.getItem(`candidate_name_${quizId}`);
    if (!candidateName) { router.push(`/quiz/${quizId}`); return; }

    (async () => {
      const { data: qData } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      if (!qData) { setLoading(false); return; }
      setQuiz(qData);

      const builtItems: AssessmentItem[] = [];

      if (qData.type === 'mixed') {
        const { data: qiList } = await supabase
          .from('quiz_items').select('*').eq('quiz_id', quizId).order('position', { ascending: true });

        if (qiList && qiList.length > 0) {
          const mcqIds = qiList.filter(i => i.item_type === 'mcq').map(i => i.item_id);
          const codeIds = qiList.filter(i => i.item_type === 'coding').map(i => i.item_id);

          let mcqMap: Record<string, Question> = {};
          if (mcqIds.length > 0) {
            const { data } = await supabase.from('questions').select('*').in('id', mcqIds);
            if (data) data.forEach(m => { mcqMap[m.id] = m; });
          }

          let codeMapData: Record<string, CodingQuestion> = {};
          let tcMapData: Record<string, TestCase[]> = {};
          if (codeIds.length > 0) {
            const { data } = await supabase.from('coding_questions').select('*').in('id', codeIds);
            if (data) data.forEach(c => { codeMapData[c.id] = c; });
            const { data: tcList } = await supabase.from('test_cases').select('*').in('question_id', codeIds);
            if (tcList) {
              tcList.forEach(tc => {
                if (!tcMapData[tc.question_id]) tcMapData[tc.question_id] = [];
                tcMapData[tc.question_id].push(tc);
              });
            }
          }
          setAllTestCases(tcMapData);

          const initCode: Record<string, string> = {};
          const initLang: Record<string, CodingLanguage> = {};

          qiList.forEach(qi => {
            if (qi.item_type === 'mcq' && mcqMap[qi.item_id]) {
              const original = mcqMap[qi.item_id];
              builtItems.push({
                id: qi.id,
                type: 'mcq',
                time_limit_seconds: original.time_limit_seconds,
                mcq: {
                  ...original,
                  shuffledOptions: [...original.options].sort(() => Math.random() - 0.5),
                },
              });
            } else if (qi.item_type === 'coding' && codeMapData[qi.item_id]) {
              const codeQ = codeMapData[qi.item_id];
              const defaultL = codeQ.language_options[0] || 'python3';
              initLang[codeQ.id] = defaultL;
              initCode[codeQ.id] = LANGUAGE_META[defaultL].defaultCode;
              builtItems.push({
                id: qi.id,
                type: 'coding',
                time_limit_seconds: codeQ.time_limit_seconds,
                coding: codeQ,
              });
            }
          });
          setCodeMap(initCode);
          setLangMap(initLang);
        }
      } else {
        // Standard MCQ Quiz
        const { data: mcqs } = await supabase.from('questions').select('*').eq('quiz_id', quizId);
        if (mcqs && mcqs.length > 0) {
          mcqs.sort(() => Math.random() - 0.5).forEach(m => {
            builtItems.push({
              id: m.id,
              type: 'mcq',
              time_limit_seconds: m.time_limit_seconds,
              mcq: {
                ...m,
                shuffledOptions: [...m.options].sort(() => Math.random() - 0.5),
              },
            });
          });
        }
      }

      setItems(builtItems);
      if (builtItems.length > 0) {
        setTimeLeft(builtItems[0].time_limit_seconds);
        setTotalTime(builtItems[0].time_limit_seconds);
      }
      setLoading(false);
    })();
  }, [quizId, router]);

  // Timer countdown
  useEffect(() => {
    if (loading || items.length === 0 || submitting) return;
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
  }, [currentIndex, loading, submitting, items.length]);

  // Test run on current coding problem
  const handleTestRun = async () => {
    const currentItem = items[currentIndex];
    if (!currentItem || currentItem.type !== 'coding' || !currentItem.coding) return;
    const problem = currentItem.coding;
    const code = codeMap[problem.id] || LANGUAGE_META[langMap[problem.id] || 'python3'].defaultCode;
    const lang = langMap[problem.id] || 'python3';
    const publicCases = (allTestCases[problem.id] || []).filter(tc => tc.is_public);

    if (publicCases.length === 0) {
      alert('No public test cases for this question.');
      return;
    }

    setIsRunning(true);
    setRunError(null);
    setTestRunResults([]);
    setCodingTab('testcases');

    const results: TestCaseResult[] = [];
    for (const tc of publicCases) {
      const r = await runOneCase(lang, code, tc);
      results.push(r);
    }
    setTestRunResults(results);
    setIsRunning(false);
  };

  if (loading) {
    return (
      <FullPageState
        icon={<svg className="animate-spin text-brand-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
        title="Loading your assessment"
        subtitle="Preparing assessment items and sandbox environment…"
      />
    );
  }

  if (items.length === 0) {
    return (
      <FullPageState
        icon={<svg className="text-charcoal-400" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>}
        title="No questions found"
        subtitle="This assessment does not have any questions yet. Please contact your recruiter."
      />
    );
  }

  if (submitting) {
    return (
      <FullPageState
        icon={<svg className="animate-spin text-brand-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
        title="Submitting your assessment"
        subtitle="Evaluating test cases and recording responses — please do not close this tab."
      />
    );
  }

  const currentItem = items[currentIndex];
  const progress = ((currentIndex) / items.length) * 100;
  const timerPct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  const isLastItem = currentIndex === items.length - 1;
  const isUrgent = timeLeft <= 15;
  const isMedium = timeLeft <= 30 && timeLeft > 15;

  return (
    <div className="relative flex flex-col min-h-dvh bg-[#fafaf9] overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-brand-400/8 blur-[96px]" />
      </div>

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1" aria-hidden="true">
        <div className="h-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-smooth" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-warm-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <LogoMark size={28} />
            <span className="font-display font-bold text-charcoal-900 text-sm hidden sm:block">HighOnSwift</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-display font-bold px-2.5 py-1 rounded-pill border ${
              currentItem.type === 'coding' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {currentItem.type === 'coding' ? 'Coding Problem' : 'Multiple Choice'}
            </span>
            <span className="text-charcoal-400 text-xs hidden sm:inline">·</span>
            <div className="flex items-center gap-1">
              <span className="font-display font-semibold text-xs text-charcoal-400 uppercase tracking-wider">Item</span>
              <span className="font-display font-bold text-charcoal-900 text-base leading-none">{currentIndex + 1}</span>
              <span className="text-charcoal-300 text-xs">/</span>
              <span className="font-display font-medium text-charcoal-400 text-xs">{items.length}</span>
            </div>
          </div>

          {tabSwitchCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-display font-semibold px-3 py-1.5 rounded-pill animate-fade-in">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              {tabSwitchCount} tab {tabSwitchCount === 1 ? 'switch' : 'switches'}
            </div>
          )}

          {/* Timer */}
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border font-display font-bold text-sm transition-all duration-300 ${
            isUrgent ? 'bg-red-50 border-red-300 text-red-600 animate-pulse-brand' : isMedium ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-warm-50 border-warm-300 text-charcoal-700'
          }`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{fmtTime(timeLeft)}</span>
          </div>
        </div>

        <div className="h-1 w-full bg-warm-100">
          <div className={`h-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-red-500' : isMedium ? 'bg-amber-500' : 'bg-brand-500'
          }`} style={{ width: `${timerPct}%` }} />
        </div>
      </header>

      {/* ── Item Content ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        {currentItem.type === 'mcq' && currentItem.mcq && (
          <div className="w-full max-w-2xl">
            <div className={`bg-white border border-warm-200 rounded-3xl shadow-md overflow-hidden transition-all duration-180 ${
              animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}>
              <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />
              <div className="p-6 sm:p-8">
                <div className="mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-100 text-brand-700 text-xs font-display font-semibold px-3 py-1 rounded-pill">
                    Question {currentIndex + 1} of {items.length}
                  </span>
                </div>

                {/* Question Text */}
                <h2 className="font-display font-bold text-charcoal-900 text-xl sm:text-2xl leading-snug mb-4">
                  {currentItem.mcq.question_text}
                </h2>

                {/* Question Image if present */}
                {currentItem.mcq.image_url && (
                  <div className="mb-6 rounded-2xl overflow-hidden border border-warm-200 bg-warm-50 flex items-center justify-center p-3">
                    <img src={currentItem.mcq.image_url} alt="Question figure" className="max-h-72 object-contain rounded-xl" />
                  </div>
                )}

                {/* Options */}
                <div className="flex flex-col gap-3" role="radiogroup">
                  {currentItem.mcq.shuffledOptions.map((opt, i) => {
                    const isSelected = selectedOption === opt;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedOption(opt)}
                        className={`group flex items-center gap-4 w-full text-left border-2 rounded-2xl px-5 py-4 font-body font-medium text-[0.9375rem] transition-all duration-150 active:scale-[0.99] ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 shadow-[0_0_0_3px_rgb(232_72_58_/_0.10)]'
                            : 'border-warm-200 bg-white hover:border-brand-300 hover:bg-brand-50/40'
                        }`}
                      >
                        <span className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-display font-bold text-sm transition-all ${
                          isSelected ? 'bg-brand-600 text-white shadow-brand-sm' : 'bg-warm-100 text-charcoal-500 group-hover:bg-brand-100 group-hover:text-brand-700'
                        }`}>
                          {optionLabel(i)}
                        </span>
                        <span className={`flex-1 leading-snug ${isSelected ? 'text-brand-800' : 'text-charcoal-700'}`}>{opt}</span>
                        {isSelected && (
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {selectedOption ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Answer selected
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Select an answer to continue (attempt mandatory)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleNext}
                    disabled={!selectedOption}
                    className={`flex items-center gap-2.5 ml-auto font-display font-semibold text-sm px-6 py-3 rounded-2xl text-white shadow-brand-sm active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLastItem ? 'bg-charcoal-900 hover:bg-charcoal-800' : 'bg-brand-600 hover:bg-brand-700'
                    }`}
                  >
                    {isLastItem ? 'Submit Assessment' : 'Next Question'}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {isLastItem ? <polyline points="20 6 9 17 4 12"/> : <><path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/></>}
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentItem.type === 'coding' && currentItem.coding && (
          <div className="w-full max-w-6xl flex-1 flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-[550px]">
              {/* Problem statement column */}
              <div className="bg-white border border-warm-200 rounded-3xl p-6 sm:p-7 flex flex-col shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-display font-semibold px-3 py-1 rounded-pill">
                    Coding Problem {currentIndex + 1} of {items.length}
                  </span>
                  <div className="flex items-center gap-1 bg-warm-100 p-1 rounded-xl">
                    <button onClick={() => setCodingTab('problem')} className={`px-3 py-1 rounded-lg text-xs font-display font-semibold transition-all ${codingTab === 'problem' ? 'bg-white text-charcoal-900 shadow-xs' : 'text-charcoal-500'}`}>
                      Problem
                    </button>
                    <button onClick={() => setCodingTab('testcases')} className={`px-3 py-1 rounded-lg text-xs font-display font-semibold transition-all ${codingTab === 'testcases' ? 'bg-white text-charcoal-900 shadow-xs' : 'text-charcoal-500'}`}>
                      Test Cases ({testRunResults.length > 0 ? `${testRunResults.filter(r => r.passed).length}/${testRunResults.length}` : 'Run'})
                    </button>
                  </div>
                </div>

                {codingTab === 'problem' ? (
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    <h2 className="font-display font-extrabold text-charcoal-900 text-xl leading-tight">
                      {currentItem.coding.title}
                    </h2>
                    <div className="text-charcoal-700 text-sm whitespace-pre-wrap leading-relaxed font-body">
                      {currentItem.coding.description}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                    <h3 className="font-display font-bold text-charcoal-900 text-sm">Public Test Cases</h3>
                    {testRunResults.length === 0 ? (
                      <p className="text-xs text-charcoal-400">Click "Run Tests" to test your code against public sample cases.</p>
                    ) : (
                      <div className="space-y-2">
                        {testRunResults.map((r, i) => (
                          <div key={i} className={`p-3 rounded-2xl border text-xs ${r.passed ? 'bg-green-50/70 border-green-200 text-green-800' : 'bg-red-50/70 border-red-200 text-red-800'}`}>
                            <div className="flex items-center justify-between font-bold mb-1">
                              <span>Case {i + 1}: {r.passed ? 'Passed ✓' : 'Failed ✗'}</span>
                              <span className="text-[10px] opacity-70">{r.time_ms}ms</span>
                            </div>
                            <div className="font-mono space-y-1 text-[11px]">
                              <div><span className="font-semibold opacity-80">Expected:</span> {r.expected_output}</div>
                              <div><span className="font-semibold opacity-80">Actual:</span> {r.actual_output || (r.error ? `Error: ${r.error}` : '(empty)')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-warm-100 flex items-center justify-between gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleTestRun}
                    disabled={isRunning}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-warm-300 hover:border-charcoal-900 bg-white font-display font-semibold text-xs text-charcoal-800 transition-all active:scale-[0.97]"
                  >
                    {isRunning ? 'Running…' : '▶ Run Public Tests'}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-xs text-white shadow-sm transition-all active:scale-[0.97] ${
                      isLastItem ? 'bg-charcoal-900 hover:bg-charcoal-800' : 'bg-brand-600 hover:bg-brand-700'
                    }`}
                  >
                    {isLastItem ? 'Submit Final Solution' : 'Save & Next Question →'}
                  </button>
                </div>
              </div>

              {/* Monaco Editor column */}
              <div className="bg-white border border-warm-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                <CodeEditor
                  language={langMap[currentItem.coding.id] || currentItem.coding.language_options[0] || 'python3'}
                  value={codeMap[currentItem.coding.id] || LANGUAGE_META[langMap[currentItem.coding.id] || 'python3'].defaultCode}
                  onChange={(val) => setCodeMap(prev => ({ ...prev, [currentItem.coding!.id]: val }))}
                  onLanguageChange={(lang) => {
                    setLangMap(prev => ({ ...prev, [currentItem.coding!.id]: lang }));
                    if (!codeMap[currentItem.coding!.id] || codeMap[currentItem.coding!.id].trim() === '') {
                      setCodeMap(prev => ({ ...prev, [currentItem.coding!.id]: LANGUAGE_META[lang].defaultCode }));
                    }
                  }}
                  availableLanguages={currentItem.coding.language_options}
                  height="100%"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}