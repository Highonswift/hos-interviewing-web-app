'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Quiz } from '@/lib/types';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function toLocalDatetimeInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

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
    active:   { cls: 'bg-green-100 text-green-700 border-green-200',   dot: 'bg-green-500 animate-pulse-brand', label: 'Live'     },
    upcoming: { cls: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-400',                    label: 'Upcoming' },
    ended:    { cls: 'bg-warm-200  text-charcoal-500 border-warm-300', dot: 'bg-charcoal-400',                 label: 'Ended'    },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 border text-xs font-display font-semibold px-2.5 py-1 rounded-pill ${map.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${map.dot}`} />
      {map.label}
    </span>
  );
}

/* ─── Field (reusable) ───────────────────────────────────────────────────── */
function Field({
  id, label, type = 'text', placeholder, value, onChange,
}: {
  id: string; label: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
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
          id={id} type={type}
          placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full px-4 py-3 text-sm font-body text-charcoal-900 placeholder:text-charcoal-400 bg-transparent rounded-2xl focus:outline-none"
        />
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-warm-100 border border-warm-200 flex items-center justify-center mb-4 text-charcoal-300">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      </div>
      <p className="font-display font-bold text-charcoal-700 text-base mb-1">No quizzes yet</p>
      <p className="text-charcoal-400 text-sm max-w-xs mb-5">
        Create your first assessment to get started.
      </p>
      <Link
        href="/admin/quiz/create"
        className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-sm px-5 py-2.5 rounded-2xl shadow-brand-sm hover:shadow-brand-md transition-all duration-200"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Create Quiz
      </Link>
    </div>
  );
}

/* ─── Delete confirm modal ───────────────────────────────────────────────── */
function DeleteModal({
  quiz, onCancel, onConfirm, deleting,
}: {
  quiz: Quiz; onCancel: () => void; onConfirm: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="absolute inset-0 bg-charcoal-950/50 backdrop-blur-sm" onClick={() => !deleting && onCancel()} />
      <div className="relative z-10 w-full max-w-sm my-auto bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-red-600" />
        <div className="p-6 overflow-y-auto">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" className="text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <h3 className="font-display font-bold text-charcoal-900 text-lg text-center mb-2">Delete Quiz?</h3>
          <p className="text-charcoal-500 text-sm text-center leading-relaxed mb-4">
            Are you sure you want to delete <span className="font-semibold text-charcoal-800">"{quiz.title}"</span>?
          </p>
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-5">
            <p className="text-xs text-red-700 text-center font-medium">
              This will permanently remove all questions and cannot be undone.
            </p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={onCancel} disabled={deleting}
              className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm} disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-display font-semibold text-sm bg-red-600 hover:bg-red-700 !text-white hover:!text-white shadow-sm transition-all duration-200 disabled:opacity-50 active:scale-[0.97]"
            >
              {deleting ? (
                <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Deleting…</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Yes, Delete</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Edit dates modal ───────────────────────────────────────────────────── */
function EditDatesModal({
  quiz, onCancel, onSave, saving,
}: {
  quiz: Quiz; onCancel: () => void;
  onSave: (from: string, until: string) => void;
  saving: boolean;
}) {
  const [newFrom,  setNewFrom]  = useState(() => toLocalDatetimeInput(quiz.active_from));
  const [newUntil, setNewUntil] = useState(() => toLocalDatetimeInput(quiz.active_until));
  const [err, setErr] = useState('');

  const handleSave = () => {
    if (new Date(newUntil) <= new Date(newFrom)) {
      setErr('"Active Until" must be after "Active From".');
      return;
    }
    setErr('');
    onSave(newFrom, newUntil);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="absolute inset-0 bg-charcoal-950/50 backdrop-blur-sm" onClick={() => !saving && onCancel()} />
      <div className="relative z-10 w-full max-w-sm my-auto bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />
        <div className="p-6 overflow-y-auto">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-charcoal-900 text-lg leading-tight">Edit Access Window</h3>
              <p className="text-charcoal-400 text-xs mt-0.5 truncate max-w-[200px]">{quiz.title}</p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-charcoal-400 hover:text-charcoal-600 hover:bg-warm-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4 text-xs text-red-700 font-medium animate-fade-down">
              {err}
            </div>
          )}

          <div className="flex flex-col gap-4 mb-6">
            <Field id="edit-from"  label="Start Date & Time" type="datetime-local" value={newFrom}  onChange={setNewFrom}  />
            <Field id="edit-until" label="End Date & Time"   type="datetime-local" value={newUntil} onChange={setNewUntil} />
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={onCancel} disabled={saving}
              className="flex-1 py-2.5 rounded-2xl font-display font-semibold text-sm bg-warm-100 text-charcoal-600 hover:bg-warm-200 border border-warm-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl font-display font-semibold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-brand-sm hover:shadow-brand-md active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
            >
              {saving ? (
                <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Saving…</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Quiz card ──────────────────────────────────────────────────────────── */
function QuizCard({
  quiz, index, onEdit, onDelete, copiedId, onCopy,
}: {
  quiz: Quiz; index: number;
  onEdit:   (q: Quiz) => void;
  onDelete: (q: Quiz) => void;
  copiedId: string | null;
  onCopy:   (quiz: Quiz) => void;
}) {
  const status = quizStatus(quiz);
  return (
    <div
      className="bg-white border border-warm-200 rounded-2xl shadow-xs hover:shadow-sm hover:border-warm-300 transition-all duration-200 overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Card body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display font-bold text-charcoal-900 text-base leading-snug truncate">
                {quiz.title}
              </h3>
              <StatusBadge status={status} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-400 font-medium">
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                {quiz.domain}
              </span>
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                {fmtDate(quiz.active_from)} → {fmtDate(quiz.active_until)}
              </span>
            </div>
          </div>
        </div>

        {/* Quiz short link preview */}
        <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2 mt-3">
          <svg width="12" height="12" className="text-brand-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span className="text-xs text-brand-700 font-mono truncate flex-1 font-medium">
            {typeof window !== 'undefined' ? window.location.origin : ''}/q/{quiz.short_code || quiz.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap px-5 py-3 border-t border-warm-100 bg-warm-50/60">

        {/* Edit dates */}
        <button
          onClick={() => onEdit(quiz)}
          className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl bg-white text-charcoal-600 hover:bg-warm-100 border border-warm-200 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Dates
        </button>

        {/* Copy link */}
        <button
          onClick={() => onCopy(quiz)}
          className={`inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl border transition-all duration-200 ${
            copiedId === quiz.id
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-white text-charcoal-600 hover:bg-warm-100 border-warm-200'
          }`}
        >
          {copiedId === quiz.id ? (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>Copy Short Link</>
          )}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(quiz)}
          className="inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3 py-1.5 rounded-xl bg-white text-red-500 hover:bg-red-50 hover:text-red-600 border border-warm-200 hover:border-red-200 transition-all duration-200"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Delete
        </button>

        {/* Manage questions — primary, pinned right */}
        <Link
          href={`/admin/quiz/manage/${quiz.id}`}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-display font-semibold px-3.5 py-1.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white border border-transparent transition-all duration-200 shadow-xs"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>
          </svg>
          Manage Questions
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ManageQuizzesPage() {
  const router = useRouter();

  const [quizzes,     setQuizzes]     = useState<Quiz[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState<'all' | 'active' | 'upcoming' | 'ended'>('all');

  /* Edit modal */
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [saving,      setSaving]      = useState(false);

  /* Delete modal */
  const [deletingQuiz, setDeletingQuiz] = useState<Quiz | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  /* Copy feedback */
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    const { data } = await supabase
      .from('quizzes').select('*').order('created_at', { ascending: false });
    if (data) setQuizzes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  /* Handlers */
  const handleCopy = (quiz: Quiz) => {
    const code = quiz.short_code || quiz.id.slice(0, 8);
    navigator.clipboard.writeText(`${window.location.origin}/q/${code}`);
    setCopiedId(quiz.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveDates = async (newFrom: string, newUntil: string) => {
    if (!editingQuiz) return;
    setSaving(true);
    const { error } = await supabase
      .from('quizzes')
      .update({
        active_from:  new Date(newFrom).toISOString(),
        active_until: new Date(newUntil).toISOString(),
      })
      .eq('id', editingQuiz.id);
    if (error) alert('Error: ' + error.message);
    else { setEditingQuiz(null); await fetchQuizzes(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingQuiz) return;
    setDeleting(true);
    // Delete questions first (FK constraint)
    await supabase.from('questions').delete().eq('quiz_id', deletingQuiz.id);
    const { error } = await supabase.from('quizzes').delete().eq('id', deletingQuiz.id);
    if (error) alert('Error: ' + error.message);
    else { setDeletingQuiz(null); await fetchQuizzes(); }
    setDeleting(false);
  };

  /* Filtered list */
  const filtered = quizzes
    .filter(q => filter === 'all' || quizStatus(q) === filter)
    .filter(q =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.domain.toLowerCase().includes(search.toLowerCase())
    );

  const counts = {
    all:      quizzes.length,
    active:   quizzes.filter(q => quizStatus(q) === 'active').length,
    upcoming: quizzes.filter(q => quizStatus(q) === 'upcoming').length,
    ended:    quizzes.filter(q => quizStatus(q) === 'ended').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-2 text-charcoal-400 text-sm font-medium">
        <svg className="animate-spin text-brand-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading quizzes…
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 animate-fade-up">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-charcoal-900 text-2xl sm:text-3xl tracking-tight">
            Manage Quizzes
          </h1>
          <p className="text-charcoal-500 text-sm mt-0.5">
            Edit, share, delete, and manage questions for your assessments.
          </p>
        </div>
        <Link
          href="/admin/quiz/create"
          className="flex-shrink-0 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-sm px-4 py-2.5 rounded-2xl shadow-brand-sm hover:shadow-brand-md transition-all duration-200 active:scale-[0.97]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Quiz
        </Link>
      </div>

      {/* ── Toolbar: search + filter tabs ── */}
      {quizzes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search quizzes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm font-body bg-white border border-warm-200 rounded-xl placeholder:text-charcoal-400 text-charcoal-900 focus:outline-none focus:border-brand-400 focus:shadow-[0_0_0_3px_rgb(232_72_58_/_0.09)] transition-all duration-200"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-warm-100 border border-warm-200 rounded-xl p-1">
            {(['all', 'active', 'upcoming', 'ended'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-display font-semibold capitalize transition-all duration-150
                  ${filter === f
                    ? 'bg-white text-charcoal-900 shadow-xs'
                    : 'text-charcoal-500 hover:text-charcoal-700'
                  }
                `}
              >
                {f} <span className="opacity-60">({counts[f]})</span>
              </button>
            ))}
          </div>

          <span className="text-xs text-charcoal-400 font-medium sm:ml-auto">
            {filtered.length} quiz{filtered.length !== 1 ? 'zes' : ''}
          </span>
        </div>
      )}

      {/* ── List ── */}
      {quizzes.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-display font-bold text-charcoal-600 text-sm mb-1">No matches found</p>
          <p className="text-charcoal-400 text-xs">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((quiz, i) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              index={i}
              onEdit={setEditingQuiz}
              onDelete={setDeletingQuiz}
              copiedId={copiedId}
              onCopy={handleCopy}
            />
          ))}
        </div>
      )}

      {/* ── Edit dates modal ── */}
      {editingQuiz && (
        <EditDatesModal
          quiz={editingQuiz}
          onCancel={() => setEditingQuiz(null)}
          onSave={handleSaveDates}
          saving={saving}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deletingQuiz && (
        <DeleteModal
          quiz={deletingQuiz}
          onCancel={() => setDeletingQuiz(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}