'use client';

import { ArrowLeft, Camera, Check, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/avatar';
import { Header } from '@/components/header';
import { getSupabase } from '@/lib/supabase';
import { useI18n } from '@/i18n';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfileSettings() {
  const { t } = useI18n();
  const [userId, setUserId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.assign('/auth/sign-in'); return; }
      setUserId(user.id);
      const { data, error: loadError } = await supabase.from('profiles').select('display_name,bio,avatar_url').eq('id', user.id).single();
      if (loadError) { setError(loadError.message); return; }
      setDisplayName(data.display_name ?? '');
      setBio(data.bio ?? '');
      setAvatarUrl(data.avatar_url);
    })();
  }, []);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const name = displayName.trim();
    if (!name) { setError(t('profile.nameRequired')); return; }
    setBusy(true); setError(''); setNotice('');
    const { error: saveError } = await supabase.from('profiles').update({ display_name: name, bio: bio.trim() || null }).eq('id', userId);
    if (saveError) setError(saveError.message);
    else { setDisplayName(name); window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl, displayName: name } })); setNotice(t('profile.saved')); }
    setBusy(false);
  }

  async function uploadAvatar(file: File) {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    setError(''); setNotice('');
    if (!ACCEPTED_TYPES.includes(file.type)) { setError(t('profile.choosePhoto')); return; }
    if (file.size > MAX_AVATAR_BYTES) { setError(t('profile.photoTooLarge')); return; }

    setBusy(true);
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, cacheControl: '3600' });
    if (uploadError) { setError(uploadError.message); setBusy(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
    if (profileError) {
      await supabase.storage.from('avatars').remove([path]);
      setError(profileError.message);
      setBusy(false);
      return;
    }

    const previousPath = getAvatarPath(avatarUrl);
    setAvatarUrl(publicUrl);
    window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl: publicUrl, displayName } }));
    setNotice(t('profile.photoSaved'));
    if (previousPath && previousPath !== path && previousPath.startsWith(`${userId}/`)) {
      const { error: cleanupError } = await supabase.storage.from('avatars').remove([previousPath]);
      if (cleanupError) setNotice(t('profile.photoCleanup'));
    }
    setBusy(false);
  }

  async function removeAvatar() {
    const supabase = getSupabase();
    if (!supabase || !userId || !avatarUrl) return;
    setBusy(true); setError(''); setNotice('');
    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
    if (profileError) { setError(profileError.message); setBusy(false); return; }
    setAvatarUrl(null);
    window.dispatchEvent(new CustomEvent('profile-updated', { detail: { avatarUrl: null, displayName } }));
    const path = getAvatarPath(avatarUrl);
    if (path && path.startsWith(`${userId}/`)) {
      const { error: removeError } = await supabase.storage.from('avatars').remove([path]);
      if (removeError) setNotice(t('profile.photoDeleteFailure'));
      else setNotice(t('profile.photoRemoved'));
    } else setNotice(t('profile.photoRemoved'));
    setBusy(false);
  }

  return <><Header /><main className="settings-page shell">
    <Link href="/my-reading" className="back-link"><ArrowLeft size={16} /> {t('profile.back')}</Link>
    <section className="settings-card">
      <div className="eyebrow">{t('profile.eyebrow')}</div>
      <h1>{t('profile.title')} <span className="heading-dot">.</span></h1>
      <p className="settings-intro">{t('profile.intro')}</p>
      <div className="avatar-editor">
        <Avatar name={displayName} src={avatarUrl} size={88} className="profile-avatar-large" />
        <div className="avatar-editor-copy"><strong>{t('profile.photo')}</strong><span>{t('profile.photoTypes')}</span><div className="avatar-actions"><button type="button" className="button button-dark" onClick={() => fileInput.current?.click()} disabled={busy}><Camera size={15} /> {busy ? t('profile.saving') : avatarUrl ? t('profile.changePhoto') : t('profile.uploadPhoto')}</button>{avatarUrl && <button type="button" className="remove-avatar" onClick={removeAvatar} disabled={busy}><Trash2 size={15} /> {t('profile.removePhoto')}</button>}</div></div>
        <input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" aria-label={t('profile.photo')} onChange={e => { const file = e.target.files?.[0]; if (file) void uploadAvatar(file); e.currentTarget.value = ''; }} />
      </div>
      <form className="profile-form" onSubmit={saveProfile}>
        <label>{t('profile.name')}<input value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={60} /></label>
        <label>{t('profile.bio')} <span className="optional">{t('create.optional')}</span><textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} maxLength={500} placeholder={t('profile.bioPlaceholder')} /></label>
        {error && <div role="alert" className="form-message error-message">{error}</div>}
        {notice && <div role="status" className="form-message success-message"><Check size={15} /> {notice}</div>}
        <button className="button button-dark save-profile" disabled={busy}><UserRound size={15} /> {busy ? t('profile.saving') : t('profile.save')}</button>
      </form>
    </section>
  </main></>;
}

function getAvatarPath(url: string | null) {
  if (!url) return null;
  try {
    const pathname = new URL(url).pathname;
    const marker = '/storage/v1/object/public/avatars/';
    const index = pathname.indexOf(marker);
    return index < 0 ? null : decodeURIComponent(pathname.slice(index + marker.length));
  } catch { return null; }
}
