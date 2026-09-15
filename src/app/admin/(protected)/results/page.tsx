'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Quiz, Result } from '@/lib/types';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function scorePct(score: number, total: number) {
  if (!total) return 0;
  return Math.round((score / total) * 100);
}

function scoreColor(pct: number) {
  if (pct >= 80) return { bar: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-200' };
  if (pct >= 50) return { bar: 'bg-amber-500',  text: 'text-amber-700',  bg: 'bg-amber-100',  border: 'border-amber-200' };
  return         { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-200' };
}

function tabColor(count: number) {
  if (count === 0) return 'text-green-700 bg-green-100 border-green-200';
  if (count <= 2)  return 'text-amber-700 bg-amber-100 border-amber-200';
  return 'text-red-700 bg-red-100 border-red-200';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type SortKey = 'candidate_name' | 'score' | 'tab_switch_count';
type SortDir = 'asc' | 'desc';

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, tint }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; tint: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${tint} border border-warm-200 rounded-2xl p-4 sm:p-5 shadow-xs`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 bg-white/60 text-charcoal-600`}>
        {icon}
      </div>
      <div className="font-display font-extrabold text-charcoal-900 text-2xl leading-none mb-0.5">{value}</div>
      <div className="text-charcoal-500 text-xs font-medium">{label}</div>
      {sub && <div className="text-charcoal-400 text-[10px] mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Sort header button ─────────────────────────────────────────────────── */
function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th className="px-4 py-3 text-left">
      <button
        onClick={() => onSort(sortKey)}
        className={`
          inline-flex items-center gap-1.5
          font-display font-semibold text-xs uppercase tracking-wider
          transition-colors duration-150
          ${active ? 'text-brand-600' : 'text-charcoal-500 hover:text-charcoal-800'}
        `}
      >
        {label}
        <span className="flex flex-col gap-[1px]">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            className={active && dir === 'asc' ? 'text-brand-600' : 'text-charcoal-300'}>
            <path d="m18 15-6-6-6 6"/>
          </svg>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            className={active && dir === 'desc' ? 'text-brand-600' : 'text-charcoal-300'}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </span>
      </button>
    </th>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ViewResults() {
  const router          = useRouter();
  const [quizzes,       setQuizzes]       = useState<Quiz[]>([]);
  const [results,       setResults]       = useState<Result[]>([]);
  const [selectedQuiz,  setSelectedQuiz]  = useState<Quiz | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [search,        setSearch]        = useState('');
  const [sortKey,       setSortKey]       = useState<SortKey>('score');
  const [sortDir,       setSortDir]       = useState<SortDir>('desc');
  const [selectOpen,    setSelectOpen]    = useState(false);

  /* Fetch quiz list */
  useEffect(() => {
    supabase.from('quizzes').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setQuizzes(data || []); setLoadingQuizzes(false); });
  }, []);

  const [maxScore, setMaxScore] = useState<number>(0);

  /* Fetch results for chosen quiz */
  const fetchResults = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setSelectOpen(false);
    setLoadingResults(true);
    setSearch('');

    const { data } = await supabase.from('results').select('*').eq('quiz_id', quiz.id);
    setResults(data || []);

    // Calculate max possible score based on quiz type
    if (quiz.type === 'mixed') {
      const { data: qis } = await supabase.from('quiz_items').select('*').eq('quiz_id', quiz.id);
      if (qis) {
        // Each MCQ is 1 pt, each coding problem is evaluated against test cases
        const mcqCount = qis.filter(i => i.item_type === 'mcq').length;
        const codeIds = qis.filter(i => i.item_type === 'coding').map(i => i.item_id);
        let tcCount = 0;
        if (codeIds.length > 0) {
          const { count } = await supabase.from('test_cases').select('*', { count: 'exact', head: true }).in('question_id', codeIds);
          tcCount = count ?? 0;
        }
        setMaxScore(mcqCount + tcCount);
      }
    } else if (quiz.type === 'coding') {
      const { data: codeQs } = await supabase.from('coding_questions').select('id').eq('quiz_id', quiz.id);
      if (codeQs && codeQs.length > 0) {
        const { count } = await supabase.from('test_cases').select('*', { count: 'exact', head: true }).in('question_id', codeQs.map(q => q.id));
        setMaxScore(count ?? 0);
      } else {
        setMaxScore(0);
      }
    } else {
      const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('quiz_id', quiz.id);
      setMaxScore(count ?? (data?.[0] ? Object.keys(data[0].answers ?? {}).length : 0));
    }

    setLoadingResults(false);
  };

  /* Sort handler */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  /* Derived: filtered + sorted results */
  const totalQs = maxScore > 0 ? maxScore : (results[0] ? Object.keys(results[0].answers ?? {}).length : 0);

  const processed = useMemo(() => {
    let list = results.filter(r =>
      r.candidate_name.toLowerCase().includes(search.toLowerCase())
    );
    list = [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc'
        ? (av as string).localeCompare(bv as string)
        : (bv as string).localeCompare(av as string);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [results, search, sortKey, sortDir]);

  /* Stats */
  const avgScore   = results.length ? (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1) : '—';
  const topScore   = results.length ? Math.max(...results.map(r => r.score)) : '—';
  const flagged    = results.filter(r => r.tab_switch_count > 0).length;

  return (
    <div className="max-w-6xl mx-auto w-full space-y-7 animate-fade-up">

      {/* ── Page header ── */}
      <div>
        <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight">
          Candidate Results
        </h1>
        <p className="text-charcoal-500 text-sm mt-0.5">
          Select a quiz to view and analyse candidate performance.
        </p>
      </div>

      {/* ── Quiz selector ── */}
      <div className="bg-white border border-warm-200 rounded-2xl shadow-xs p-4 sm:p-5">
        <label className="font-display font-semibold text-xs text-charcoal-600 uppercase tracking-wider mb-2 block">
          Select Assessment
        </label>

        {loadingQuizzes ? (
          <div className="h-11 rounded-xl bg-warm-100 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        ) : (
          <div className="relative">
            <button
              onClick={() => setSelectOpen(o => !o)}
              className={`
                w-full flex items-center justify-between gap-3
                px-4 py-3 rounded-xl border-2 bg-white text-left
                font-body text-sm transition-all duration-200
                ${selectOpen
                  ? 'border-brand-400 shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)]'
                  : 'border-warm-300 hover:border-warm-400'
                }
              `}
            >
              <span className={selectedQuiz ? 'text-charcoal-900 font-medium' : 'text-charcoal-400'}>
                {selectedQuiz ? selectedQuiz.title : 'Choose a quiz to view results…'}
              </span>
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`flex-shrink-0 text-charcoal-400 transition-transform duration-200 ${selectOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {selectOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white border border-warm-200 rounded-2xl shadow-lg overflow-hidden animate-fade-down">
                {quizzes.length === 0 ? (
                  <div className="px-4 py-6 text-center text-charcoal-400 text-sm">No quizzes found.</div>
                ) : (
                  <div className="max-h-64 overflow-y-auto py-1">
                    {quizzes.map(q => (
                      <button
                        key={q.id}
                        onClick={() => fetchResults(q)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 text-left
                          transition-colors duration-100
                          ${selectedQuiz?.id === q.id
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-charcoal-700 hover:bg-warm-50'
                          }
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-sm truncate">{q.title}</p>
                          <p className="text-charcoal-400 text-xs">{q.domain}</p>
                        </div>
                        {selectedQuiz?.id === q.id && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-brand-600">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Results area ── */}
      {selectedQuiz && (
        <>
          {loadingResults ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center gap-2 text-charcoal-400 text-sm font-medium">
                <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Fetching results…
              </div>
            </div>
          ) : results.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-warm-200 border-dashed rounded-3xl text-center animate-fade-up">
              <div className="w-12 h-12 rounded-2xl bg-warm-100 flex items-center justify-center mb-3 text-charcoal-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="font-display font-bold text-charcoal-600 text-sm mb-1">No submissions yet</p>
              <p className="text-charcoal-400 text-xs max-w-xs">Candidates haven't submitted results for <span className="font-semibold">{selectedQuiz.title}</span> yet.</p>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Total Submissions" value={results.length}
                  tint="from-warm-50 to-white"
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                />
                <StatCard
                  label="Average Score" value={avgScore} sub={`out of ${totalQs}`}
                  tint="from-brand-50 to-white"
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                />
                <StatCard
                  label="Top Score" value={topScore} sub={`out of ${totalQs}`}
                  tint="from-green-50 to-white"
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
                />
                <StatCard
                  label="Flagged" value={flagged} sub="tab switches"
                  tint="from-red-50 to-white"
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>}
                />
              </div>

              {/* Search + table */}
              <div className="bg-white border border-warm-200 rounded-3xl shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-warm-100">
                  <div className="relative flex-1 max-w-xs">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search candidates…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="
                        w-full pl-9 pr-4 py-2 text-sm font-body
                        bg-warm-50 border border-warm-200 rounded-xl
                        placeholder:text-charcoal-400 text-charcoal-900
                        focus:outline-none focus:border-brand-400 focus:bg-white
                        focus:shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)]
                        transition-all duration-200
                      "
                    />
                  </div>
                  <span className="text-xs text-charcoal-400 font-medium flex-shrink-0">
                    {processed.length} of {results.length} result{results.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-warm-50 border-b border-warm-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-display font-semibold text-xs uppercase tracking-wider text-charcoal-500 w-10">#</th>
                        <SortTh label="Candidate"    sortKey="candidate_name"   current={sortKey} dir={sortDir} onSort={handleSort} />
                        <th className="px-4 py-3 text-left font-display font-semibold text-xs uppercase tracking-wider text-charcoal-500">Status</th>
                        <SortTh label="Score"        sortKey="score"            current={sortKey} dir={sortDir} onSort={handleSort} />
                        <th className="px-4 py-3 text-left font-display font-semibold text-xs uppercase tracking-wider text-charcoal-500">Performance</th>
                        <SortTh label="Tab Switches" sortKey="tab_switch_count" current={sortKey} dir={sortDir} onSort={handleSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {processed.map((r, i) => {
                        const pct    = scorePct(r.score, totalQs);
                        const colors = scoreColor(pct);
                        return (
                          <tr
                            key={r.id || i}
                            onClick={() => router.push(`/admin/results/${r.id}`)}
                            className="border-b border-warm-100 last:border-none hover:bg-brand-50/40 cursor-pointer transition-colors duration-100 group"
                            title="Click to view detailed answer sheet"
                          >
                            {/* Rank */}
                            <td className="px-4 py-3.5 text-xs text-charcoal-400 font-medium">{i + 1}</td>

                            {/* Candidate */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                                  <span className="font-display font-bold text-brand-700 group-hover:text-white text-xs transition-colors">
                                    {r.candidate_name.slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-display font-semibold text-charcoal-800 text-sm block leading-tight group-hover:text-brand-600 transition-colors">{r.candidate_name}</span>
                                  {r.candidate_email ? (
                                    <span className="text-xs text-charcoal-400 font-mono block mt-0.5">{r.candidate_email}</span>
                                  ) : (
                                    <span className="text-[11px] text-charcoal-300 italic block mt-0.5">No email recorded</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1.5 font-display font-semibold text-xs px-2.5 py-1 rounded-pill border bg-green-50 text-green-700 border-green-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                {r.status === 'timed_out' ? 'Timed Out' : 'Done'}
                              </span>
                            </td>

                            {/* Score */}
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 font-display font-bold text-sm px-2.5 py-1 rounded-xl border ${colors.bg} ${colors.text} ${colors.border}`}>
                                {r.score}<span className="font-medium opacity-60 text-xs">/ {totalQs}</span>
                              </span>
                            </td>

                            {/* Score bar */}
                            <td className="px-4 py-3.5 min-w-[120px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-warm-200 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-charcoal-400 font-medium w-8 text-right">{pct}%</span>
                              </div>
                            </td>

                            {/* Tab switches & Action */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center gap-1 font-display font-semibold text-xs px-2.5 py-1 rounded-pill border ${tabColor(r.tab_switch_count)}`}>
                                  {r.tab_switch_count > 0 && (
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                                      <path d="M12 9v4"/><path d="M12 17h.01"/>
                                    </svg>
                                  )}
                                  {r.tab_switch_count === 0 ? 'Clean' : `${r.tab_switch_count} switch${r.tab_switch_count > 1 ? 'es' : ''}`}
                                </span>

                                <span className="text-xs text-brand-600 font-display font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                  View answers →
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {processed.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-charcoal-400 text-sm">
                            No candidates match "<span className="font-semibold">{search}</span>"
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}