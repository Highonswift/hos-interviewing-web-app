import { redirect, notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ShortRouteProps {
  params: Promise<{ code: string }>;
}

export default async function ShortQuizRedirect({ params }: ShortRouteProps) {
  const { code } = await params;

  if (!code) {
    notFound();
  }

  const cleanCode = code.trim().toLowerCase();

  // 1. Try exact short_code match
  const { data: byShortCode } = await supabase
    .from('quizzes')
    .select('id')
    .eq('short_code', cleanCode)
    .maybeSingle();

  if (byShortCode?.id) {
    redirect(`/quiz/${byShortCode.id}`);
  }

  // 2. Try prefix match on id (for quizzes that haven't set short_code yet)
  const { data: allQuizzes } = await supabase
    .from('quizzes')
    .select('id');

  if (allQuizzes && allQuizzes.length > 0) {
    const matching = allQuizzes.find(q =>
      q.id.toLowerCase().startsWith(cleanCode) ||
      q.id.replace(/-/g, '').toLowerCase().startsWith(cleanCode)
    );
    if (matching) {
      redirect(`/quiz/${matching.id}`);
    }
  }

  notFound();
}
