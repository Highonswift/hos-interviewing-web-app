'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Quiz, Result } from '@/lib/types';
import Link from 'next/link';
import { ClipboardList, Activity, CalendarClock, Lock } from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function quizStatus(quiz: Quiz): 'upcoming' | 'active' | 'ended' {
  const now   = Date.now();
  const from  = new Date(quiz.active_from).getTime();
  const until = new Date(quiz.active_until).getTime();
  if (now < from)  return 'upcoming';
  if (now > until) return 'ended';
  return 'active';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─── Status badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: 'upcoming' | 'active' | 'ended' }) {
  const map = {
    active:   { cls: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500 animate-pulse', label: 'Live' },
    upcoming: { cls: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-400',               label: 'Upcoming' },
    ended:    { cls: 'bg-warm-200  text-charcoal-500 border-warm-300', dot: 'bg-charcoal-400',            label: 'Ended' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 border text-xs font-display font-semibold px-2.5 py-1 rounded-pill ${map.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}

/* ─── Form field ─────────────────────────────────────────────────────────── */
function Field({
  label, id, type = 'text', placeholder, value, onChange, required = true,
}: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider">
        {label}
      </label>
      <div className={`
        relative border-2 rounded-xl bg-white transition-all duration-200
        ${focused ? 'border-brand-400 shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)]' : 'border-warm-300 hover:border-warm-400'}
      `}>
        <input
          id={id} type={type} required={required}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-3.5 py-2.5 text-sm font-body text-charcoal-900 placeholder:text-charcoal-400 bg-transparent rounded-xl focus:outline-none"
        />
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up">
      <div className="w-14 h-14 rounded-2xl bg-warm-100 border border-warm-200 flex items-center justify-center mb-4 text-charcoal-300">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <p className="font-display font-bold text-charcoal-700 text-base mb-1">No quizzes yet</p>
      <p className="text-charcoal-400 text-sm max-w-xs">Create your first assessment using the form to get started.</p>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const router = useRouter();
  const [quizzes,     setQuizzes]     = useState<Quiz[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [adminId,     setAdminId]     = useState('');
  const [creating,    setCreating]    = useState(false);

  /* Create form */
  const [title,       setTitle]       = useState('');
  const [domain,      setDomain]      = useState('');
  const [activeFrom,  setActiveFrom]  = useState('');
  const [activeUntil, setActiveUntil] = useState('');

  /* Edit modal */
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newFrom,     setNewFrom]     = useState('');
  const [newUntil,    setNewUntil]    = useState('');
  const [saving,      setSaving]      = useState(false);

  /* Copy link feedback */
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [results, setResults] = useState<Result[]>([]);
  const [totalQs, setTotalQs] = useState(0);

  const fetchQuizzes = useCallback(async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setQuizzes(data);
    const { data: resultsData } = await supabase.from('results').select('*');
    if (resultsData) {
      setResults(resultsData);
      if (resultsData[0]) setTotalQs(Object.keys(resultsData[0].answers ?? {}).length);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/admin/login'); return; }
      setAdminId(session.user.id);
      await fetchQuizzes();
      setLoading(false);
    })();
  }, [router, fetchQuizzes]);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data, error } = await supabase
      .from('quizzes')
      .insert([{
        title, domain,
        active_from:  new Date(activeFrom).toISOString(),
        active_until: new Date(activeUntil).toISOString(),
        admin_id: adminId,
      }])
      .select();

    if (!error && data) {
      router.push(`/admin/dashboard/${data[0].id}`);
    } else {
      alert('Error creating quiz: ' + error?.message);
      setCreating(false);
    }
  };

  const handleUpdateDates = async () => {
    if (!editingQuiz) return;
    setSaving(true);
    const { error } = await supabase
      .from('quizzes')
      .update({
        active_from:  new Date(newFrom).toISOString(),
        active_until: new Date(newUntil).toISOString(),
      })
      .eq('id', editingQuiz.id);

    if (error) { alert('Error: ' + error.message); setSaving(false); }
    else { setEditingQuiz(null); setSaving(false); await fetchQuizzes(); }
  };

  const handleCopyLink = (quizId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${quizId}`);
    setCopiedId(quizId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ── Stats ── */
  const total    = quizzes.length;
  const live     = quizzes.filter(q => quizStatus(q) === 'active').length;
  const upcoming = quizzes.filter(q => quizStatus(q) === 'upcoming').length;
  const ended = quizzes.filter(q => quizStatus(q) === 'ended').length;

  // Submissions per quiz — requires a results count per quiz
  // Fetch this alongside quizzes in checkUserAndFetchQuizzes:
  const submissionData = quizzes.slice(0, 6).map(q => ({
    quizId: q.id,
    label:  q.title.length > 16 ? q.title.slice(0, 16) + '…' : q.title,
    count:  (q as any).result_count ?? 0,
  })).sort((a, b) => b.count - a.count);

  // Score distribution across all results
  const totalResults = results.length;
  const scoreDist = {
    high: results.filter(r => r.score / (totalQs || 1) >= 0.8).length,
    mid:  results.filter(r => { const p = r.score / (totalQs || 1); return p >= 0.5 && p < 0.8; }).length,
    low:  results.filter(r => r.score / (totalQs || 1) < 0.5).length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-charcoal-400 text-sm font-medium">
        <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading dashboard…
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full space-y-7 animate-fade-up">

      {/* ── Page header ── */}
      <div>
        <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight">
          Dashboard
        </h1>
        <p className="text-charcoal-500 text-sm mt-0.5">
          Overview of your assessments and candidate activity.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Quizzes', value: total,    icon: ClipboardList, color: 'text-warm-600',     tint: 'from-warm-50 to-white' },
          { label: 'Live Now',      value: live,     icon: Activity,      color: 'text-green-600',    tint: 'from-green-50 to-white' },
          { label: 'Upcoming',      value: upcoming, icon: CalendarClock, color: 'text-amber-600',    tint: 'from-amber-50 to-white' },
          { label: 'Ended',         value: ended,    icon: Lock,          color: 'text-charcoal-400', tint: 'from-warm-100 to-white' },
        ].map(s => (
          <div key={s.label} className={`bg-gradient-to-br ${s.tint} border border-warm-200 rounded-2xl p-4 sm:p-5 shadow-xs`}>
            <div className={`mb-2 ${s.color}`}>
              <s.icon size={22} strokeWidth={2.5} />
            </div>
            <div className="font-display font-extrabold text-charcoal-900 text-2xl leading-none mb-0.5">{s.value}</div>
            <div className="text-charcoal-500 text-xs font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Submissions per quiz bar chart */}
        <div className="bg-white border border-warm-200 rounded-3xl shadow-sm p-5 sm:p-6">
          <h2 className="font-display font-bold text-charcoal-900 text-sm mb-1">Submissions per Quiz</h2>
          <p className="text-charcoal-400 text-xs mb-5">Total candidate submissions by assessment</p>
          {submissionData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-charcoal-300 text-sm">No data yet</div>
          ) : (
            <div className="space-y-3">
              {submissionData.map((d) => (
                <div key={d.quizId} className="flex items-center gap-3">
                  <span className="text-xs text-charcoal-500 font-medium w-28 truncate flex-shrink-0">{d.label}</span>
                  <div className="flex-1 h-6 bg-warm-100 rounded-xl overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl flex items-center justify-end pr-2 transition-all duration-700"
                      style={{ width: `${submissionData[0].count ? (d.count / submissionData[0].count) * 100 : 0}%` }}
                    >
                      <span className="text-white text-[10px] font-bold">{d.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Score distribution donut */}
        <div className="bg-white border border-warm-200 rounded-3xl shadow-sm p-5 sm:p-6">
          <h2 className="font-display font-bold text-charcoal-900 text-sm mb-1">Score Distribution</h2>
          <p className="text-charcoal-400 text-xs mb-5">Candidate performance across all quizzes</p>
          {totalResults === 0 ? (
            <div className="flex items-center justify-center h-40 text-charcoal-300 text-sm">No data yet</div>
          ) : (
            <div className="flex items-center gap-6">
              {/* Simple SVG donut */}
              <div className="relative flex-shrink-0">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  {(() => {
                    const segments = [
                      { pct: scoreDist.high  / totalResults, color: '#22c55e' },
                      { pct: scoreDist.mid   / totalResults, color: '#f59e0b' },
                      { pct: scoreDist.low   / totalResults, color: '#ef4444' },
                    ];
                    const r = 40; const cx = 55; const cy = 55;
                    const circumference = 2 * Math.PI * r;
                    let offset = 0;
                    return segments.map((seg, i) => {
                      const dash = seg.pct * circumference;
                      const el = (
                        <circle key={i} cx={cx} cy={cy} r={r}
                          fill="none" stroke={seg.color} strokeWidth="18"
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          strokeDashoffset={-offset}
                          transform="rotate(-90 55 55)"
                          style={{ transition: 'stroke-dasharray 0.8s ease' }}
                        />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                  <circle cx="55" cy="55" r="28" fill="white"/>
                  <text x="55" y="51" textAnchor="middle" fontSize="14" fontWeight="800" fill="#2d2d2d" fontFamily="Plus Jakarta Sans, sans-serif">{totalResults}</text>
                  <text x="55" y="64" textAnchor="middle" fontSize="9" fill="#888" fontFamily="Plus Jakarta Sans, sans-serif">total</text>
                </svg>
              </div>
              {/* Legend */}
              <div className="flex flex-col gap-2.5 flex-1">
                {[
                  { label: 'High (≥80%)', count: scoreDist.high, color: 'bg-green-500' },
                  { label: 'Mid (50–79%)', count: scoreDist.mid,  color: 'bg-amber-400' },
                  { label: 'Low (<50%)',  count: scoreDist.low,  color: 'bg-red-500' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${l.color}`}/>
                    <span className="text-xs text-charcoal-600 flex-1">{l.label}</span>
                    <span className="font-display font-bold text-charcoal-900 text-xs">{l.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="bg-white border border-warm-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-warm-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-charcoal-900 text-sm">Recent Quizzes</h2>
          <Link href="/admin/quiz/manage" className="text-xs font-display font-semibold text-brand-600 hover:text-brand-700 transition-colors">
            View all →
          </Link>
        </div>
        {quizzes.length === 0 ? (
          <div className="px-5 py-10 text-center text-charcoal-400 text-sm">No quizzes created yet.</div>
        ) : (
          <div className="divide-y divide-warm-100">
            {quizzes.slice(0, 5).map(q => {
              const status = quizStatus(q);
              const statusMap = {
                active:   { cls: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500 animate-pulse-brand', label: 'Live' },
                upcoming: { cls: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400',                    label: 'Upcoming' },
                ended:    { cls: 'bg-warm-200  text-charcoal-500 border-warm-300', dot: 'bg-charcoal-400',               label: 'Ended' },
              }[status];
              return (
                <div key={q.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-warm-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-charcoal-800 text-sm truncate">{q.title}</p>
                    <p className="text-charcoal-400 text-xs">{q.domain}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 border text-xs font-display font-semibold px-2.5 py-1 rounded-pill flex-shrink-0 ${statusMap.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMap.dot}`}/>
                    {statusMap.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}