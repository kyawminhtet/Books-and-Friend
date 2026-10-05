'use client';

import { ArrowUpRight, BookOpen, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Avatar } from '@/components/avatar';
import type { Session } from '@/lib/types';
import { coverColors } from '@/lib/types';
import { useI18n } from '@/i18n';

const examples: Session[] = [
  { id: 'sample-1', book_title: 'Braiding Sweetgrass', author: 'Robin Wall Kimmerer', total_chapters: 32, description: 'A little wonder, a little science, and a lot to talk about.', cover_image_url: null, status: 'active', start_date: null, target_end_date: null, created_at: '', profiles: { display_name: 'Maya Chen' }, session_members: [{ current_chapter: 9, membership_status: 'active' }, { current_chapter: 14, membership_status: 'active' }, { current_chapter: 4, membership_status: 'active' }] },
  { id: 'sample-2', book_title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', total_chapters: 40, description: 'Friendship, creativity, and the worlds we make together.', cover_image_url: null, status: 'active', start_date: null, target_end_date: null, created_at: '', profiles: { display_name: 'Leo Park' }, session_members: [{ current_chapter: 18, membership_status: 'active' }, { current_chapter: 22, membership_status: 'active' }, { current_chapter: 13, membership_status: 'active' }, { current_chapter: 7, membership_status: 'active' }] },
  { id: 'sample-3', book_title: 'Crying in H Mart', author: 'Michelle Zauner', total_chapters: 16, description: 'Reading slowly, with space for the tender parts.', cover_image_url: null, status: 'active', start_date: null, target_end_date: null, created_at: '', profiles: { display_name: 'Ava Williams' }, session_members: [{ current_chapter: 6, membership_status: 'active' }, { current_chapter: 3, membership_status: 'active' }] },
];

export function Discover() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>(examples); const [query, setQuery] = useState(''); const [loading, setLoading] = useState(true); const [connected, setConnected] = useState(false); const [canSeeProgress, setCanSeeProgress] = useState(false);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }
    setConnected(true);
    const loadSessions = async (signedIn: boolean) => {
      setCanSeeProgress(signedIn);
      const fields = 'id,book_title,author,total_chapters,description,cover_image_url,status,start_date,target_end_date,created_at,profiles!reading_sessions_creator_id_fkey(display_name)';
      const selected = signedIn ? `${fields},session_members(current_chapter,membership_status,profiles(display_name,avatar_url))` : fields;
      const { data, error } = await supabase.from('reading_sessions').select(selected).eq('status', 'active').order('created_at', { ascending: false }).limit(12);
      if (!error && data) setSessions(data as unknown as Session[]);
      setLoading(false);
    };
    supabase.auth.getUser().then(({ data }) => { void loadSessions(Boolean(data.user)); });
    const { data: authState } = supabase.auth.onAuthStateChange((_event, authSession) => { void loadSessions(Boolean(authSession?.user)); });
    return () => authState.subscription.unsubscribe();
  }, []);
  const visible = useMemo(() => sessions.filter(s => `${s.book_title} ${s.author}`.toLowerCase().includes(query.toLowerCase())), [sessions, query]);
  return <div className="shell discover-wrap"><div className="section-heading"><div><div className="eyebrow">{t('discover.eyebrow')}</div><h2>{t('discover.title')} <span className="heading-dot">.</span></h2><p>{t('discover.description')}</p></div><Link className="text-link" href="/sessions">{t('discover.all')} <ArrowUpRight size={16} /></Link></div>
    <div className="discover-tools"><div className="search-box"><Search size={17} /><input aria-label={t('discover.searchLabel')} placeholder={t('discover.search')} value={query} onChange={e => setQuery(e.target.value)} /><kbd>⌘ K</kbd></div><span className="live-note"><span className="live-dot" /> {connected ? t('discover.live') : t('discover.preview')}</span></div>
    {loading ? <div className="loading-row">{t('discover.loading')}</div> : visible.length ? <div className="session-grid">{visible.map((s, i) => { const members = (s.session_members ?? []).filter(m => m.membership_status === 'active'); const avg = members.length ? Math.round(members.reduce((sum, m) => sum + m.current_chapter / s.total_chapters, 0) / members.length * 100) : 0; const sampleDescription = s.id === 'sample-1' ? t('discover.example1') : s.id === 'sample-2' ? t('discover.example2') : t('discover.example3'); return <Link className="session-card" href={s.id.startsWith('sample-') ? '/auth/sign-up' : `/sessions/${s.id}`} key={s.id}><div className={`cover ${coverColors[i % coverColors.length]}`}>{s.cover_image_url ? <img src={s.cover_image_url} alt="" /> : <><div className="cover-deco">{i % 2 === 0 ? '✳' : '✴'}</div><span className="cover-title">{s.book_title}</span><span className="cover-author">{s.author}</span><div className="cover-lines" /></>}</div><div className="card-body"><div className="card-meta"><span className="status-pill"><i /> {t('discover.reading')}</span><span className="member-count"><Users size={14} /> {members.length || 1}</span></div><h3>{s.book_title}</h3><p className="book-author">{t('circle.by', { author: s.author })}</p><p className="session-desc">{s.id.startsWith('sample-') ? sampleDescription : s.description || t('circle.hostedBy', { name: s.profiles?.display_name ?? t('circle.reader') })}</p><div className="card-bottom"><div className="mini-avatars">{members.slice(0, 3).map((m, j) => <Avatar key={m.user_id ?? j} className={`mini-avatar tone-${(i + j) % 4}`} name={m.profiles?.display_name} src={m.profiles?.avatar_url} size={20} />)}<small>{members.length ? t('discover.readers', { count: members.length }) : t('discover.first')}</small></div><div className="progress-wrap">{canSeeProgress && <><div className="progress-copy"><span>{t('discover.groupProgress')}</span><b>{avg}%</b></div><div className="progress-track"><span style={{ width: `${avg}%` }} /></div></>}</div></div></div></Link>; })}</div> : <div className="empty-state"><BookOpen size={26} /><h3>{t('discover.none')}</h3><p>{t('discover.tryAgain')}</p></div>}
    {!connected && <div className="demo-note">{t('discover.demo')}</div>}
    <div className="how-strip" id="how"><div className="how-icon"><BookOpen size={21} /></div><div><strong>{t('discover.howTitle')}</strong><span>{t('discover.howText')}</span></div><Link href="/auth/sign-up" aria-label={t('discover.joinNow')}>↗</Link></div>
  </div>;
}
