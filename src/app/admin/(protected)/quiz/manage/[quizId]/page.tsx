'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Question, Quiz, CodingQuestion, TestCase,
  CodingLanguage, LANGUAGE_META,
} from '@/lib/types';
import Link from 'next/link';

const OPTION_LABELS  = ['A', 'B', 'C', 'D'];
const ALL_LANGUAGES: CodingLanguage[] = ['python3', 'javascript'];
const TIME_PRESETS   = [600, 900, 1200, 1800, 2700, 3600];

function fmtSeconds(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m} min` : `${m}m ${r}s`;
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="flex items-center gap-2 text-charcoal-400 text-sm font-medium">
        <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading editor…
      </div>
    </div>
  );
}

function SuccessToast({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700
      text-sm font-medium rounded-2xl px-4 py-3 animate-fade-down">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {msg}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-down">
      <svg width="15" height="15" className="mt-0.5 flex-shrink-0 text-red-500" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="text-red-700 text-sm font-medium">{msg}</p>
    </div>
  );
}

function Field({ id, label, type='text', placeholder, value, onChange }: {
  id: string; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">
        {label}
      </label>
      <div className={`border-2 rounded-2xl bg-white transition-all duration-200 ${
        focused ? 'border-brand-400 shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)]'
                : 'border-warm-300 hover:border-warm-400'}`}>
        <input id={id} type={type} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="w-full px-4 py-3 text-sm font-body text-charcoal-900 placeholder:text-charcoal-400 bg-transparent rounded-2xl focus:outline-none"/>
      </div>
    </div>
  );
}

function TimeLimitPicker({ presets, value, onChange }: {
  presets: number[]; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap pt-1">
      <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider flex-shrink-0">
        Time Limit
      </label>
      {presets.map(t => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-xl text-xs font-display font-semibold border transition-all duration-150 ${
            value === t
              ? 'bg-brand-600 text-white border-brand-600 shadow-brand-sm'
              : 'bg-white text-charcoal-600 border-warm-300 hover:border-brand-300 hover:text-brand-600'
          }`}>
          {fmtSeconds(t)}
        </button>
      ))}
      <div className="flex items-center gap-1.5">
        <input type="number" min="30" value={value} onChange={e => onChange(Number(e.target.value))}
          className="w-20 text-center text-sm font-body font-medium text-charcoal-900 bg-white border-2 border-warm-300 rounded-xl px-2 py-1.5 focus:outline-none focus:border-brand-400 transition-colors"/>
        <span className="text-xs text-charcoal-400 font-medium">sec</span>
      </div>
    </div>
  );
}

