import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('Hero');

  return (
    <main>
      <h1 className="font-bold text-primary">{t('name')}</h1>
      <h2 className="text-secondary">{t('title')}</h2>
    </main>
  );
}
