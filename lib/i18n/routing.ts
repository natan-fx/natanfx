import createMiddleware from 'next-intl/middleware';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['br', 'en'],
  defaultLocale: 'br',
});

export const i18nMiddleware = createMiddleware(routing);

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