function PageHeader({ quiz, questionCount, countLabel }: {
  quiz: Quiz; questionCount: number; countLabel: string;
}) {
  return (
    <div>
      <Link href="/admin/quiz/manage"
        className="inline-flex items-center gap-1.5 text-sm font-display font-semibold text-charcoal-500 hover:text-brand-600 mb-3 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>
        </svg>
        Back to Manage Quizzes
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight">
            {quiz.title}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-display font-semibold px-2.5 py-1 rounded-pill border ${
              quiz.type === 'coding'
                ? 'bg-brand-50 text-brand-700 border-brand-200'
                : 'bg-green-50 text-green-700 border-green-200'}`}>
              {quiz.type === 'coding'
                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/></svg>
              }
              {quiz.type === 'coding' ? 'Coding' : 'MCQ'}
            </span>
            {quiz.domain && (
              <span className="text-xs font-medium text-charcoal-400 bg-warm-100 border border-warm-200 px-2.5 py-1 rounded-pill">
                {quiz.domain}
              </span>
            )}
            <span className="text-charcoal-400 text-xs">·</span>
            <span className="text-charcoal-500 text-xs font-medium">{questionCount} {countLabel}</span>
            <span className="text-charcoal-400 text-xs">·</span>
            <span className="font-mono text-[10px] text-charcoal-400 bg-warm-100 border border-warm-200 px-2 py-0.5 rounded-lg">
              {quiz.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MCQEditor({ quiz, onCountChange }: {
  quiz: Quiz; onCountChange: (n: number) => void;
}) {
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [successMsg,  setSuccessMsg]  = useState(false);
  const [questionText,setQuestionText]= useState('');
  const [options,     setOptions]     = useState(['','','','']);
  const [correctIdx,  setCorrectIdx]  = useState(0);
  const [timeLimit,   setTimeLimit]   = useState(60);
  const [editingQ,    setEditingQ]    = useState<Question|null>(null);
  const [savingQ,     setSavingQ]     = useState(false);
  const [deletingQ,   setDeletingQ]   = useState<Question|null>(null);
  const [deletingQQ,  setDeletingQQ]  = useState(false);

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase.from('questions').select('*')
      .eq('quiz_id', quiz.id).order('created_at', { ascending: true });
    if (data) { setQuestions(data); onCountChange(data.length); }
  }, [quiz.id, onCountChange]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const updateOption = (i: number, v: string) => {
    const next = [...options]; next[i] = v; setOptions(next);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (options.some(o => !o.trim())) { alert('Fill in all 4 options.'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('questions').insert([{
      quiz_id: quiz.id, question_text: questionText, options,
      correct_answer: options[correctIdx], time_limit_seconds: timeLimit,
    }]);
    if (!error) {
      setQuestionText(''); setOptions(['','','','']); setCorrectIdx(0); setTimeLimit(60);
      setSuccessMsg(true); setTimeout(() => setSuccessMsg(false), 2500);
      await fetchQuestions();
    } else alert('Error: ' + error.message);
    setSubmitting(false);
  };

  const handleEditSave = async (updated: Partial<Question>) => {
    if (!editingQ) return;
    setSavingQ(true);
    const { error } = await supabase.from('questions').update(updated).eq('id', editingQ.id);
    if (error) alert('Error: ' + error.message);
    else { setEditingQ(null); await fetchQuestions(); }
    setSavingQ(false);
  };

  const handleDelete = async () => {
    if (!deletingQ) return;
    setDeletingQQ(true);
    const { error } = await supabase.from('questions').delete().eq('id', deletingQ.id);
    if (error) alert('Error: ' + error.message);
    else { setDeletingQ(null); await fetchQuestions(); }
    setDeletingQQ(false);
  };

  return (
    <div className="space-y-7">
      <div className="bg-white border border-warm-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700"/>
        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <h2 className="font-display font-bold text-charcoal-900 text-base">Add a New Question</h2>
          </div>
          {successMsg && <div className="mb-5"><SuccessToast msg="Question added!" /></div>}
          <form onSubmit={handleAdd} className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="q-text" className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">
                Question Text
              </label>
              <textarea id="q-text" required rows={3}
                placeholder="Type the question here…"
                value={questionText} onChange={e => setQuestionText(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl font-body text-sm text-charcoal-900 placeholder:text-charcoal-400 bg-white border-2 border-warm-300 hover:border-warm-400 focus:border-brand-400 focus:outline-none focus:shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)] resize-none transition-all duration-200"/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">Answer Options</label>
                <span className="text-xs text-charcoal-400 font-medium hidden sm:block">Click circle = correct answer</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {options.map((opt, i) => {
                  const isCorrect = correctIdx === i;
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-150 ${isCorrect ? 'border-green-400 bg-green-50' : 'border-warm-200 bg-white hover:border-warm-300'}`}>
                      <button type="button" onClick={() => setCorrectIdx(i)}
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${isCorrect ? 'border-green-500 bg-green-500' : 'border-warm-400 bg-white hover:border-green-400'}`}>
                        {isCorrect && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                      <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs ${isCorrect ? 'bg-green-500 text-white' : 'bg-warm-100 text-charcoal-500'}`}>{OPTION_LABELS[i]}</span>
                      <input required placeholder={`Option ${OPTION_LABELS[i]}`} value={opt}
                        onChange={e => updateOption(i, e.target.value)}
                        className={`flex-1 min-w-0 text-sm font-body bg-transparent focus:outline-none placeholder:text-charcoal-400 ${isCorrect ? 'text-green-800 font-semibold' : 'text-charcoal-800'}`}/>
                    </div>
                  );
                })}
              </div>
            </div>
            <TimeLimitPicker presets={[30,45,60,90,120]} value={timeLimit} onChange={setTimeLimit}/>
            <div className="pt-2">
              <button type="submit" disabled={submitting}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-display font-semibold text-sm px-6 py-3 rounded-2xl shadow-brand-sm hover:shadow-brand-md active:scale-[0.97] transition-all duration-200">
                {submitting
                  ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Adding…</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Question</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-charcoal-900 text-base">
            Questions
            <span className="ml-2 text-xs font-semibold text-charcoal-400 bg-warm-100 border border-warm-200 px-2 py-0.5 rounded-pill">{questions.length}</span>
          </h2>
        </div>
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center bg-white border border-warm-200 border-dashed rounded-3xl">
            <p className="font-display font-bold text-charcoal-600 text-sm mb-1">No questions yet</p>
            <p className="text-charcoal-400 text-xs">Use the form above to add the first question.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white border border-warm-200 rounded-2xl shadow-xs hover:shadow-sm hover:border-warm-300 transition-all duration-200 overflow-hidden animate-fade-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <div className="flex items-start gap-3 p-5 pb-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-brand-100 text-brand-700 font-display font-bold text-xs flex items-center justify-center mt-0.5">{idx+1}</span>
                  <p className="font-display font-semibold text-charcoal-900 text-sm leading-snug flex-1">{q.question_text}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-5 pb-4">
                  {q.options.map((opt, i) => {
                    const isCorrect = opt === q.correct_answer;
                    return (
                      <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm ${isCorrect ? 'bg-green-50 border border-green-200 text-green-800 font-semibold' : 'bg-warm-50 border border-warm-200 text-charcoal-600'}`}>
                        <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-display font-bold text-xs ${isCorrect ? 'bg-green-500 text-white' : 'bg-warm-100 text-charcoal-500'}`}>{OPTION_LABELS[i]}</span>
                        <span className="flex-1 leading-snug">{opt}</span>
                        {isCorrect && <svg width="13" height="13" className="flex-shrink-0 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-warm-100 bg-warm-50/60">
                  <span className="flex items-center gap-1.5 text-xs text-charcoal-400 font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {q.time_limit_seconds}s limit
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingQ(q)} className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl bg-white text-charcoal-600 hover:bg-warm-100 border border-warm-200 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button onClick={() => setDeletingQ(q)} className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl bg-white text-red-500 hover:bg-red-50 hover:text-red-600 border border-warm-200 hover:border-red-200 transition-all duration-200">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="absolute inset-0 bg-charcoal-950/50 backdrop-blur-sm" onClick={() => !savingQ && setEditingQ(null)}/>
          <div className="relative z-10 w-full max-w-lg my-auto bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700"/>
            <MCQEditForm question={editingQ} onCancel={() => setEditingQ(null)} onSave={handleEditSave} saving={savingQ}/>
          </div>
        </div>
      )}
      {deletingQ && (
        <ConfirmDeleteModal
          title="Delete Question?"
          body={`"${deletingQ.question_text}"`}
          onCancel={() => setDeletingQ(null)}
          onConfirm={handleDelete}
          deleting={deletingQQ}/>
      )}
    </div>
  );
}

