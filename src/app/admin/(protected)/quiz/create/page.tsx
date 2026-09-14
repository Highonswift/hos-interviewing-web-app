'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { QuizType } from '@/lib/types';

/* ─── Type selection card ────────────────────────────────────────────────── */
function TypeCard({
  selected, type, title, description, icon, onClick,
}: {
  selected: boolean;
  type: QuizType;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex items-start gap-4 w-full text-left
        p-4 rounded-2xl border-2 transition-all duration-200
        ${selected
          ? 'border-brand-500 bg-brand-50 shadow-[0_0_0_3px_rgb(232_72_58_/_0.10)]'
          : 'border-warm-200 bg-white hover:border-warm-300 hover:bg-warm-50'
        }
      `}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5
        transition-colors duration-200
        ${selected ? 'bg-brand-600 text-white shadow-brand-sm' : 'bg-warm-100 text-charcoal-500'}
      `}>
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`font-display font-bold text-sm mb-0.5 ${selected ? 'text-brand-800' : 'text-charcoal-900'}`}>
          {title}
        </p>
        <p className={`text-xs leading-relaxed ${selected ? 'text-brand-600' : 'text-charcoal-400'}`}>
          {description}
        </p>
      </div>

      {/* Selected indicator */}
      <div className={`
        flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
        transition-all duration-150
        ${selected ? 'border-brand-500 bg-brand-500' : 'border-warm-300 bg-white'}
      `}>
        {selected && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
    </button>
  );
}

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({
  id, label, type = 'text', placeholder, value, onChange, hint,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">
        {label}
      </label>
      <div className={`
        border-2 rounded-2xl bg-white transition-all duration-200
        ${focused
          ? 'border-brand-400 shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)]'
          : 'border-warm-300 hover:border-warm-400'
        }
      `}>
        <input
          id={id} type={type} required
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-4 py-3 text-sm font-body text-charcoal-900 placeholder:text-charcoal-400 bg-transparent rounded-2xl focus:outline-none"
        />
      </div>
      {hint && <p className="text-xs text-charcoal-400">{hint}</p>}
    </div>
  );
}

/* ─── Tip card ───────────────────────────────────────────────────────────── */
function TipCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div>
        <p className="font-display font-semibold text-charcoal-700 text-sm">{title}</p>
        <p className="text-charcoal-400 text-xs leading-relaxed mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* ─── Tips config ────────────────────────────────────────────────────────── */
const TIPS: Record<QuizType, { icon: string; title: string; desc: string }[]> = {
  mcq: [
    { icon: '🎯', title: 'Be specific with titles',   desc: 'Candidates see the quiz title before starting — make it clear and role-specific.' },
    { icon: '⏰', title: 'Set a realistic window',    desc: 'Allow enough time for all invited candidates to complete the quiz.' },
    { icon: '🔗', title: 'Copy link after creating',  desc: 'Share the unique quiz link with candidates via email or recruiter chat.' },
  ],
  coding: [
    { icon: '💡', title: 'Write a clear problem',     desc: 'Include examples, constraints, and expected input/output format in the question.' },
    { icon: '🔒', title: 'Use private test cases',    desc: 'Candidates see public cases during Test Run. Private cases only run on Submit.' },
    { icon: '🌐', title: 'Pick languages wisely',     desc: 'Offer Python3 for general roles; add JavaScript for domain-specific assessments.' },
  ],
  mixed: [
    { icon: '🔀', title: 'Mix question types freely',  desc: 'Add MCQ and coding questions in any order — candidates see them sequentially.' },
    { icon: '⏱️', title: 'Total time auto-calculated', desc: 'Assessment duration is the sum of all individual question time limits.' },
    { icon: '🖼️', title: 'Add images to MCQs',        desc: 'Attach diagrams or figures to aptitude-style MCQ questions for visual context.' },
  ],
};

const STEPS: Record<QuizType, { label: string }[]> = {
  mcq: [
    { label: 'Fill in quiz details'      },
    { label: 'Add MCQ questions'         },
    { label: 'Share link with candidates'},
  ],
  coding: [
    { label: 'Fill in quiz details'            },
    { label: 'Add coding question + test cases'},
    { label: 'Share link with candidates'      },
  ],
  mixed: [
    { label: 'Fill in quiz details'             },
    { label: 'Add MCQ & coding questions'       },
    { label: 'Share link with candidates'       },
  ],
};

