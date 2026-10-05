'use client';

import { BookOpen, Sparkles } from 'lucide-react';
import { Header } from '@/components/header';
import { Discover } from '@/components/discover';
import { useI18n } from '@/i18n';

export default function Home() {
  const { t } = useI18n();
  return <><Header /><main>
    <section className="hero shell">
      <div className="hero-copy"><div className="eyebrow"><Sparkles size={14} /> {t('home.eyebrow')}</div>
        <h1>{t('home.titleA')}<br /><em>{t('home.titleB')}</em></h1>
        <p>{t('home.description')}</p>
        <a className="button button-dark" href="#discover">{t('home.cta')} <BookOpen size={17} /></a>
        <div className="reader-note"><div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span>+</span></div><span>{t('home.note')}</span></div>
      </div>
      <div className="hero-art" aria-label={t('home.art')}><div className="sun-shape" /><div className="plant plant-one">✳</div><div className="shelf"><i /><i /><i /><i /><i /></div><div className="chair"><div className="chair-back" /><div className="chair-seat" /><div className="chair-leg left" /><div className="chair-leg right" /></div><div className="side-table"><div className="table-top" /><div className="table-foot" /><div className="cup">☕</div></div><div className="book-art"><span>{t('home.bookArt')}</span></div><div className="art-caption">{t('home.art')}</div></div>
    </section>
    <section className="discover-section" id="discover"><Discover /></section>
  </main><footer className="footer shell"><a className="brand" href="/"><span className="brand-mark"><BookOpen size={17} /></span> books <b>&</b> friends</a><span>{t('home.footer')}</span></footer></>;
}
