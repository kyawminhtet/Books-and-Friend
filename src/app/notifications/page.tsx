'use client';

import { Bell, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { getSupabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';

type Notice = { id: string; notification_type: string; is_read: boolean; created_at: string; session_id: string | null; actor: { display_name: string } | null; session: { book_title: string } | null };

export default function Notifications() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Notice[]>([]); const [message, setMessage] = useState('');
  useEffect(() => { const s = getSupabase(); if (!s) return; (async () => { const { data: { user } } = await s.auth.getUser(); if (!user) { window.location.href = '/auth/sign-in'; return; } const { data, error } = await s.from('notifications').select('id,notification_type,is_read,created_at,session_id,actor:profiles!notifications_actor_id_fkey(display_name),session:reading_sessions!notifications_session_id_fkey(book_title)').order('created_at', { ascending: false }).limit(50); if (error) setMessage(error.message); else setItems((data ?? []) as unknown as Notice[]); })(); }, []);
  async function markAll() { const s = getSupabase(); if (!s) return; const { data: { user } } = await s.auth.getUser(); if (!user) return; const { error } = await s.from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false); if (error) setMessage(error.message); else setItems(items.map(n => ({ ...n, is_read: true }))); }
  async function markOne(id: string) { const s = getSupabase(); if (!s) return; await s.from('notifications').update({ is_read: true }).eq('id', id); setItems(items.map(n => n.id === id ? { ...n, is_read: true } : n)); }
  return <><Header /><main className="my-page shell"><div className="discussion-heading"><div><div className="eyebrow">{t('notifications.eyebrow')}</div><h1>{t('notifications.title')} <span className="heading-dot">.</span></h1></div><button className="text-link" onClick={markAll}><CheckCheck size={15} /> {t('notifications.markAll')}</button></div>{message && <div className="form-message">{message}</div>}{items.length ? <div className="notification-list">{items.map(n => <Link onClick={() => { if (!n.is_read) void markOne(n.id); }} className={`notification-row ${n.is_read ? '' : 'unread'}`} key={n.id} href={n.session_id ? `/sessions/${n.session_id}` : '/notifications'}><span className="notification-icon"><Bell size={16} /></span><span className="notification-copy"><strong>{noticeText(n, t, t('circle.reader'), t('circle.all'))}</strong><small>{new Date(n.created_at).toLocaleString(locale === 'my' ? 'my-MM' : locale === 'ja' ? 'ja-JP' : 'en-US')}</small></span></Link>)}</div> : <div className="empty-state"><Bell size={25} /><h3>{t('notifications.emptyTitle')}</h3><p>{t('notifications.emptyText')}</p></div>}</main></>;
}
function noticeText(n: Notice, t: (key: 'notifications.comment' | 'notifications.reaction' | 'notifications.member' | 'notifications.update', values: Record<string, string>) => string, reader: string, circle: string) { const name = n.actor?.display_name ?? reader; const book = n.session?.book_title ?? circle; if (n.notification_type === 'comment') return t('notifications.comment', { name, book }); if (n.notification_type === 'reaction') return t('notifications.reaction', { name, book }); if (n.notification_type === 'member_joined') return t('notifications.member', { name, book }); return t('notifications.update', { book }); }