function generateShortCode(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let res = '';
  for (let i = 0; i < 6; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function getLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function CreateQuizPage() {
  const router = useRouter();

  const [quizType,    setQuizType]    = useState<QuizType>('mcq');
  const [title,       setTitle]       = useState('');
  const [domain,      setDomain]      = useState('');

  // Default times in candidate's local time: now and +2 hours
  const [activeFrom,  setActiveFrom]  = useState(() => {
    const now = new Date();
    return getLocalDatetimeString(now);
  });
  const [activeUntil, setActiveUntil] = useState(() => {
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    return getLocalDatetimeString(later);
  });
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/admin/login'); return; }

    const from  = new Date(activeFrom);
    const until = new Date(activeUntil);

    if (until <= from) {
      setError('"Active Until" must be after "Active From".');
      setCreating(false);
      return;
    }

    const shortCode = generateShortCode();

    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        title,
        domain,
        type:         quizType,
        active_from:  from.toISOString(),
        active_until: until.toISOString(),
        admin_id:     session.user.id,
        short_code:   shortCode,
      }])
      .select();

    if (error || !data) {
      setError(error?.message ?? 'Failed to create quiz.');
      setCreating(false);
    } else {
      // Both MCQ and Coding go to the same manage/[quizId] page
      // That page detects the type and shows the right editor
      router.push(`/admin/quiz/manage/${data[0].id}`);
    }
  };

  const windowValid = activeFrom && activeUntil && new Date(activeUntil) > new Date(activeFrom);

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-up">

      {/* ── Page header ── */}
      <div className="mb-7">
        <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight">
          Create New Quiz
        </h1>
        <p className="text-charcoal-500 text-sm mt-0.5">
          Set up a new assessment — you'll add questions on the next step.
        </p>
      </div>

      <div>
        {/* ── Form ── */}
        <div className="w-full">
          <div className="bg-white border border-warm-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />

            <form onSubmit={handleCreate} className="p-6 sm:p-8 space-y-6">

              {/* ── Assessment type selector ── */}
              <div>
                <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider block mb-3">
                  Assessment Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <TypeCard
                    type="mcq"
                    selected={quizType === 'mcq'}
                    onClick={() => setQuizType('mcq')}
                    title="MCQ Assessment"
                    description="Multiple choice questions with optional images, each with a per-question timer."
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 11l3 3L22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                    }
                  />
                  <TypeCard
                    type="coding"
                    selected={quizType === 'coding'}
                    onClick={() => setQuizType('coding')}
                    title="Coding Assessment"
                    description="Live code editor with public & private test cases and multi-language support."
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6"/>
                        <polyline points="8 6 2 12 8 18"/>
                      </svg>
                    }
                  />
                  <TypeCard
                    type="mixed"
                    selected={quizType === 'mixed'}
                    onClick={() => setQuizType('mixed')}
                    title="Mixed Assessment"
                    description="Combine MCQ and coding questions in any order in a single assessment."
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                        <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                      </svg>
                    }
                  />
                </div>

                {/* Type badge confirmation */}
                <div className={`
                  mt-3 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium
                  ${quizType === 'coding'
                    ? 'bg-brand-50 border border-brand-100 text-brand-700'
                    : quizType === 'mixed'
                    ? 'bg-purple-50 border border-purple-100 text-purple-700'
                    : 'bg-green-50 border border-green-100 text-green-700'
                  }
                `}>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    quizType === 'coding' ? 'bg-brand-500' : quizType === 'mixed' ? 'bg-purple-500' : 'bg-green-500'
                  }`} />
                  {quizType === 'mcq'
                    ? 'MCQ selected — candidates answer multiple choice questions with a per-question timer.'
                    : quizType === 'coding'
                    ? 'Coding selected — candidates solve problems in a live code editor with test cases.'
                    : 'Mixed selected — candidates get both MCQ and coding questions in one seamless flow.'
                  }
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="border-t border-warm-100" />

              {/* Error */}
              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-down">
                  <svg width="15" height="15" className="mt-0.5 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <Field
                id="title" label="Quiz Title"
                placeholder={quizType === 'mcq' ? 'e.g. SDE-1 Technical Assessment' : quizType === 'coding' ? 'e.g. DSA Live Coding Round' : 'e.g. Full-Stack Developer Round'}
                value={title} onChange={setTitle}
                hint="Use a clear, descriptive name the candidate will see."
              />

              <Field
                id="domain" label="Domain / Role"
                placeholder="e.g. Engineering, Marketing, Sales"
                value={domain} onChange={setDomain}
                hint="Helps HR filter and organise quizzes by department."
              />

              {/* Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field id="from"  label="Active From"  type="datetime-local" value={activeFrom}  onChange={setActiveFrom}  />
                <Field id="until" label="Active Until" type="datetime-local" value={activeUntil} onChange={setActiveUntil} />
              </div>

              {/* Window preview */}
              {windowValid && (
                <div className="flex items-center gap-2.5 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 animate-fade-in">
                  <svg width="13" height="13" className="text-brand-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p className="text-brand-700 text-xs font-medium">
                    Window:{' '}
                    <span className="font-semibold">
                      {new Date(activeFrom).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {' → '}
                    <span className="font-semibold">
                      {new Date(activeUntil).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </p>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="
                    flex items-center gap-2
                    bg-brand-600 hover:bg-brand-700
                    disabled:opacity-60 disabled:cursor-not-allowed
                    text-white font-display font-semibold text-sm
                    px-6 py-3 rounded-2xl
                    shadow-brand-sm hover:shadow-brand-md
                    active:scale-[0.97] transition-all duration-200
                  "
                >
                  {creating ? (
                    <>
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Creating…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Create & Add {quizType === 'mcq' ? 'Questions' : quizType === 'coding' ? 'Problem' : 'Questions'}
                    </>
                  )}
                </button>
                <p className="text-xs text-charcoal-400">
                  You'll be taken to the {quizType === 'mixed' ? 'mixed question' : quizType === 'mcq' ? 'question' : 'problem'} editor next.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}