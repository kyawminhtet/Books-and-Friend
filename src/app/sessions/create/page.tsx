'use client';

import { ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Header } from '@/components/header';
import { getSupabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';

export default function CreateSession() {
 const { t } = useI18n();
 const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 async function submit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  // React clears currentTarget after the handler yields, so snapshot the form first.
  const form = e.currentTarget;
  const values = new FormData(form);
  const bookTitle = String(values.get('title')).trim();
  const author = String(values.get('author')).trim();
  const totalChapters = Number(values.get('chapters'));
  const description = String(values.get('description') || '').trim() || null;
  const coverImageUrl = String(values.get('cover') || '').trim() || null;
  const startDate = String(values.get('start') || '') || null;
  const targetEndDate = String(values.get('end') || '') || null;

  setBusy(true);
  setError('');
  const supabase = getSupabase();
  if (!supabase) { setError('Supabase is not configured.'); setBusy(false); return; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { window.location.href = '/auth/sign-in'; return; }
  const { data, error: saveError } = await supabase.rpc('create_reading_session', {
   p_book_title: bookTitle,
   p_author: author,
   p_total_chapters: totalChapters,
   p_description: description,
   p_cover_image_url: coverImageUrl,
   p_start_date: startDate,
   p_target_end_date: targetEndDate,
  });
  if (saveError) { setError(saveError.message); setBusy(false); }
  else if (data) window.location.href = `/sessions/${data}`;
  else { setError(t('create.error')); setBusy(false); }
 }
  return <><Header /><main className="form-page"><Link href="/sessions" className="back-link"><ArrowLeft size={16} /> {t('circle.all')}</Link><section className="form-panel"><div className="form-kicker"><span className="brand-mark"><BookOpen size={17} /></span> {t('create.eyebrow')}</div><h1>{t('create.titleA')}<br /><em>{t('create.titleB')}</em></h1><p>{t('create.text')}</p><form onSubmit={submit} className="session-form"><div className="two-fields"><label>{t('create.book')}<input name="title" required maxLength={160} placeholder={t('create.bookExample')} /></label><label>{t('create.author')}<input name="author" required maxLength={120} placeholder={t('create.authorExample')} /></label></div><label>{t('create.chapters')}<input name="chapters" type="number" min="1" max="10000" required placeholder={t('create.chaptersExample')} /></label><label>{t('create.description')} <span className="optional">{t('create.optional')}</span><textarea name="description" rows={3} maxLength={1000} placeholder={t('create.descriptionPlaceholder')} /></label><label>{t('create.cover')} <span className="optional">{t('create.optional')}</span><input name="cover" type="url" placeholder="https://..." /></label><div className="two-fields"><label>{t('create.start')} <span className="optional">{t('create.optional')}</span><input name="start" type="date" /></label><label>{t('create.end')} <span className="optional">{t('create.optional')}</span><input name="end" type="date" /></label></div>{error && <div className="form-message" role="alert">{error}</div>}<button className="button button-dark auth-submit" disabled={busy}>{busy ? t('create.busy') : t('create.submit')} <span>↗</span></button><small className="form-footnote">{t('create.footnote')}</small></form></section></main></>;
}
