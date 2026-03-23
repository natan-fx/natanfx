import { NonceProvider } from '@/components/providers/nonce-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import '../globals.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'seo.global' });

  return {
    title: {
      template: t('titleTemplate'),
      default: t('defaultTitle'),
    },
    description: t('description'),
    keywords: t('keywords').split(','),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ededed' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const headerList = await headers();
  const nonce = headerList.get('x-nonce') || headerList.get('nonce') || '';
  const messages = await getMessages();

  return (
    <html
      lang={locale === 'br' ? 'pt-BR' : locale}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <NonceProvider nonce={nonce}>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
              nonce={nonce}
            >
              {children}
            </ThemeProvider>
          </NonceProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
