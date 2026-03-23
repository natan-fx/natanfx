'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import * as React from 'react';

import { ToggleGroup, ToggleGroupItem } from './toggle-group';

export function ThemeToggle() {
  const t = useTranslations('navigation.menu');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex h-10 w-[148px] animate-pulse rounded-full bg-secondary/10" />;
  }

  return (
    <ToggleGroup
      value={theme ? [theme] : []}
      onValueChange={value => {
        const nextTheme = value[value.length - 1];
        if (nextTheme) {
          setTheme(nextTheme);
        }
      }}
      spacing={8}
      aria-label={t('theme_label')}
    >
      <ToggleGroupItem
        value="light"
        aria-label={t('theme_light')}
        className="size-10 rounded-full border border-border"
      >
        <Sun className="size-5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        aria-label={t('theme_dark')}
        className="size-10 rounded-full border border-border"
      >
        <Moon className="size-5" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        aria-label={t('theme_system')}
        className="size-10 rounded-full border border-border"
      >
        <Monitor className="size-5" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
