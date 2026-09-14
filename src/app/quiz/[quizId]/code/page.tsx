'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import {
  Quiz, CodingQuestion, TestCase,
  CodingLanguage, LANGUAGE_META,
  TestCaseResult, ExecuteResponse,
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
        Loading editor…
      </div>
    </div>
  ),
});

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 14C6 7 12 3 20 2C28 1 42 4 45 14C48 24 44 38 36 44C28 50 14 46 8 38C2 30 6 21 6 14Z" fill="#e8483a"/>
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize="22" fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="-0.5">H</text>
    </svg>
  );
}

function FullPageState({ icon, title, subtitle }: {
  icon: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-dvh bg-[#fafaf9] overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true"
        style={{ backgroundImage: 'radial-gradient(circle, #ccc7c1 1px, transparent 1px)',
          backgroundSize: '24px 24px', opacity: 0.4 }}/>
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-[96px]"/>
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

function fmt(s: number) {
  if (s <= 0) return '00:00';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

function TestResultRow({ result, index }: { result: TestCaseResult; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
      result.passed ? 'border-green-200 bg-green-50/60' : 'border-red-200 bg-red-50/60'}`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-2.5">
          {result.passed ? (
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
          )}
          <span className={`font-display font-semibold text-sm ${result.passed ? 'text-green-800' : 'text-red-800'}`}>
            Case {index + 1} — {result.passed ? 'Passed' : result.error ? 'Error' : 'Wrong Answer'}
          </span>
          {result.time_ms != null && (
            <span className="text-xs text-charcoal-400 font-medium">{result.time_ms}ms</span>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 text-charcoal-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="border-t" style={{ borderColor: result.passed ? '#bbf7d0' : '#fecaca' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: result.passed ? '#bbf7d0' : '#fecaca' }}>
            <p className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider mb-1.5">Input</p>
            <pre className="font-mono text-xs text-charcoal-700 bg-white border border-warm-200 rounded-xl p-2.5 whitespace-pre-wrap break-all">{result.input || '(empty)'}</pre>
          </div>
          <div className="px-4 py-3 border-b" style={{ borderColor: result.passed ? '#bbf7d0' : '#fecaca' }}>
            <p className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider mb-1.5">Expected Output</p>
            <pre className="font-mono text-xs text-charcoal-700 bg-white border border-warm-200 rounded-xl p-2.5 whitespace-pre-wrap break-all">{result.expected_output}</pre>
          </div>
          <div className="px-4 py-3">
            <p className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider mb-1.5">
              {result.error ? 'Error' : 'Your Output'}
            </p>
            <pre className={`font-mono text-xs rounded-xl p-2.5 whitespace-pre-wrap break-all border ${
              result.error
                ? 'bg-red-50 text-red-700 border-red-200'
                : result.passed
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'}`}>
              {result.error ?? result.actual_output ?? '(no output)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CandidateCodePage() {
  const { quizId }         = useParams();
  const router             = useRouter();
  const { tabSwitchCount } = useAntiCheat();

  const pyodideRef = useRef<any>(null);

  useEffect(() => {
    const script    = document.createElement('script');
    script.src      = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
    script.async    = true;
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

  const [quiz,             setQuiz]            = useState<Quiz | null>(null);
  const [problems,         setProblems]        = useState<CodingQuestion[]>([]);
  const [allTestCases,     setAllTestCases]     = useState<Record<string, TestCase[]>>({});
  const [loading,          setLoading]         = useState(true);
  const [currentIdx,       setCurrentIdx]      = useState(0);
  const [codeMap,    setCodeMap]    = useState<Record<string, string>>({});
  const [langMap,    setLangMap]    = useState<Record<string, CodingLanguage>>({});
  const [activeTab,        setActiveTab]       = useState<'problem' | 'testcases'>('problem');
  const [testRunResults,   setTestRunResults]  = useState<TestCaseResult[]>([]);
  const [runSummary,       setRunSummary]      = useState<{ passed: number; total: number } | null>(null);
  const [isRunning,        setIsRunning]       = useState(false);
  const [isSubmitting,     setIsSubmitting]    = useState(false);
  const [runError,         setRunError]        = useState<string | null>(null);
  const [timeLeft,         setTimeLeft]        = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scoresRef = useRef<Record<string, number>>({});
  const currentProblem  = problems[currentIdx] ?? null;
  const isLastProblem   = currentIdx === problems.length - 1;
  const currentCode     = currentProblem ? (codeMap[currentProblem.id] ?? LANGUAGE_META[langMap[currentProblem.id] ?? 'python3'].defaultCode) : '';
  const currentLang     = currentProblem ? (langMap[currentProblem.id] ?? 'python3') : 'python3';
  const currentTestCases= currentProblem ? (allTestCases[currentProblem.id] ?? []) : [];
  const publicCases     = currentTestCases.filter(tc => tc.is_public);
  const setCurrentCode = useCallback((val: string) => {
    if (!currentProblem) return;
    setCodeMap(prev => ({ ...prev, [currentProblem.id]: val }));
    localStorage.setItem(`code_q_${currentProblem.id}`, val);
  }, [currentProblem]);

  const setCurrentLang = useCallback((lang: CodingLanguage) => {
    if (!currentProblem) return;
    setLangMap(prev => ({ ...prev, [currentProblem.id]: lang }));
    localStorage.setItem(`lang_q_${currentProblem.id}`, lang);
  }, [currentProblem]);

  const startTimer = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(seconds);
  }, []);

  useEffect(() => {
    const candidateName = localStorage.getItem(`candidate_name_${quizId}`);
    if (!candidateName) { router.push(`/quiz/${quizId}`); return; }

    (async () => {
      const { data: quizData } = await supabase
        .from('quizzes').select('*').eq('id', quizId).single();
      if (!quizData) { setLoading(false); return; }
      setQuiz(quizData);

      const { data: qData } = await supabase
        .from('coding_questions').select('*')
        .eq('quiz_id', quizId).order('created_at', { ascending: true });

      if (!qData || qData.length === 0) { setLoading(false); return; }
      setProblems(qData);

      const tcMap: Record<string, TestCase[]> = {};
      await Promise.all(qData.map(async (q) => {
        const { data: tcData } = await supabase
          .from('test_cases').select('*').eq('question_id', q.id);
        tcMap[q.id] = tcData ?? [];
      }));
      setAllTestCases(tcMap);

      const initCode: Record<string, string>         = {};
      const initLang: Record<string, CodingLanguage> = {};
      qData.forEach(q => {
        const savedLang = localStorage.getItem(`lang_q_${q.id}`) as CodingLanguage | null;
        const savedCode = localStorage.getItem(`code_q_${q.id}`);
        const lang      = (savedLang && q.language_options.includes(savedLang))
          ? savedLang : q.language_options[0] as CodingLanguage;
        initLang[q.id] = lang;
        initCode[q.id] = savedCode ?? LANGUAGE_META[lang].defaultCode;
      });
      setLangMap(initLang);
      setCodeMap(initCode);

      startTimer(qData[0].time_limit_seconds);
      setLoading(false);
    })();
  }, [quizId, router, startTimer]);


  const runOneCase = useCallback(async (
    lang:     CodingLanguage,
    code:     string,
    tc:       TestCase,
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
        pyodide.globals.set('_user_code', code);
        pyodide.globals.set('_stdin_data', tc.input);

        const result = await pyodide.runPythonAsync(`
          import sys
          from io import StringIO
          sys.stdin  = StringIO(_stdin_data)
          _out = StringIO()
          _err = StringIO()
          sys.stdout = _out
          sys.stderr = _err
          try:
              exec(_user_code, {})
          except Exception as _e:
              print(str(_e), file=_err)
          sys.stdout = sys.__stdout__
          sys.stderr = sys.__stderr__
          (_out.getvalue(), _err.getvalue())
        `);
        const [stdout, stderr] = result.toJs();
        actualRaw = stdout ?? '';
        if (stderr?.trim()) errorMsg = stderr.trim();

      } else {
        const workerSrc = `
        self.onmessage = function(e) {
          const { code, input } = e.data;
          const _lines = input.split('\\n');
          let _li = 0;
          const readline = () => _lines[_li++] ?? '';
          const _out = [];
          const _origLog = console.log;
          console.log = (...a) => _out.push(a.map(String).join(' '));
          try {
            eval(code);
            self.postMessage({ out: _out.join('\\n'), err: null });
          } catch(e) {
            self.postMessage({ out: '', err: e.toString() });
          } finally {
            console.log = _origLog;
          }
        };`;
        const blob   = new Blob([workerSrc], { type: 'application/javascript' });
        const url    = URL.createObjectURL(blob);
        const worker = new Worker(url);

        const { out, err } = await new Promise<{ out: string; err: string | null }>((resolve) => {
          const timer = setTimeout(() => {
            worker.terminate();
            resolve({ out: '', err: 'Time limit exceeded' });
          }, 5000);
          worker.onmessage = (ev) => {
            clearTimeout(timer);
            worker.terminate();
            resolve(ev.data);
          };
          worker.onerror = (ev) => {
            clearTimeout(timer);
            worker.terminate();
            resolve({ out: '', err: ev.message });
          };
          worker.postMessage({ code, input: tc.input });
        });

        URL.revokeObjectURL(url);
        actualRaw = out;
        if (err) errorMsg = err;
      }
    } catch (e: unknown) {
      errorMsg = e instanceof Error ? e.message : 'Execution error';
    }

    const passed = !errorMsg && normalize(actualRaw) === normalize(tc.expected_output);
    return {
      test_case_id:    tc.id,
      input:           tc.input,
      expected_output: tc.expected_output,
      actual_output:   actualRaw,
      passed,
      error:           errorMsg,
      time_ms:         Date.now() - start,
      is_public:       tc.is_public,
    };
  }, [getPyodide]);

  const executeCode = useCallback(async (
    mode:      'test' | 'submit',
    problem:   CodingQuestion,
    code:      string,
    lang:      CodingLanguage,
    testCases: TestCase[],
  ): Promise<ExecuteResponse | null> => {
    const cases = mode === 'test'
      ? testCases.filter(tc => tc.is_public)
      : testCases;

    if (cases.length === 0) {
      alert(mode === 'test' ? 'No public test cases to run.' : 'No test cases found.');
      return null;
    }

    const results: TestCaseResult[] = [];
    for (const tc of cases) {
      const r = await runOneCase(lang, code, tc);
      results.push(r);
    }

    const passed  = results.filter(r => r.passed).length;
    const total   = results.length;
    return { results, passed, total, success: passed === total && total > 0 };
  }, [runOneCase]);

  const handleTestRun = async () => {
    if (!currentProblem) return;
    setIsRunning(true);
    setRunError(null);
    setTestRunResults([]);
    setRunSummary(null);
    setActiveTab('testcases');
    try {
      const result = await executeCode('test', currentProblem, currentCode, currentLang, currentTestCases);
      if (result) {
        setTestRunResults(result.results);
        setRunSummary({ passed: result.passed, total: result.total });
      }
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : 'Execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleTimeUpRef = useRef<() => void>(() => {});

  const submitCurrentAndAdvance = useCallback(async (autoSubmit = false) => {
    if (!currentProblem) return;
    if (!autoSubmit && isLastProblem) {
      if (!confirm('Submit your final solution? This cannot be undone.')) return;
    }

    setIsSubmitting(true);
    setRunError(null);

    try {
      const result = await executeCode(
        'submit', currentProblem, currentCode, currentLang, currentTestCases,
      );
      scoresRef.current[currentProblem.id] = result?.passed ?? 0;

      if (isLastProblem) {
        const candidateName  = localStorage.getItem(`candidate_name_${quizId}`) ?? 'Unknown';
        const candidateEmail = localStorage.getItem(`candidate_email_${quizId}`) ?? null;
        const sentinelId     = localStorage.getItem(`result_id_${quizId}`) ?? null;
        const totalScore     = Object.values(scoresRef.current).reduce((a, b) => a + b, 0);
        const allResults: TestCaseResult[] = result?.results ?? [];

        const payload = {
          quiz_id:          quizId,
          candidate_name:   candidateName,
          candidate_email:  candidateEmail,
          score:            totalScore,
          answers:          {},
          tab_switch_count: tabSwitchCount,
          submission_type:  'coding',
          status:           'completed',
          code:             currentCode,
          language:         currentLang,
          test_results:     allResults,
        };

        if (sentinelId) {
          await supabase.from('results').update(payload).eq('id', sentinelId);
        } else {
          await supabase.from('results').insert([payload]);
        }

        problems.forEach(p => {
          localStorage.removeItem(`code_q_${p.id}`);
          localStorage.removeItem(`lang_q_${p.id}`);
        });
        localStorage.removeItem(`candidate_name_${quizId}`);
        localStorage.removeItem(`candidate_email_${quizId}`);
        localStorage.removeItem(`result_id_${quizId}`);
        if (timerRef.current) clearInterval(timerRef.current);

        router.push(`/quiz/${quizId}/success`);
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setTestRunResults([]);
        setRunSummary(null);
        setRunError(null);
        setActiveTab('problem');
        startTimer(problems[nextIdx].time_limit_seconds);
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setIsSubmitting(false);
    }
  }, [
    currentProblem, currentCode, currentLang, currentTestCases,
    isLastProblem, currentIdx, problems, quizId, tabSwitchCount,
    executeCode, router, startTimer,
  ]);

  const handleTimeUp = useCallback(() => {
    submitCurrentAndAdvance(true);
  }, [submitCurrentAndAdvance]);

  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp;
  }, [handleTimeUp]);

  useEffect(() => {
    if (loading || problems.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIdx, loading]);

  const isUrgent  = timeLeft <= 60;
  const isMedium  = timeLeft > 60 && timeLeft <= 300;

  if (loading) return (
    <FullPageState
      icon={<svg className="animate-spin text-brand-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
      title="Loading your assessment"
      subtitle="Setting up the coding environment — just a moment…"
    />
  );

  if (problems.length === 0) return (
    <FullPageState
      icon={<svg className="text-charcoal-400" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>}
      title="No problems found"
      subtitle="This assessment has no coding problems yet. Contact your recruiter."
    />
  );

  if (isSubmitting) return (
    <FullPageState
      icon={<svg className="animate-spin text-brand-600" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
      title={isLastProblem ? 'Submitting your solution…' : `Saving problem ${currentIdx + 1} — loading next…`}
      subtitle="Please wait, do not close or refresh this tab."
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: '#fafaf9' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 3, background: '#e2deda' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(to right, #e8483a, #2d2d2d)',
          width: `${((currentIdx) / Math.max(problems.length, 1)) * 100}%`,
          transition: 'width 0.5s ease',
        }}/>
      </div>

      <header style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 16px',
        marginTop: 3,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2deda',
        boxShadow: '0 1px 2px rgb(0 0 0 / 0.04)',
        zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <LogoMark size={24}/>
          <span className="font-display font-bold text-charcoal-900 text-sm hidden sm:block">HighOnSwift</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {problems.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif',
                flexShrink: 0,
                background: i === currentIdx ? '#e8483a'
                  : scoresRef.current[p.id] !== undefined ? '#22c55e'
                  : '#f5f4f2',
                color: i === currentIdx || scoresRef.current[p.id] !== undefined
                  ? '#ffffff' : '#6d6d6d',
                border: `2px solid ${i === currentIdx ? '#e8483a'
                  : scoresRef.current[p.id] !== undefined ? '#22c55e' : '#e2deda'}`,
              }}>
                {scoresRef.current[p.id] !== undefined ? '✓' : i + 1}
              </div>
              {i < problems.length - 1 && (
                <div style={{ width: 16, height: 2, background: scoresRef.current[p.id] !== undefined ? '#22c55e' : '#e2deda', borderRadius: 2 }}/>
              )}
            </div>
          ))}
          <span className="font-display font-semibold text-xs text-charcoal-400 ml-1">
            {currentIdx + 1} / {problems.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {tabSwitchCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-display font-semibold px-2.5 py-1.5 rounded-pill animate-fade-in">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
              {tabSwitchCount}
            </div>
          )}

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-display font-bold text-sm transition-all duration-300 ${
            isUrgent ? 'bg-red-50 border-red-300 text-red-600 animate-pulse-brand'
            : isMedium ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'bg-warm-50 border-warm-300 text-charcoal-700'}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span aria-live="polite" aria-label={`${fmt(timeLeft)} remaining for this problem`}>
              {fmt(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <div style={{
          width: '40%', minWidth: 300, maxWidth: 520,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #e2deda',
          background: '#ffffff',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          <div style={{
            flexShrink: 0,
            display: 'flex',
            borderBottom: '1px solid #e2deda',
            background: '#fafaf9',
          }}>
            {(['problem','testcases'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 16px',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: activeTab === tab ? '#e8483a' : '#888888',
                  borderBottom: `2px solid ${activeTab === tab ? '#e8483a' : 'transparent'}`,
                  background: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}>
                {tab === 'problem' ? 'Problem' : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Test Cases
                    {runSummary && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                        background: runSummary.passed === runSummary.total ? '#dcfce7' : '#fee2e2',
                        color:      runSummary.passed === runSummary.total ? '#15803d' : '#dc2626',
                      }}>
                        {runSummary.passed}/{runSummary.total}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

            {activeTab === 'problem' && currentProblem && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                <div>
                  <h2 className="font-display font-extrabold text-charcoal-900 text-xl leading-tight mb-2">
                    {currentProblem.title}
                  </h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {currentProblem.language_options.map(lang => (
                      <span key={lang} className="inline-flex items-center gap-1 text-xs font-display font-semibold bg-warm-100 border border-warm-200 text-charcoal-500 px-2.5 py-1 rounded-pill">
                        {LANGUAGE_META[lang].label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-charcoal-700 text-sm leading-relaxed whitespace-pre-wrap font-body">
                  {currentProblem.description}
                </div>

                {publicCases.length > 0 && (
                  <div>
                    <p className="font-display font-bold text-charcoal-800 text-sm mb-3">Sample Test Cases</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {publicCases.map((tc, i) => (
                        <div key={tc.id} style={{
                          background: '#f5f4f2',
                          border: '1px solid #e2deda',
                          borderRadius: 16,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            padding: '8px 16px',
                            borderBottom: '1px solid #e2deda',
                            background: '#eeece9',
                          }}>
                            <span className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider">
                              Example {i + 1}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                            <div style={{ padding: 12, borderRight: '1px solid #e2deda' }}>
                              <p className="font-display font-semibold text-[10px] text-charcoal-400 uppercase tracking-wider mb-1.5">Input</p>
                              <pre style={{
                                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                                fontSize: 12,
                                color: '#2d2d2d',
                                background: '#ffffff',
                                border: '1px solid #e2deda',
                                borderRadius: 8,
                                padding: 8,
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}>{tc.input || '(empty)'}</pre>
                            </div>
                            <div style={{ padding: 12 }}>
                              <p className="font-display font-semibold text-[10px] text-charcoal-400 uppercase tracking-wider mb-1.5">Output</p>
                              <pre style={{
                                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                                fontSize: 12,
                                color: '#2d2d2d',
                                background: '#ffffff',
                                border: '1px solid #e2deda',
                                borderRadius: 8,
                                padding: 8,
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                              }}>{tc.expected_output}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <svg width="13" height="13" className="mt-0.5 flex-shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4"/><path d="M12 17h.01"/>
                  </svg>
                  <p className="text-xs text-amber-700 leading-relaxed font-medium">
                    Do not switch tabs or refresh. Code auto-saves as you type. Timer is per-problem.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'testcases' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {isRunning ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <svg className="animate-spin text-brand-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    <p className="text-charcoal-500 text-sm font-medium">Running test cases…</p>
                  </div>
                ) : runError ? (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <svg width="15" height="15" className="mt-0.5 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div>
                      <p className="text-red-700 text-sm font-semibold mb-0.5">Execution Error</p>
                      <p className="text-red-600 text-xs leading-relaxed">{runError}</p>
                    </div>
                  </div>
                ) : testRunResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center mb-3 text-charcoal-300">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                    </div>
                    <p className="font-display font-bold text-charcoal-600 text-sm mb-1">No results yet</p>
                    <p className="text-charcoal-400 text-xs max-w-[200px]">
                      Click <span className="font-semibold">Test Run</span> to check sample cases.
                    </p>
                  </div>
                ) : (
                  <>
                    {runSummary && (
                      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                        runSummary.passed === runSummary.total
                          ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        {runSummary.passed === runSummary.total ? (
                          <svg width="16" height="16" className="text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="16" height="16" className="text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        )}
                        <div>
                          <p className={`font-display font-bold text-sm ${runSummary.passed === runSummary.total ? 'text-green-800' : 'text-red-800'}`}>
                            {runSummary.passed} / {runSummary.total} public cases passed
                          </p>
                          <p className={`text-xs font-medium mt-0.5 ${runSummary.passed === runSummary.total ? 'text-green-600' : 'text-red-600'}`}>
                            {runSummary.passed === runSummary.total
                              ? 'Great! Submit to check private cases.'
                              : 'Some cases failed — review and fix your code.'}
                          </p>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {testRunResults.map((r, i) => (
                        <TestResultRow key={r.test_case_id} result={r} index={i}/>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden', padding: '12px 12px 0 12px' }}>
            {currentProblem && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CodeEditor
                  language={currentLang}
                  value={currentCode}
                  onChange={setCurrentCode}
                  onLanguageChange={(lang) => {
                    setCurrentLang(lang);
                    setCurrentCode(LANGUAGE_META[lang].defaultCode);
                  }}
                  availableLanguages={currentProblem.language_options}
                  height="100%"
                />
              </div>
            )}
          </div>

          <div style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 16px',
            borderTop: '1px solid #e2deda',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(8px)',
          }}>
            <span className="font-mono text-xs text-charcoal-400 hidden sm:block">
              {currentCode.split('\n').length} lines
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              <button onClick={handleTestRun}
                disabled={isRunning || isSubmitting || !currentCode.trim()}
                className="flex items-center gap-2 bg-white hover:bg-warm-50 disabled:opacity-50 disabled:cursor-not-allowed text-charcoal-700 font-display font-semibold text-sm px-4 py-2.5 rounded-2xl border border-warm-300 hover:border-warm-400 shadow-xs hover:shadow-sm active:scale-[0.97] transition-all duration-200">
                {isRunning ? (
                  <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Running…</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>Test Run</>
                )}
              </button>

              <button onClick={() => submitCurrentAndAdvance(false)}
                disabled={isRunning || isSubmitting || !currentCode.trim()}
                className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white font-display font-semibold text-sm px-5 py-2.5 rounded-2xl shadow-brand-sm hover:shadow-brand-md active:scale-[0.97] transition-all duration-200"
                style={{ background: isLastProblem ? '#e8483a' : '#2d2d2d' }}>
                {isSubmitting ? (
                  <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  {isLastProblem ? 'Submitting…' : 'Saving…'}</>
                ) : isLastProblem ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Submit</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>Next Problem</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}