function MCQEditForm({ question, onCancel, onSave, saving }: {
  question: Question; onCancel: () => void;
  onSave: (u: Partial<Question>) => void; saving: boolean;
}) {
  const [text,   setText]   = useState(question.question_text);
  const [opts,   setOpts]   = useState([...question.options]);
  const [ci,     setCi]     = useState(question.options.indexOf(question.correct_answer));
  const [tl,     setTl]     = useState(question.time_limit_seconds);
  const [err,    setErr]    = useState('');
  const updateOpt = (i: number, v: string) => { const n=[...opts]; n[i]=v; setOpts(n); };
  const save = () => {
    if (!text.trim()) { setErr('Question text cannot be empty.'); return; }
    if (opts.some(o => !o.trim())) { setErr('All 4 options must be filled.'); return; }
    setErr('');
    onSave({ question_text: text, options: opts, correct_answer: opts[ci], time_limit_seconds: tl });
  };
  return (
    <div className="p-6 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-bold text-charcoal-900 text-lg">Edit Question</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-600 hover:bg-warm-100 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      {err && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4 text-xs text-red-700 font-medium">{err}</div>}
      <div className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">Question Text</label>
          <textarea rows={3} value={text} onChange={e => setText(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl font-body text-sm text-charcoal-900 bg-white border-2 border-warm-300 hover:border-warm-400 focus:border-brand-400 focus:outline-none resize-none transition-all duration-200"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {opts.map((opt, i) => {
            const ic = ci === i;
            return (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-150 ${ic ? 'border-green-400 bg-green-50' : 'border-warm-200 bg-white hover:border-warm-300'}`}>
                <button type="button" onClick={() => setCi(i)} className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${ic ? 'border-green-500 bg-green-500' : 'border-warm-400 bg-white hover:border-green-400'}`}>
                  {ic && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
                <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center font-display font-bold text-xs ${ic ? 'bg-green-500 text-white' : 'bg-warm-100 text-charcoal-500'}`}>{OPTION_LABELS[i]}</span>
                <input value={opt} onChange={e => updateOpt(i, e.target.value)} className={`flex-1 min-w-0 text-sm font-body bg-transparent focus:outline-none ${ic ? 'text-green-800 font-semibold' : 'text-charcoal-800'}`}/>
              </div>
            );
          })}
        </div>
        <TimeLimitPicker presets={[30,45,60,90,120]} value={tl} onChange={setTl}/>
      </div>
      <div className="flex gap-2.5 mt-6">
        <button onClick={onCancel} disabled={saving} className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors disabled:opacity-50">Cancel</button>
        <button onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-display font-semibold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-brand-sm active:scale-[0.97] transition-all disabled:opacity-50">
          {saving ? <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving…</> : <>Save Changes</>}
        </button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ title, body, onCancel, onConfirm, deleting }: {
  title: string; body: string; onCancel: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="absolute inset-0 bg-charcoal-950/50 backdrop-blur-sm" onClick={() => !deleting && onCancel()}/>
      <div className="relative z-10 w-full max-w-sm my-auto bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-red-400 to-red-600"/>
        <div className="p-6 overflow-y-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" className="text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <h3 className="font-display font-bold text-charcoal-900 text-lg text-center mb-2">{title}</h3>
          <p className="text-charcoal-500 text-sm text-center leading-relaxed mb-5 line-clamp-2 px-2">{body}</p>
          <div className="flex gap-2.5">
            <button onClick={onCancel} disabled={deleting} className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors disabled:opacity-50">Cancel</button>
            <button onClick={onConfirm} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-display font-semibold text-sm bg-red-600 hover:bg-red-700 !text-white hover:!text-white transition-all disabled:opacity-50 active:scale-[0.97]">
              {deleting ? <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Deleting…</> : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestCaseRow({ tc, onDelete }: { tc: TestCase; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-warm-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 text-xs font-display font-semibold px-2 py-0.5 rounded-pill border flex-shrink-0 ${tc.is_public ? 'bg-green-100 text-green-700 border-green-200' : 'bg-charcoal-100 text-charcoal-600 border-charcoal-200'}`}>
            {tc.is_public ? 'Public' : 'Private'}
          </span>
          <span className="font-mono text-xs text-charcoal-500 truncate">
            Input: {tc.input.slice(0,40)}{tc.input.length>40?'…':''}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setExpanded(e => !e)} className="inline-flex items-center gap-1 text-xs font-display font-semibold px-2.5 py-1.5 rounded-xl bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors">
            {expanded ? 'Hide' : 'View'}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 border border-warm-200 hover:border-red-200 transition-all duration-150">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-warm-100 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-warm-100">
          <div className="p-4">
            <p className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider mb-2">Input</p>
            <pre className="font-mono text-xs text-charcoal-700 bg-warm-50 border border-warm-200 rounded-xl p-3 whitespace-pre-wrap break-all">{tc.input||'(empty)'}</pre>
          </div>
          <div className="p-4">
            <p className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider mb-2">Expected Output</p>
            <pre className="font-mono text-xs text-charcoal-700 bg-warm-50 border border-warm-200 rounded-xl p-3 whitespace-pre-wrap break-all">{tc.expected_output}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function CodingProblemCard({ problem, index, onDeleted, onUpdated }: {
  problem: CodingQuestion;
  index: number;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [testCases,     setTestCases]     = useState<TestCase[]>([]);
  const [expanded,      setExpanded]      = useState(false);
  const [activeTab,     setActiveTab]     = useState<'public'|'private'>('public');
  const [tcInput,       setTcInput]       = useState('');
  const [tcExpected,    setTcExpected]    = useState('');
  const [tcPublic,      setTcPublic]      = useState(true);
  const [addingTc,      setAddingTc]      = useState(false);
  const [tcSuccess,     setTcSuccess]     = useState(false);
  const [editing,       setEditing]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  const [eTitle, setETitle]   = useState(problem.title);
  const [eDesc,  setEDesc]    = useState(problem.description);
  const [eLangs, setELangs]   = useState<CodingLanguage[]>(problem.language_options);
  const [eTl,    setETl]      = useState(problem.time_limit_seconds);
  const [saving, setSaving]   = useState(false);
  const [pErr,   setPErr]     = useState('');

  const fetchTestCases = useCallback(async () => {
    const { data } = await supabase.from('test_cases').select('*')
      .eq('question_id', problem.id).order('created_at', { ascending: true });
    if (data) setTestCases(data);
  }, [problem.id]);

  useEffect(() => { if (expanded) fetchTestCases(); }, [expanded, fetchTestCases]);

  const toggleLang = (lang: CodingLanguage) =>
    setELangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);

  const handleSaveEdit = async () => {
    if (!eTitle.trim()) { setPErr('Title is required.'); return; }
    if (!eDesc.trim())  { setPErr('Description is required.'); return; }
    if (eLangs.length === 0) { setPErr('Select at least one language.'); return; }
    setPErr(''); setSaving(true);
    const { error } = await supabase.from('coding_questions')
      .update({ title: eTitle, description: eDesc, language_options: eLangs, time_limit_seconds: eTl })
      .eq('id', problem.id);
    setSaving(false);
    if (error) { setPErr(error.message); return; }
    setEditing(false);
    onUpdated();
  };

  const handleDeleteProblem = async () => {
    setDeleting(true);
    await supabase.from('test_cases').delete().eq('question_id', problem.id);
    await supabase.from('coding_questions').delete().eq('id', problem.id);
    setDeleting(false);
    onDeleted();
  };

  const handleAddTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tcInput.trim() || !tcExpected.trim()) { alert('Input and expected output are required.'); return; }
    setAddingTc(true);
    const { error } = await supabase.from('test_cases').insert([{
      question_id: problem.id, input: tcInput,
      expected_output: tcExpected, is_public: tcPublic,
    }]);
    if (!error) {
      setTcInput(''); setTcExpected('');
      setTcSuccess(true); setTimeout(() => setTcSuccess(false), 2500);
      await fetchTestCases();
    } else alert('Error: ' + error.message);
    setAddingTc(false);
  };

  const handleDeleteTestCase = async (tcId: string) => {
    await supabase.from('test_cases').delete().eq('id', tcId);
    await fetchTestCases();
  };

  const publicCases  = testCases.filter(tc =>  tc.is_public);
  const privateCases = testCases.filter(tc => !tc.is_public);

  return (
    <div className="bg-white border border-warm-200 rounded-2xl shadow-xs overflow-hidden animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>

      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-100 text-brand-700 font-display font-bold text-sm flex items-center justify-center mt-0.5">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display font-bold text-charcoal-900 text-base leading-snug truncate">{problem.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-charcoal-400 font-medium">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {fmtSeconds(problem.time_limit_seconds)}
              </span>
              {problem.language_options.map(l => (
                <span key={l} className="text-xs font-display font-semibold bg-warm-100 border border-warm-200 text-charcoal-500 px-2 py-0.5 rounded-pill">
                  {LANGUAGE_META[l].label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl bg-white text-charcoal-600 hover:bg-warm-100 border border-warm-200 transition-colors">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl bg-white text-red-500 hover:bg-red-50 hover:text-red-600 border border-warm-200 hover:border-red-200 transition-all duration-200">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Delete
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white border border-transparent transition-all duration-200 shadow-xs">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            {expanded ? 'Hide Test Cases' : 'Manage Test Cases'}
          </button>
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="text-charcoal-500 text-xs leading-relaxed line-clamp-2">{problem.description}</p>
      </div>

      {expanded && (
        <div className="border-t border-warm-200 bg-warm-50/40 p-5 space-y-5">

          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <svg width="13" height="13" className="mt-0.5 flex-shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <p className="text-amber-700 text-xs leading-relaxed font-medium">
              <span className="font-bold">Public</span> cases shown during Test Run.{' '}
              <span className="font-bold">Private</span> cases only checked on Submit.
            </p>
          </div>

          <form onSubmit={handleAddTestCase} className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">Add Test Case</label>
              {(['public','private'] as const).map(v => (
                <button key={v} type="button" onClick={() => setTcPublic(v==='public')}
                  className={`px-3 py-1 rounded-xl text-xs font-display font-semibold border transition-all duration-150 ${
                    (v==='public') === tcPublic
                      ? v==='public' ? 'bg-green-600 text-white border-green-600' : 'bg-charcoal-800 text-white border-charcoal-800'
                      : 'bg-white text-charcoal-500 border-warm-200 hover:border-warm-300'
                  }`}>
                  {v==='public' ? '👁 Public' : '🔒 Private'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider">stdin Input</label>
                <textarea required rows={3} placeholder={"3\n1"} value={tcInput} onChange={e => setTcInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl font-mono text-sm text-charcoal-900 placeholder:text-charcoal-400 bg-white border-2 border-warm-300 hover:border-warm-400 focus:border-brand-400 focus:outline-none resize-none transition-all duration-200"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-display font-semibold text-xs text-charcoal-500 uppercase tracking-wider">Expected Output</label>
                <textarea required rows={3} placeholder={"1"} value={tcExpected} onChange={e => setTcExpected(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl font-mono text-sm text-charcoal-900 placeholder:text-charcoal-400 bg-white border-2 border-warm-300 hover:border-warm-400 focus:border-brand-400 focus:outline-none resize-none transition-all duration-200"/>
              </div>
            </div>
            {tcSuccess && <SuccessToast msg="Test case added!" />}
            <button type="submit" disabled={addingTc}
              className="inline-flex items-center gap-2 bg-charcoal-900 hover:bg-charcoal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-display font-semibold text-sm px-5 py-2.5 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200">
              {addingTc
                ? <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Adding…</>
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add {tcPublic?'Public':'Private'} Test Case</>
              }
            </button>
          </form>

          <div>
            <div className="flex items-center gap-1 bg-warm-100 border border-warm-200 rounded-xl p-1 mb-3 w-fit">
              {(['public','private'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-display font-semibold capitalize transition-all duration-150 ${activeTab===tab ? 'bg-white text-charcoal-900 shadow-xs' : 'text-charcoal-500 hover:text-charcoal-700'}`}>
                  {tab==='public'?'👁 Public':'🔒 Private'}{' '}
                  <span className="opacity-60">({tab==='public'?publicCases.length:privateCases.length})</span>
                </button>
              ))}
            </div>
            {(activeTab==='public' ? publicCases : privateCases).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-white border border-warm-200 border-dashed rounded-2xl">
                <p className="font-display font-bold text-charcoal-500 text-sm mb-1">No {activeTab} test cases</p>
                <p className="text-charcoal-400 text-xs">Add one using the form above.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(activeTab==='public'?publicCases:privateCases).map(tc => (
                  <TestCaseRow key={tc.id} tc={tc} onDelete={() => handleDeleteTestCase(tc.id)}/>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="absolute inset-0 bg-charcoal-950/50 backdrop-blur-sm" onClick={() => !saving && setEditing(false)}/>
          <div className="relative z-10 w-full max-w-lg my-auto bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700"/>
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-charcoal-900 text-lg">Edit Problem</h3>
                <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-600 hover:bg-warm-100 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              {pErr && <div className="mb-4"><ErrorBanner msg={pErr}/></div>}
              <div className="space-y-5">
                <Field id="e-title" label="Problem Title" value={eTitle} onChange={setETitle}/>
                <div className="flex flex-col gap-1.5">
                  <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">Description</label>
                  <textarea rows={6} value={eDesc} onChange={e => setEDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl font-body text-sm text-charcoal-900 bg-white border-2 border-warm-300 hover:border-warm-400 focus:border-brand-400 focus:outline-none resize-y transition-all duration-200"/>
                </div>
                <div>
                  <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider block mb-2.5">Allowed Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_LANGUAGES.map(lang => {
                      const active = eLangs.includes(lang);
                      return (
                        <button key={lang} type="button" onClick={() => toggleLang(lang)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-display font-semibold text-sm transition-all duration-150 ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-warm-200 bg-white text-charcoal-500 hover:border-warm-300'}`}>
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-brand-600 border-brand-600' : 'border-warm-400'}`}>
                            {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </span>
                          {LANGUAGE_META[lang].label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <TimeLimitPicker presets={TIME_PRESETS} value={eTl} onChange={setETl}/>
              </div>
              <div className="flex gap-2.5 mt-6">
                <button onClick={() => setEditing(false)} disabled={saving} className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-display font-semibold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-brand-sm active:scale-[0.97] transition-all disabled:opacity-50">
                  {saving ? <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving…</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          title="Delete Problem?"
          body={`This will permanently delete "${problem.title}" and all its test cases.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDeleteProblem}
          deleting={deleting}
        />
      )}
    </div>
  );
}

function CodingEditor({ quiz, onCountChange }: {
  quiz: Quiz; onCountChange: (n: number) => void;
}) {
  const [problems,     setProblems]     = useState<CodingQuestion[]>([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [pTitle,       setPTitle]       = useState('');
  const [pDesc,        setPDesc]        = useState('');
  const [pLangs,       setPLangs]       = useState<CodingLanguage[]>(['python3','javascript']);
  const [pTl,          setPTl]          = useState(1800);
  const [saving,       setSaving]       = useState(false);
  const [successMsg,   setSuccessMsg]   = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');

  const fetchProblems = useCallback(async () => {
    const { data } = await supabase.from('coding_questions').select('*')
      .eq('quiz_id', quiz.id).order('created_at', { ascending: true });
    if (data) { setProblems(data); onCountChange(data.length); }
    setLoadingData(false);
  }, [quiz.id, onCountChange]);

  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const toggleLang = (lang: CodingLanguage) =>
    setPLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!pTitle.trim())      { setErrorMsg('Problem title is required.'); return; }
    if (!pDesc.trim())       { setErrorMsg('Problem description is required.'); return; }
    if (pLangs.length === 0) { setErrorMsg('Select at least one language.'); return; }
    setSaving(true);
    const { error } = await supabase.from('coding_questions').insert([{
      quiz_id: quiz.id, title: pTitle, description: pDesc,
      language_options: pLangs, time_limit_seconds: pTl,
    }]);
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    setPTitle(''); setPDesc(''); setPLangs(['python3','javascript']); setPTl(1800);
    setSuccessMsg(true); setTimeout(() => setSuccessMsg(false), 2500);
    await fetchProblems();
  };

  if (loadingData) return <LoadingState/>;

  return (
    <div className="space-y-6">

      <div className="bg-white border border-warm-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700"/>
        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <div>
              <h2 className="font-display font-bold text-charcoal-900 text-base leading-tight">Add a New Coding Problem</h2>
              <p className="text-charcoal-400 text-xs">You can add multiple problems to this assessment.</p>
            </div>
          </div>

          {successMsg && <div className="mb-5"><SuccessToast msg="Problem added! Now expand it below to add test cases."/></div>}
          {errorMsg   && <div className="mb-5"><ErrorBanner msg={errorMsg}/></div>}

          <form onSubmit={handleAddProblem} className="space-y-5">
            <Field id="p-title" label="Problem Title" placeholder="e.g. Grid Symbols" value={pTitle} onChange={setPTitle}/>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="p-desc" className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">Problem Description</label>
              <textarea id="p-desc" required rows={7}
                placeholder={`Describe the problem.\n\nInclude:\n• Problem statement\n• Input format\n• Output format\n• Constraints\n• Example(s)`}
                value={pDesc} onChange={e => setPDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl font-body text-sm text-charcoal-900 placeholder:text-charcoal-400 bg-white border-2 border-warm-300 hover:border-warm-400 focus:border-brand-400 focus:outline-none focus:shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)] resize-y transition-all duration-200"/>
              <p className="text-xs text-charcoal-400">Candidates read this on the assessment page.</p>
            </div>
            <div>
              <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider block mb-2.5">Allowed Languages</label>
              <div className="flex flex-wrap gap-2">
                {ALL_LANGUAGES.map(lang => {
                  const active = pLangs.includes(lang);
                  return (
                    <button key={lang} type="button" onClick={() => toggleLang(lang)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-display font-semibold text-sm transition-all duration-150 ${active ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-[0_0_0_3px_rgb(232_72_58_/_0.08)]' : 'border-warm-200 bg-white text-charcoal-500 hover:border-warm-300'}`}>
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-brand-600 border-brand-600' : 'border-warm-400'}`}>
                        {active && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </span>
                      {LANGUAGE_META[lang].label}
                    </button>
                  );
                })}
              </div>
              {pLangs.length === 0 && <p className="text-xs text-red-500 mt-1.5">Select at least one language.</p>}
            </div>
            <TimeLimitPicker presets={TIME_PRESETS} value={pTl} onChange={setPTl}/>
            <div className="pt-2">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-display font-semibold text-sm px-6 py-3 rounded-2xl shadow-brand-sm hover:shadow-brand-md active:scale-[0.97] transition-all duration-200">
                {saving
                  ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Adding…</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add Problem</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-charcoal-900 text-base">
            Problems
            <span className="ml-2 text-xs font-semibold text-charcoal-400 bg-warm-100 border border-warm-200 px-2 py-0.5 rounded-pill">{problems.length}</span>
          </h2>
        </div>

        {problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center bg-white border border-warm-200 border-dashed rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center mb-3 text-charcoal-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <p className="font-display font-bold text-charcoal-600 text-sm mb-1">No problems yet</p>
            <p className="text-charcoal-400 text-xs max-w-xs">Use the form above to add the first coding problem.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {problems.map((p, i) => (
              <CodingProblemCard
                key={p.id} problem={p} index={i}
                onDeleted={fetchProblems}
                onUpdated={fetchProblems}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizQuestionEditor() {
  const { quizId } = useParams();
  const [quiz,          setQuiz]         = useState<Quiz|null>(null);
  const [loading,       setLoading]      = useState(true);
  const [questionCount, setQuestionCount]= useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
      if (data) setQuiz(data);
      setLoading(false);
    })();
  }, [quizId]);

  if (loading) return <LoadingState/>;
  if (!quiz)   return <div className="flex items-center justify-center h-48 text-charcoal-400 text-sm">Quiz not found.</div>;

  const countLabel = quiz.type === 'coding'
    ? `${questionCount} problem${questionCount !== 1 ? 's' : ''}`
    : `${questionCount} question${questionCount !== 1 ? 's' : ''}`;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-7 animate-fade-up">
      <PageHeader quiz={quiz} questionCount={questionCount} countLabel={countLabel}/>
      {quiz.type === 'coding'
        ? <CodingEditor quiz={quiz} onCountChange={setQuestionCount}/>
        : <MCQEditor    quiz={quiz} onCountChange={setQuestionCount}/>
      }
    </div>
  );
}