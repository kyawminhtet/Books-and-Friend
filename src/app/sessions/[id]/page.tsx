'use client';

import { ArrowLeft, BookOpen, MessageCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Avatar } from '@/components/avatar';
import { getSupabase } from '@/lib/supabase';
import type { Session } from '@/lib/types';
import { useI18n } from '@/i18n';

type Reaction = { id: string; user_id: string; emoji: string; profiles?: { display_name: string } | null };
type Comment = { id: string; content: string; chapter_reference: number | null; created_at: string; user_id: string; profiles?: { display_name: string; avatar_url?: string | null } | null; reactions: Reaction[] };
const reactionOptions = ['❤️', '👍', '😂', '🔥', '👏'];
const commentSelect = 'id,content,chapter_reference,created_at,user_id,profiles(display_name,avatar_url),reactions(id,user_id,emoji,profiles(display_name))';

export default function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
 const { t, locale } = useI18n();
 const [id, setId] = useState('');
 const [session, setSession] = useState<Session | null>(null);
 const [comments, setComments] = useState<Comment[]>([]);
 const [member, setMember] = useState(false);
 const [user, setUser] = useState('');
 const [note, setNote] = useState('');
 const [chapter, setChapter] = useState('');
 const [message, setMessage] = useState('');
 const [reactingTo, setReactingTo] = useState<string | null>(null);

 useEffect(() => { params.then(p => setId(p.id)); }, [params]);

 const refreshComments = useCallback(async () => {
  if (!id || id.startsWith('sample-')) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { data, error } = await supabase.from('comments').select(commentSelect).eq('session_id', id).is('deleted_at', null).order('created_at', { ascending: true });
  if (!error && data) setComments(data as unknown as Comment[]);
 }, [id]);

 useEffect(() => {
  if (!id || id.startsWith('sample-')) return;
  const supabase = getSupabase();
  if (!supabase) return;
  (async () => {
   const { data: { user: authUser } } = await supabase.auth.getUser();
   const membersSelection = authUser ? ',session_members(user_id,current_chapter,membership_status,profiles(display_name,avatar_url))' : '';
   const [{ data: s }, { data: c }] = await Promise.all([
    supabase.from('reading_sessions').select(`*,profiles!reading_sessions_creator_id_fkey(display_name,avatar_url)${membersSelection}`).eq('id', id).single(),
    supabase.from('comments').select(commentSelect).eq('session_id', id).is('deleted_at', null).order('created_at', { ascending: true }),
   ]);
   if (s) setSession(s as unknown as Session);
   if (c) setComments(c as unknown as Comment[]);
   setUser(authUser?.id ?? '');
   if (authUser) {
    const { data: m } = await supabase.from('session_members').select('id,current_chapter,progress_note').eq('session_id', id).eq('user_id', authUser.id).eq('membership_status', 'active').maybeSingle();
    if (m) { setMember(true); setChapter(String(m.current_chapter)); setNote(m.progress_note ?? ''); }
   }
  })();
 }, [id]);

 useEffect(() => {
  if (!id || id.startsWith('sample-')) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const channel = supabase.channel(`session-${id}`)
   .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `session_id=eq.${id}` }, () => { void refreshComments(); });
  if (user) channel.on('postgres_changes', { event: '*', schema: 'public', table: 'session_members', filter: `session_id=eq.${id}` }, async () => {
    const { data } = await supabase.from('session_members').select('user_id,current_chapter,membership_status,profiles(display_name,avatar_url)').eq('session_id', id);
    if (data) setSession(prev => prev ? { ...prev, session_members: data as unknown as Session['session_members'] } : prev);
   });
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
 }, [id, refreshComments, user]);

 // Realtime filters reactions by comment_id, keeping each subscription scoped to this session.
 useEffect(() => {
  if (!comments.length) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const channel = supabase.channel(`comment-reactions-${id}-${comments.map(c => c.id).join('-')}`);
  comments.forEach(c => channel.on('postgres_changes', { event: '*', schema: 'public', table: 'reactions', filter: `comment_id=eq.${c.id}` }, () => { void refreshComments(); }));
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
 }, [comments.map(c => c.id).join(','), id, refreshComments]);

 async function join() {
  const supabase = getSupabase(); if (!supabase) return;
  const { data: { user: u } } = await supabase.auth.getUser();
  if (!u) { window.location.href = '/auth/sign-in'; return; }
  const { error } = await supabase.from('session_members').upsert({ session_id: id, user_id: u.id, membership_status: 'active' }, { onConflict: 'session_id,user_id' });
  if (error) setMessage(error.message); else { setMember(true); setUser(u.id); }
 }

 async function saveProgress(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); const supabase = getSupabase(); if (!supabase) return;
  const { error } = await supabase.from('session_members').update({ current_chapter: Number(chapter), progress_note: note || null, last_progress_at: new Date().toISOString() }).eq('session_id', id).eq('user_id', user);
  setMessage(error ? error.message : t('circle.savedProgress'));
 }

 async function comment(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); const form = e.currentTarget; const values = new FormData(form);
  const content = String(values.get('comment') ?? '').trim(); const chapterReference = values.get('chapter') ? Number(values.get('chapter')) : null;
  const supabase = getSupabase(); if (!supabase || !user) return;
  const { error } = await supabase.from('comments').insert({ session_id: id, user_id: user, content, chapter_reference: chapterReference });
  if (error) setMessage(error.message); else { form.reset(); setMessage(t('circle.notePosted')); await refreshComments(); }
 }

 async function toggleReaction(commentId: string, emoji: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  if (!user) { window.location.href = '/auth/sign-in'; return; }
  setReactingTo(commentId); setMessage('');
  const comment = comments.find(c => c.id === commentId);
  const existing = comment?.reactions.find(r => r.user_id === user);
  let error;
  if (existing?.emoji === emoji) {
   ({ error } = await supabase.from('reactions').delete().eq('id', existing.id));
  } else if (existing) {
   ({ error } = await supabase.from('reactions').update({ emoji }).eq('id', existing.id));
  } else {
   ({ error } = await supabase.from('reactions').insert({ comment_id: commentId, user_id: user, emoji }));
  }
  if (error) setMessage(error.message);
  else await refreshComments();
  setReactingTo(null);
 }

 if (id.startsWith('sample-')) return <><Header /><main className="form-page"><Link href="/" className="back-link"><ArrowLeft size={16} /> {t('nav.discover')}</Link><div className="form-panel"><div className="eyebrow">{t('circle.preview')}</div><h1>{t('circle.previewTitle')}</h1><p>{t('circle.previewText')}</p><Link className="button button-dark" href="/auth/sign-up">{t('circle.join')} ↗</Link></div></main></>;
 const members = (session?.session_members ?? []).filter(m => m.membership_status === 'active');
 const average = members.length && session ? Math.round(members.reduce((a, m) => a + m.current_chapter / session.total_chapters, 0) / members.length * 100) : 0;
 return <><Header /><main className="detail-page shell"><Link href="/sessions" className="back-link"><ArrowLeft size={16} /> {t('circle.all')}</Link>{session ? <><section className="detail-hero"><div className="detail-book"><BookOpen size={44} /><span>{session.book_title}</span><small>{session.author}</small></div><div className="detail-main"><div className="eyebrow">{t('circle.eyebrow')}</div><h1>{session.book_title}</h1><p className="detail-author">{t('circle.by', { author: session.author })}</p><p className="detail-description">{session.description || t('circle.hostedBy', { name: session.profiles?.display_name ?? t('circle.reader') })}</p><div className="detail-stats"><span><BookOpen size={16} /> {t('circle.chapters', { count: session.total_chapters })}</span>{user && <><span><Users size={16} /> {t('circle.readers', { count: members.length })}</span><span>{t('circle.groupProgress', { percent: average })}</span></> }</div>{!member && session.status === 'active' && <button className="button button-dark" onClick={join}>{t('circle.joinAction')} <span>↗</span></button>}</div></section>{user && <section className="reader-progress" aria-labelledby="reader-progress-title"><div className="reader-progress-heading"><div><div className="eyebrow">{t('circle.progressEyebrow')}</div><h2 id="reader-progress-title">{t('circle.progressTitle')} <span className="heading-dot">.</span></h2></div><span>{members.length} {members.length === 1 ? t('circle.reader') : t('circle.readersPlural')}</span></div>{members.length ? <div className="reader-progress-list">{members.map((m, index) => { const percent = Math.max(0, Math.min(100, Math.round(m.current_chapter / session.total_chapters * 100))); const displayName = m.profiles?.display_name ?? t('circle.reader'); const isCurrentReader = m.user_id === user; return <div className={`reader-progress-item ${isCurrentReader ? 'is-current-reader' : ''}`} key={m.user_id ?? index}><div className="reader-progress-meta"><span className="reader-progress-name"><Avatar name={displayName} src={m.profiles?.avatar_url} size={31} className={`reader-avatar tone-${index % 4}`} /><span className="reader-display-name">{displayName}</span>{isCurrentReader && <span className="you-pill">{t('circle.you')}</span>}</span><span className="reader-progress-chapters">{t('circle.progressPrompt', { current: m.current_chapter, total: session.total_chapters })}<b>{percent}%</b></span></div><div className="progress-track" role="progressbar" aria-label={t('circle.progressTitle')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }} /></div></div>; })}</div> : <p className="reader-progress-empty">{t('circle.noReaders')}</p>}</section>}{member && <form className="progress-panel" onSubmit={saveProgress}><div><h2>{t('circle.yourReading')}</h2><p>{t('circle.keepPlace')}</p></div><label>{t('circle.chapter')}<input aria-label={t('circle.chapter')} type="number" min="0" max={session.total_chapters} value={chapter} onChange={e => setChapter(e.target.value)} /></label><label className="progress-note">{t('circle.note')} <input value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder={t('circle.optionalThought')} /></label><button className="button button-dark" type="submit">{t('circle.saveProgress')}</button></form>}<section className="discussion"><div className="discussion-heading"><div><div className="eyebrow">{t('circle.conversation')}</div><h2>{t('circle.readingNotes')} <span className="heading-dot">.</span></h2></div><span><MessageCircle size={16} /> {t('circle.notesCount', { count: comments.length })}</span></div>{comments.length ? comments.map(c => { const reactionDetails = reactionOptions.flatMap(emoji => { const names = c.reactions.filter(r => r.emoji === emoji).map(r => r.profiles?.display_name ?? t('circle.reader')); return names.length ? [`${emoji} ${names.join(', ')}`] : []; }); return <article className="comment" key={c.id}><Avatar name={c.profiles?.display_name} src={c.profiles?.avatar_url} size={31} className="comment-avatar" /><div className="comment-content"><strong>{c.profiles?.display_name ?? t('circle.reader')}</strong>{c.chapter_reference && <span className="chapter-tag">{t('circle.chapter')} {c.chapter_reference}</span>}<p>{c.content}</p><small>{new Date(c.created_at).toLocaleDateString(locale === 'my' ? 'my-MM' : locale === 'ja' ? 'ja-JP' : 'en-US')}</small><div className="reaction-row" aria-label={t('circle.reactTitle', { name: c.profiles?.display_name ?? t('circle.reader') })}>
  {reactionOptions.map(emoji => { const reactions = c.reactions.filter(r => r.emoji === emoji); const names = reactions.map(r => r.profiles?.display_name ?? t('circle.reader')); const mine = reactions.some(r => r.user_id === user); const displayName = c.profiles?.display_name ?? t('circle.reader'); return <button type="button" key={emoji} className={`reaction-chip ${reactions.length ? 'has-reactions' : ''} ${mine ? 'my-reaction' : ''}`} disabled={reactingTo === c.id} title={names.length ? t('circle.reacted', { names: names.join(', '), emoji }) : t('circle.reactWith', { emoji })} aria-label={names.length ? t('circle.reactionCount', { emoji, count: reactions.length }) + (mine ? `, ${t('circle.yourReaction')}` : '') + `: ${names.join(', ')}` : t('circle.addReaction', { emoji })} onClick={() => void toggleReaction(c.id, emoji)}><span>{emoji}</span>{reactions.length > 0 && <span>{reactions.length}</span>}</button>; })}
  {!user && <Link className="react-signin" href="/auth/sign-in">{t('circle.signInReact')}</Link>}
 </div>{reactionDetails.length > 0 && <div className="reaction-details">{reactionDetails.map(detail => <span key={detail}>{detail}</span>)}</div>}</div></article>; }) : <div className="empty-discussion">{t('circle.quiet')}</div>}{member && session.status === 'active' && <form className="comment-form" onSubmit={comment}><input name="comment" required maxLength={2000} placeholder={t('circle.commentPlaceholder')} /><input className="chapter-input" name="chapter" type="number" min="1" max={session.total_chapters} placeholder={t('circle.chapterPlaceholder')} /><button className="button button-dark">{t('circle.postNote')} ↗</button></form>}{message && <div className="form-message" role="status">{message}</div>}</section></> : <div className="loading-row">{t('circle.loading')}</div>}</main></>;
}
