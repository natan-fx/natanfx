import { type NextRequest, NextResponse } from 'next/server';
import QuickLRU from 'quick-lru';
import { i18nMiddleware } from '@/lib/i18n/routing';
import { apiLimiter } from '@/lib/ratelimit';

const fallbackCache = new QuickLRU<string, { count: number; expiresAt: number }>({
  maxSize: 10000,
});

export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0]?.trim()
    : (request.headers.get('x-real-ip') ?? 'unknown');

  // 1. Rate Limiting Fail-Open (Resiliência)
  if (apiLimiter) {
    try {
      const { success } = await apiLimiter.limit(`api:${ip}`);
      if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    } catch {
      const now = Date.now();
      const record = fallbackCache.get(ip ?? 'unknown');
      if (record && record.expiresAt > now && record.count >= 100) {
        return NextResponse.json({ error: 'Rate limit exceeded (fallback)' }, { status: 429 });
      }
      fallbackCache.set(ip ?? 'unknown', {
        count: (record?.count ?? 0) + 1,
        expiresAt: now + 60000,
      });
    }
  }

  const response = i18nMiddleware(request);

  // 2. Nonce & CSP Estrita
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const cspRaw = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: ${isDev ? "'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: blob: https:",
    "connect-src 'self' https: https://*.posthog.com https://*.vercel-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const cspHeader = cspRaw.replace(/\s{2,}/g, ' ').trim();

  // 3. Headers de Segurança & Isolamento (Absolute Rigor)
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless'); // Isolamento flexível

  // Permissions Policy granular (Privacidade máxima)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()'
  );

  // 4. Traceability (Rastreabilidade)
  response.headers.set('x-nonce', nonce);
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-middleware-request-nonce', nonce);
  response.headers.set('x-middleware-request-x-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.well-known).*)',
  ],
};
