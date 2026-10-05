import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/i18n';

export const metadata: Metadata = {
  title: 'Books & Friends — Read a little closer',
  description: 'Find your next good read, and good people to read it with.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><I18nProvider>{children}</I18nProvider></body></html>;
}
