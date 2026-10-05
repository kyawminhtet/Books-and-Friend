'use client';

import { BookOpen, Bell, LogOut, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { Avatar } from '@/components/avatar';
import { LanguageSelect, useI18n } from '@/i18n';

export function Header() {
  const { t } = useI18n();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    const loadProfile = async (id: string) => {
      const { data } = await supabase.from('profiles').select('display_name,avatar_url').eq('id', id).maybeSingle();
      setProfile(data);
    };
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); if (data.user) void loadProfile(data.user.id); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void loadProfile(session.user.id); else setProfile(null);
    });
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ avatarUrl: string | null; displayName: string }>).detail;
      if (detail) setProfile({ display_name: detail.displayName, avatar_url: detail.avatarUrl });
    };
    window.addEventListener('profile-updated', onProfileUpdated);
    return () => { data.subscription.unsubscribe(); window.removeEventListener('profile-updated', onProfileUpdated); };
  }, []);
  async function signOut() {
    const supabase = getSupabase();
    if (!supabase) return;
    setSigningOut(true);
    setAuthError('');
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      setSigningOut(false);
      return;
    }
    setUser(null);
    window.location.assign('/');
  }
  return <header className="topbar"><div className="shell nav"><Link className="brand" href="/"><span className="brand-mark"><BookOpen size={17} /></span> books <b>&</b> friends</Link><nav className="nav-links"><a href="#discover">{t('nav.discover')}</a><a href="#how">{t('nav.how')}</a></nav><div className="nav-actions"><LanguageSelect compact />{user ? <><Link className="nav-create" href="/sessions/create"><Plus size={16} /> {t('nav.start')}</Link><Link aria-label={t('nav.reading')} className="icon-link" href="/my-reading"><BookOpen size={17} /></Link><Link aria-label={t('nav.profile')} className="icon-link profile-nav-link" href="/settings"><Avatar name={profile?.display_name} src={profile?.avatar_url} size={32} /></Link><Link aria-label={t('nav.notifications')} className="icon-link" href="/notifications"><Bell size={18} /></Link><button type="button" className="sign-out" onClick={signOut} disabled={signingOut}><LogOut size={15} /> {signingOut ? t('nav.signingOut') : t('nav.signOut')}</button></> : <><Link className="sign-in" href="/auth/sign-in">{t('nav.signIn')}</Link><Link className="button button-small" href="/auth/sign-up">{t('nav.join')} <span>↗</span></Link></>}</div></div>{authError && <div className="header-error" role="alert">{t('nav.signOutError')} {authError}</div>}</header>;
}
