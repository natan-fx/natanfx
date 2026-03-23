
# Stack Vercel — Master Build (Padrão de Produção Enterprise)

**Versão:** 17.0 (The Endgame - Vercel Master Stack)  
**Data:** 14 de Março de 2026  
**Status:** ✅ Production-Ready + Zero Runtime Errors + High-Scale Hardened  
**Base:** Next.js 16.1.6 LTS · React 19.2 · Vercel Production Standards 2026 · TypeScript Strict

---

## As 10 Leis Intocáveis da Arquitetura

1. **A Regra dos <10ms no `proxy.ts` (Node.js):** A fronteira de rede corre no Node.js. É proibido fazer I/O de disco ou queries densas no _hot path_ de cada request. O Proxy injeta a CSP estrita no _Response/Request_ e extrai IPs de forma segura para impedir _spoofing_.

2. **Transações Magras (Lean Transactions):** Processamento que exige CPU (como gerar hash de senhas com `bcrypt`) deve ocorrer **FORA** do bloco `db.transaction()`. A transação deve ser restrita apenas a queries I/O para evitar a exaustão do _Connection Pool_ no PostgreSQL.

3. **Server Actions & Memory Leaks:** Tarefas pesadas delegam para filas via _fire-and-forget_ seguro (`await task.trigger()`). Timeouts de I/O via `Promise.race` exigem a limpeza imediata do _Event Loop_ através de `clearTimeout` no bloco `finally`.

4. **Formulários — Simples vs. RHF:** Para formulários simples (1–6 campos), use `useActionState`. Para formulários complexos, use React Hook Form + `@hookform/resolvers/zod` + `next-safe-action`, sendo obrigatório validar os dados no cliente via `handleSubmit` antes de tocar no servidor.

5. **Arquitetura DTO & Outbox Transacional:** Mutações usam `db.transaction()` acoplando a inserção da entidade principal e o seu evento na tabela **Outbox**. Um Worker externo deve processar o Outbox para garantir a entrega distribuída sem perdas.

6. **Invalidação de Cache Tipada:** A diretiva `'use cache'` é mandatória. O uso de _magic strings_ para tags é proibido; utilize obrigatoriamente o helper genérico `lib/cache.ts` com `revalidateTag`.

7. **Error Boundaries & Observabilidade:** Isolamento total de falhas via `app/error.tsx` e `app/global-error.tsx` (ambos exigem `"use client"`). Toda requisição propaga um `x-request-id` mapeado no logger estruturado `pino.child()`.

8. **O Mito do `"use client"`:** Providers NÃO contaminam os componentes filhos passados via propriedade `children`. A contaminação (transformar tudo em _client-side_) só ocorre se importar um _Server Component_ dentro de um arquivo `"use client"`.

9. **Fronteira Inquebrável do Storybook:** O Storybook suporta estritamente componentes de UI pura. É proibido usar Storybook em _Server Components_ que fazem _fetch_ de dados; estes devem ser testados via Playwright ou Vitest + MSW.

10. **Acessibilidade (a11y) Web Interface:** _Hit targets_ devem ter no mínimo 24px (44px em mobile), o uso de `user-scalable=no` é terminantemente proibido para não quebrar o zoom, e campos de `<input>` devem ter fonte ≥ 16px para evitar o auto-zoom do iOS.

---

## Índice

- [Stack Vercel — Master Build (Padrão de Produção Enterprise)](#stack-vercel--master-build-padrão-de-produção-enterprise)
  - [As 10 Leis Intocáveis da Arquitetura](#as-10-leis-intocáveis-da-arquitetura)
  - [Índice](#índice)
  - [1. Core \& Arquitetura](#1-core--arquitetura)
    - [1.1 Stack Principal](#11-stack-principal)
    - [1.2 `package.json` Base](#12-packagejson-base)
    - [1.3 TypeScript — Strict Mode](#13-typescript--strict-mode)
    - [1.4 Política de "use client" e Context Providers](#14-política-de-use-client-e-context-providers)
  - [2. Estrutura de Diretórios (Domain Layer \& DTO)](#2-estrutura-de-diretórios-domain-layer--dto)
  - [3. Qualidade \& Linting (Biome)](#3-qualidade--linting-biome)
    - [3.1 Política shadcn/ui + Biome — Atrito Gerenciado](#31-política-shadcnui--biome--atrito-gerenciado)
  - [4. Configuração do Next.js (React Compiler)](#4-configuração-do-nextjs-react-compiler)
  - [5. Network Boundary — proxy.ts (CSP SSR Fix \& Request ID)](#5-network-boundary--proxyts-csp-ssr-fix--request-id)
  - [6. Async Params \& Caching (Cache Layer Helper)](#6-async-params--caching-cache-layer-helper)
    - [6.1 Async Params (v16)](#61-async-params-v16)
    - [6.2 Cache Layer Padronizada](#62-cache-layer-padronizada)
  - [7. Estilização \& Tipografia](#7-estilização--tipografia)
    - [7.1 Tailwind CSS v4 — CSS-Only](#71-tailwind-css-v4--css-only)
    - [7.2 Extração do Nonce no Layout](#72-extração-do-nonce-no-layout)
    - [7.3 Padrões de Acessibilidade (MUST — AGENTS.md Vercel)](#73-padrões-de-acessibilidade-must--agentsmd-vercel)
    - [7.4 Storybook — Fronteira Arquitetural Inquebrável](#74-storybook--fronteira-arquitetural-inquebrável)
  - [8. Estado, Formulários \& URL](#8-estado-formulários--url)
    - [8.1 Fronteira Server/Client — Regra de Decisão](#81-fronteira-serverclient--regra-de-decisão)
    - [8.2 State na URL (nuqs)](#82-state-na-url-nuqs)
    - [8.3 React Hook Form + next-safe-action](#83-react-hook-form--next-safe-action)
  - [9. Backend, Server Actions \& Lean Transactions](#9-backend-server-actions--lean-transactions)
    - [9.1 A Camada DTO](#91-a-camada-dto)
    - [9.2 Action com Lean Transaction e DB](#92-action-com-lean-transaction-e-db)
    - [9.3 Jobs Protegidos Contra Vazamento de Memória (Timers Limpos)](#93-jobs-protegidos-contra-vazamento-de-memória-timers-limpos)
    - [9.4 O Motor do Outbox (Cron)](#94-o-motor-do-outbox-cron)
  - [10. Banco de Dados (Singleton DB, TX Types \& Outbox)](#10-banco-de-dados-singleton-db-tx-types--outbox)
  - [11. Autenticação (bcryptjs Array-Fix)](#11-autenticação-bcryptjs-array-fix)
  - [12. Segurança \& Rate Limit (QuickLRU Passivo)](#12-segurança--rate-limit-quicklru-passivo)
  - [13. Observabilidade, Tracing \& Logs (DX, Pino)](#13-observabilidade-tracing--logs-dx-pino)
  - [14. Internacionalização](#14-internacionalização)
  - [15. Variáveis de Ambiente](#15-variáveis-de-ambiente)
  - [16. DevOps \& CI/CD](#16-devops--cicd)
    - [16.1 Defesa Local (Git Hooks \& Conventional Commits)](#161-defesa-local-git-hooks--conventional-commits)
  - [17. Testes (Playwright + Vitest)](#17-testes-playwright--vitest)
  - [18. AGENTS.md — Contexto para IA](#18-agentsmd--contexto-para-ia)

---

## 1. Core & Arquitetura

### 1.1 Stack Principal

| Ferramenta | Versão | Função |
| :--- | :--- | :--- |
| **Next.js** | 16.1.6 LTS | Framework React — App Router, Cache Components (`'use cache'`) |
| **React** | 19.2.3 | UI — Server Components, Actions, `useActionState` |
| **Turbopack** | Stable | Bundler Rust-based — 5–10× mais rápido, ~700ms cold start |
| **Node.js** | >= 20.9.0 | Runtime base obrigatório na Vercel para v16 |
| **TypeScript** | 5.x | Strict Mode otimizado (sem conflito Zod/RHF) |
| **Tailwind CSS** | v4 | Utility-first CSS-first — sem config js |
| **Biome** | v1.9+ | Lint + Format — substitui ESLint + Prettier |
| **Drizzle ORM** | 0.38+ | Type-safe SQL com `postgres-js` |

### 1.2 `package.json` Base

```json
{
  "name": "myapp",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "lint": "biome check --write .",
    "format": "biome format --write .",
    "type-check": "tsc --noEmit",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^16.1.6",
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "zod": "^3.23.8",
    "postgres": "^3.4.6",
    "drizzle-orm": "^0.38.0",
    "bcryptjs": "^2.4.3",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "next-safe-action": "^7.9.3",
    "next-intl": "^3.29.0",
    "nuqs": "^2.2.3",
    "@t3-oss/env-nextjs": "^0.11.1",
    "@sentry/nextjs": "^8.18.0",
    "posthog-js": "^1.160.0",
    "posthog-node": "^4.0.0",
    "@vercel/otel": "^1.10.0",
    "@opentelemetry/api": "^1.9.0",
    "pino": "^9.0.0",
    "@vercel/edge-config": "^1.1.0",
    "@upstash/redis": "^1.30.0",
    "@upstash/ratelimit": "^1.1.0",
    "trigger.dev": "^3.0.0",
    "resend": "^4.0.0",
    "quick-lru": "^7.0.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^19.0.3",
    "@types/react-dom": "^19.0.2",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.6.3",
    "@biomejs/biome": "^1.9.2",
    "drizzle-kit": "^0.27.2",
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@playwright/test": "^1.48.2",
    "pino-pretty": "^11.0.0"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}

```

### 1.3 TypeScript — Strict Mode

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },
    
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "noEmitOnError": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist", "build"]
}

```

### 1.4 Política de "use client" e Context Providers

Server Component é o padrão — nunca adicionar `"use client"` sem necessidade objetiva.

Adicionar `"use client"` **apenas** quando o componente usar:

- `useState` / `useReducer` / `useEffect`
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`localStorage`, `window`, `navigator`, etc.)
- Hooks de terceiros que requerem client
- **Context Providers** (ThemeProvider, AuthProvider, Zustand store provider) — obrigatoriamente `"use client"` para instanciar estado na árvore

Qualquer outra situação → Server Component.

> **⚠️ Providers NÃO contaminam filhos passados via `children`.** > A contaminação acontece apenas quando um Server Component é **importado dentro** de um arquivo `"use client"` — não quando é passado via prop `children`. Um `<ThemeProvider>` marcado com `"use client"` renderiza Server Components em seu `children` sem problema.

```tsx
 // ✅ CORRETO — layout.tsx é Server Component
 // ThemeProvider é "use client", mas children mantém-se Server Component
 export default function RootLayout({ children }: { children: React.ReactNode }) {
   return (
     <ThemeProvider attribute="class" defaultTheme="dark">
       {children}
     </ThemeProvider>
   )
 }
```

```tsx
 // ❌ ERRADO — importar Server Component DENTRO de arquivo "use client"
 'use client'
 import { ServerDataComponent } from './server-data' // ← isso sim contamina a árvore
```

---

## 2. Estrutura de Diretórios (Domain Layer & DTO)

```text
apps/web/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── api/
│   │   ├── health/route.ts           
│   │   └── security/csp-report/route.ts 
│   ├── globals.css               
│   ├── error.tsx                 # ✅ Requer 'use client'
│   ├── global-error.tsx          # ✅ Requer 'use client'
│   └── layout.tsx
├── components/
├── lib/
│   ├── env.ts
│   ├── logger.ts                 
│   ├── ratelimit.ts
│   ├── safe-action.ts
│   ├── cache.ts                  
│   ├── features.ts               
│   ├── password.ts               
│   ├── resend.ts
│   ├── middleware/
│   │   └── ratelimit.ts          
│   └── db/
│       ├── index.ts              # ✅ Singleton & Utility Types (TX)
│       └── schema/               
│           ├── users.ts
│           ├── outbox.ts         
│           └── index.ts          
├── modules/
│   ├── system/
│   │   └── outbox.jobs.ts        # ✅ Cron Job do Outbox
│   ├── users/
│   │   ├── user.service.ts       
│   │   ├── user.repository.ts    
│   │   ├── user.schema.ts
│   │   ├── user.dto.ts           # ✅ DTO blindando o Model
│   │   └── user.jobs.ts          
│   └── products/
├── proxy.ts                      
└── next.config.ts

```

---

## 3. Qualidade & Linting (Biome)

`biome.json`:

```json
{
  "$schema": "[https://biomejs.dev/schemas/1.9.3/schema.json](https://biomejs.dev/schemas/1.9.3/schema.json)",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "formatWithTabs": false,
    "indentSize": 2,
    "lineWidth": 100,
    "trailingComma": "es5",
    "singleQuote": true,
    "bracketSameLine": false,
    "bracketSpacing": true,
    "arrowParentheses": "asNeeded"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "warn", "noConstAssign": "error" },
      "correctness": { "noUnusedVariables": "error", "noUnusedImports": "error" }
    }
  },
  "javascript": {
    "formatter": { "semicolons": "always", "quoteStyle": "single" },
    "globals": ["window", "document", "navigator", "fetch", "React", "JSX"]
  },
  "overrides": [
    {
      "include": ["components/ui/**"],
      "linter": { "rules": { "a11y": { "enabled": false } } }
    }
  ]
}

```

### 3.1 Política shadcn/ui + Biome — Atrito Gerenciado

O código gerado pela CLI do shadcn não vem formatado nos padrões do Biome e pode conter padrões de a11y que o Biome rejeita como erro. A estratégia é em duas camadas:

- **Camada 1 — Override no `biome.json`:** os caminhos `components/ui/**` ficam em quarentena de a11y. Eles são substituídos a cada `shadcn add` e não são de ownership do time.
- **Camada 2 — Política de ownership documentada:**
  - `components/ui/` → owned pelo shadcn, não editado manualmente, sem regras de a11y do Biome.
  - `components/` (fora de `ui/`) → owned pelo time, regras completas do Biome aplicadas.
  - Qualquer customização de componente shadcn: **copiar para `components/` e editar lá** — nunca editar dentro de `components/ui/`.

---

## 4. Configuração do Next.js (React Compiler)

> **⚠️ AVISO DE RISCO:** `reactCompiler: true` pode gerar falhas de hidratação. Desative ao primeiro sinal de instabilidade gráfica.

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.vercel.app' }],  // Atualizado para v0.dev/v0-ui
    formats: ['image/avif', 'image/webp']
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      }
    ]
  },
}

export default nextConfig

```

---

## 5. Network Boundary — proxy.ts (CSP SSR Fix & Request ID)

A injeção do cabeçalho `Content-Security-Policy` no _Request_ com o prefixo `x-middleware-request-` é mandatória para o SSR do Next.js ler e aplicar automaticamente o _nonce_ nos _scripts_ nativos.

```ts
// apps/web/proxy.ts
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { rateLimitMiddleware } from '@/lib/middleware/ratelimit'
import { createMiddleware, routing } from '@/lib/i18n/routing'
import { get } from '@vercel/edge-config';  // Remote flags sem rebuild [file:37]

const i18nMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const strictCSP = await get('csp-strict') ?? true;
  // ── 1. Geração de Request ID e Traceparent ──
  const requestId = crypto.randomUUID()
  const traceparent = request.headers.get('traceparent') ?? ''

  // ── 2. Rate Limiting (< 10ms, Fail-Open) ──
  const path = request.nextUrl.pathname
  const endpoint = path.startsWith('/api/auth') ? 'login' : 'api'

  const rateLimitResponse = await rateLimitMiddleware(request, endpoint, requestId)
  if (rateLimitResponse) {
    rateLimitResponse.headers.set('x-request-id', requestId)
    return rateLimitResponse
  }

  // ── 3. Middleware de Roteamento (Redirects de Lang) ──
  const response = i18nMiddleware(request)
  if (response.status >= 300 && response.status < 400) {
    return response // Redirecionamentos vazam puros
  }

  // ── 4. Nonce URL Safe ──
  const nonce = crypto.randomBytes(16).toString('base64url')

  // ── 5. CSP Estrita ──
  const cspRaw = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' https:`,
    "style-src 'self' 'unsafe-inline'", // Essencial para React/Tailwind runtime
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' [https://us.posthog.com](https://us.posthog.com) https://*.posthog.com https://*.sentry.io https://*.vercel-analytics.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "require-trusted-types-for 'script'",
    "trusted-types nextjs"
  ].join('; ')

  const cspHeader = cspRaw.replace(/\s{2,}/g, ' ').trim()

  // ── 6. Headers de Response (Browser) ──
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('Content-Security-Policy-Report-Only', `${cspHeader}; report-uri /api/security/csp-report`)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')

  // ── 7. Headers de Request Interno (Next.js SSR/Server Components) ──
  response.headers.set('x-middleware-request-content-security-policy', cspHeader)
  response.headers.set('x-middleware-request-x-nonce', nonce)
  response.headers.set('x-middleware-request-x-request-id', requestId)
  if (traceparent) response.headers.set('x-middleware-request-traceparent', traceparent)
  response.headers.set('x-request-id', requestId)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)',
  ],
}

```

```ts
// app/api/security/csp-report/route.ts
export async function POST(request: Request) {
  // Monitoria de ataques front-end injetada no Datadog/Sentry
  return new Response(null, { status: 204 })
}

```

---

## 6. Async Params & Caching (Cache Layer Helper)

### 6.1 Async Params (v16)

```ts
// app/posts/[id]/page.tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams

  return <div>Post {id} - Tab {tab}</div>
}

```

### 6.2 Cache Layer Padronizada

```ts
// lib/cache.ts
import { unstable_cache } from 'next/cache';
import { revalidateTag, updateTag } from 'next/cache'

export const getUser = unstable_cache(
  async (id: string) => db.query.users.findFirst({ where: eq(users.id, id) }),
  ['users'],
  { revalidate: 3600, tags: ['user'] }
);

export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  post: (id: string) => `post:${id}`,
  posts: () => 'posts',
}

export function invalidateEntity(key: string, profile: 'hours' | 'days' | 'weeks' = 'hours') {
  revalidateTag(key, profile)
  updateTag(key)
}

```

---

## 7. Estilização & Tipografia

### 7.1 Tailwind CSS v4 — CSS-Only

```css
/* apps/web/app/globals.css */
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

```

### 7.2 Extração do Nonce no Layout

O prefixo `x-middleware-request-` desaparece internamente. Lemos via `x-nonce`.

```ts
// apps/web/app/layout.tsx
import { GeistSans } from 'geist/font/sans'
import { headers } from 'next/headers'
import { NonceProvider } from '@/components/providers/nonce-provider'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? ''

  return (
    <html lang="pt-BR" className={GeistSans.variable} suppressHydrationWarning>
      <body className="antialiased">
        <NonceProvider nonce={nonce}>
          {children}
        </NonceProvider>
      </body>
    </html>
  )
}

```

### 7.3 Padrões de Acessibilidade (MUST — AGENTS.md Vercel)

- `prefers-reduced-motion` respeitado em todas as animações — fornecer variante reduzida.
- Hit targets ≥ 24px (mobile ≥ 44px).
- `<input>` font-size ≥ 16px em mobile (evita auto-zoom do iOS que quebra o layout).
- `user-scalable=no` é **banido**.
- Links usam `<a>` ou `<Link>` — **nunca** `<div onClick>` para navegação.
- Todo botão icon-only tem `aria-label` descritivo.
- Elementos nativos (`button`, `a`, `label`) antes de ARIA.
- `:focus-visible` obrigatório — `outline: none` banido sem substituto visual.

### 7.4 Storybook — Fronteira Arquitetural Inquebrável

O Storybook **não suporta Server Components com lógica de dados** de forma prática. A regra é arquitetural: se um componente precisa de Storybook, ele não deve ter fetch acoplado.

| Tipo de componente | Ferramenta | Regra |
|:---|:---|:---|
| **UI pura** (props → JSX, sem fetch) | **Storybook** | Cobrir: default, empty, error, loading |
| **Client Component** (hooks/eventos) | **Storybook** + Vitest | Testar comportamento WAI-ARIA, não CSS |
| **Server Component** (faz fetch) | **Playwright** ou **Vitest + MSW** | ❌ Proibido no Storybook |

> **Regra de arquitetura derivada:** se um Server Component tem UI complexa e também faz fetch, ele foi mal separado. O correto é extrair a UI como componente puro (recebe dados via props) e manter o fetch no componente pai.

---

## 8. Estado, Formulários & URL

### 8.1 Fronteira Server/Client — Regra de Decisão

Antes de criar um `useState`, consulte a matriz de estado da aplicação:

| Situação                                               | Solução                                              |
| :----------------------------------------------------- | :--------------------------------------------------- |
| Dado que não muda após o carregamento                  | Server Component — sem fetch no cliente              |
| Dado que o usuário pode refrescar ou invalidar         | TanStack Query                                       |
| Mutação (criar, editar, deletar)                       | Server Action (`next-safe-action`)                   |
| Mutação com feedback imediato na UI                    | Server Action + optimistic update via TanStack Query |
| Estado de UI compartilhável (filtros, abas, paginação) | nuqs (URL como estado)                               |
| Estado de UI local e temporário                        | `useState` ou Zustand                                |
| Formulário Complexo (> 6 campos)                       | React Hook Form + Zod (`handleSubmit` no cliente)    |
| Multi-step Wizard Complexo                             | XState (>3 estados) ou Zustand                       |

### 8.2 State na URL (nuqs)

```ts
'use client'
import { useQueryState, parseAsInteger } from 'nuqs'

export function Pagination() {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  return <button onClick={() => setPage(page + 1)}>Next ({page})</button>
}

```

### 8.3 React Hook Form + next-safe-action

```ts
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { createProductAction } from '@/app/actions/products'
import { productSchema } from '@/lib/validations/product'

export function ProductForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema)
  })
  const { executeAsync, isPending } = useAction(createProductAction)

  return (
    <form onSubmit={handleSubmit(async data => await executeAsync(data))}>
      <input {...register('name')} />
      {errors.name && <span>{String(errors.name.message)}</span>}
      <button disabled={isPending}>Salvar</button>
    </form>
  )
}

```

---

## 9. Backend, Server Actions & Lean Transactions

> **O Fator Lean Transaction:** Cálculos criptográficos (`bcrypt`) bloqueiam o Node.js de 100ms a 300ms. Esse tempo não pode estar dentro do `db.transaction`, senão esgota as conexões do banco rapidamente.

### 9.1 A Camada DTO

```ts
// modules/users/user.dto.ts
export function toUserDTO(user: any) {
  // Blinda vazamento de hashes para o cliente via JSON
  return { 
    id: String(user.id), 
    email: user.email, 
    name: user.name 
  }
}

```

### 9.2 Action com Lean Transaction e DB

```ts
// app/actions/users.ts
'use server'
import { action } from '@/lib/safe-action'
import { UserService } from '@/modules/users/user.service'
import { sendWelcomeEmailTask } from '@/modules/users/user.jobs'
import { db } from '@/lib/db'
import { outbox } from '@/lib/db/schema/outbox'
import { registerSchema } from '@/modules/users/user.schema'
import { toUserDTO } from '@/modules/users/user.dto'
import { hashPassword } from '@/lib/password'

export const registerUserAction = action
  .schema(registerSchema)
  .action(async ({ parsedInput }) => {
    // 1. CPU-BOUND: Resolve o hash ANTES da transação para proteger as conexões (Lean Transaction)
    const passwordHash = await hashPassword(parsedInput.password)
    const userData = { ...parsedInput, passwordHash }

    // 2. I/O-BOUND: Transação puramente de escrita super-rápida (< 5ms)
    const userDto = await db.transaction(async (tx) => {
      const rawUser = await UserService.register(userData, tx)
      const dto = toUserDTO(rawUser)

      // Padrão Outbox
      await tx.insert(outbox).values({
        eventType: 'UserRegistered',
        payload: { userId: dto.id }
      })

      return dto
    })

    // 3. Await no job assegura que o Vercel não congela o Event Loop antes do trigger
    await sendWelcomeEmailTask.trigger({
      email: userDto.email,
      name: userDto.name,
    })

    return { success: true, userId: userDto.id }
  })

```

```ts
// modules/users/user.service.ts
import { DBTransaction } from '@/lib/db'
import { users } from '@/lib/db/schema/users'

export class UserService {
  static async register(data: any, tx: DBTransaction) {
    return (await tx.insert(users).values(data).returning())[0]
  }
}

```

### 9.3 Jobs Protegidos Contra Vazamento de Memória (Timers Limpos)

```ts
// modules/users/user.jobs.ts
import { task } from '@trigger.dev/sdk/v3'
import { resend } from '@/lib/resend'

export const sendWelcomeEmailTask = task({
  id: 'send-welcome-email',
  maxDuration: 60,
  run: async (payload: { email: string; name: string }) => {
    let timer: NodeJS.Timeout;
    
    // Timer wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Resend API Timeout')), 20000);
    });

    try {
      await Promise.race([
        resend.emails.send({
          to: payload.email,
          subject: 'Bem-vindo!',
          html: `<p>Olá, ${payload.name}</p>`,
          from: 'no-reply@exemplo.com',
        }),
        timeoutPromise
      ]);
    } finally {
      // ✅ Crucial para evitar memory leaks (Gb/s faturados) em Serverless
      clearTimeout(timer!); 
    }
  },
})

```

### 9.4 O Motor do Outbox (Cron)

```ts
// modules/system/outbox.jobs.ts
import { schedules } from '@trigger.dev/sdk/v3'
import { db } from '@/lib/db'
import { outbox } from '@/lib/db/schema/outbox'
import { eq } from 'drizzle-orm'

export const processOutboxTask = schedules.task({
  id: 'process-outbox',
  cron: '* * * * *', // Roda a cada 1 minuto garantindo entrega distribuída
  run: async () => {
    const pendingEvents = await db.select().from(outbox).where(eq(outbox.processed, false)).limit(100)
    
    for (const event of pendingEvents) {
      try {
        // Enviar para microserviços, Kafka, etc
        // await publishEvent(event)
        await db.update(outbox).set({ processed: true }).where(eq(outbox.id, event.id))
      } catch (err) {
        console.error(`Falha no outbox ${event.id}`, err)
      }
    }
  }
})

```

---

## 10. Banco de Dados (Singleton DB, TX Types & Outbox)

🚨 **LEI DE MIGRAÇÕES:** Forward-Only.

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
})

```

```ts
// lib/db/index.ts
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { PgTransaction } from 'drizzle-orm/pg-core'
import { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import { ExtractTablesWithRelations } from 'drizzle-orm'
import * as schema from './schema'
import { env } from '@/lib/env' // ✅ Import tipado

export type DBTransaction = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const client = globalForDb.conn ?? postgres(env.DATABASE_URL, { // ✅ Uso seguro sem "!"
  prepare: false,
  max: 10,
})

if (env.NODE_ENV !== 'production') globalForDb.conn = client // ✅ Uso seguro

export const db = drizzle(client, { schema })
```

---

## 11. Autenticação (bcryptjs Array-Fix)

```ts
// lib/password.ts
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

```

```ts
// lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema/users'
import { verifyPassword } from '@/lib/password'

export const { handlers, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // [0] Impede o Drizzle Limit Array truthy bypass
        const user = (
          await db
            .select()
            .from(users)
            .where(eq(users.email, String(credentials.email)))
            .limit(1)
        )[0]

        if (!user) return null

        const valid = await verifyPassword(String(credentials.password), user.passwordHash)
        return valid ? { id: String(user.id), email: user.email } : null
      }
    })
  ]
})

```

---

## 12. Segurança & Rate Limit (QuickLRU Passivo)

```ts
// lib/middleware/ratelimit.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import QuickLRU from 'quick-lru'
import { loginLimiter, apiLimiter } from '@/lib/ratelimit'
import { logger } from '@/lib/logger'

type FallbackRecord = { count: number; expiresAt: number }

// Eviction automática baseada em algoritmos passivos O(1) não boqueantes
const fallbackCache = new QuickLRU<string, FallbackRecord>({ maxSize: 10000 })
const FALLBACK_TTL_MS = 60000

export async function rateLimitMiddleware(request: NextRequest, endpoint: string, requestId: string) {
  // ✅ Extração blindada contra Arrays vindos de Proxies encadeados
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = request.ip ?? 
    (forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') ?? 'unknown'))

  const userAgent = request.headers.get('user-agent') ?? 'unknown'
  const uaHash = crypto.createHash('sha256').update(userAgent).digest('hex')
  const identifier = `${ip}:${uaHash}:${endpoint}`

  const limiter = endpoint === 'login' ? loginLimiter : apiLimiter

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const headers = new Headers()
      headers.set('RateLimit-Policy', `${limit};w=60`)
      headers.set('RateLimit-Limit', limit.toString())
      headers.set('RateLimit-Remaining', remaining.toString())
      headers.set('RateLimit-Reset', new Date(reset).toISOString())
      headers.set('Retry-After', '60')

      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers })
    }
  } catch (error) {
    const reqLogger = logger.child({ requestId })
    reqLogger.warn({ err: error }, 'Redis rate limit offline, fallback enabled')

    const now = Date.now()
    const record = fallbackCache.get(identifier)

    if (record && record.expiresAt > now) {
      if (record.count >= 50) {
        return NextResponse.json({ error: 'Fallback limit' }, { status: 429 })
      }
      fallbackCache.set(identifier, { count: record.count + 1, expiresAt: record.expiresAt })
    } else {
      // ✅ Dependemos passivamente da eviction do QuickLRU e não forçamos clear() que permitiria Fail-Open global
      fallbackCache.set(identifier, { count: 1, expiresAt: now + FALLBACK_TTL_MS })
    }
  }

  return null
}

```

---

## 13. Observabilidade, Tracing & Logs (DX, Pino)

**lib/logger.ts**

```ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  formatters: {
    level: label => ({ level: label.toUpperCase() }),
  },
})

```

**lib/features.ts**

```ts
import { get } from '@vercel/edge-config'
import { unstable_cache } from 'next/cache'

// Proteção da quota limit do Edge Configs via Next.js cache
export const isFeatureEnabled = unstable_cache(
  async (flag: string) => {
    try {
      return (await get(flag)) as boolean ?? false
    } catch {
      return false
    }
  },
  ['feature-flags'],
  { revalidate: 60 }
)

```

**app/api/health/route.ts**

```ts
import { NextResponse } from 'next/server'
import { db, sql } from '@/lib/db'

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`)
    return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: String(error) }, { status: 503 })
  }
}

```

**instrumentation.ts**

```ts
import { registerOTel } from '@vercel/otel'

export function register() {
  registerOTel({ serviceName: 'myapp-web' })
}

```

---

## 14. Internacionalização

```ts
// lib/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'
import { createMiddleware } from 'next-intl/middleware'

export const routing = defineRouting({
  locales: ['pt-BR', 'en'],
  defaultLocale: 'pt-BR',
  localeDetection: true,
})

export { createMiddleware }

```

---

## 15. Variáveis de Ambiente

```ts
// lib/env.ts
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']),
    DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32),
    RESEND_API_KEY: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    SENTRY_DSN: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})

```

---

## 16. DevOps & CI/CD

### 16.1 Defesa Local (Git Hooks & Conventional Commits)

A pipeline na nuvem é a última linha de defesa. A primeira é a máquina do desenvolvedor.

**Pacotes necessários (adicionar ao `package.json`):**
`pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional`

**Configuração do `package.json`:**

```json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["biome check --write"],
    "*.{json,css,md}": ["biome format --write"]
  }
}
```

**`.husky/pre-commit`:**

``` Bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
npx lint-staged
```

**`commitlint.config.mjs` (Raiz do projeto):**

``` JavaScript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2, 'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build']
    ],
  },
}
```

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm biome lint . --max-diagnostics=unlimited
      - run: pnpm tsc --noEmit

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          NODE_ENV: production
          SKIP_ENV_VALIDATION: "true"
      - uses: actions/upload-artifact@v4
        with:
          name: next-build
          path: .next/
          retention-days: 1

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: next-build
          path: .next/
      - run: pnpm exec playwright install --with-deps

      - name: Prepare Test DB
        run: pnpm drizzle-kit push
        env:
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db

      - name: Run Playwright
        run: pnpm test:e2e
        env:
          CI: "true"
          SKIP_ENV_VALIDATION: "true"
          DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_db
          AUTH_SECRET: super-secret-fake-key-for-testing-only-123
          RESEND_API_KEY: fake-test-key

```

---

## 17. Testes (Playwright + Vitest)

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})

```

---

## 18. AGENTS.md — Contexto para IA

```md
# AGENTS.md — Instruções para AI Code Generation

**Versão:** v17.0 
**Framework Base:** Next.js 16.1.6 LTS

## Regras Arquiteturais (Non-Negotiable)

1. **Proxy Performance & CSP:** O `proxy.ts` injeta a CSP rigorosamente tratada tanto no Response quanto no Request (via header `x-middleware-request-content-security-policy` para SSR).
2. **Lean Transactions:** Cálculos CPU bound (como Hashes) acontecem ESTRITAMENTE fora do bloco `db.transaction()` para proteção contra connection drops no DB.
3. **Database Layer:** Mutações usam `db.transaction()` injetando `DBTransaction`. A entidade principal acopla sempre à tabela `outbox` na mesma TX.
4. **Serverless Lifecycle & Memory:** Background jobs com Timeouts usam `Promise.race` garantindo sempre um `clearTimeout()` no bloco `finally` para fechar Event Loops e poupar billing de GB/s.
5. **Tipagem e Erros:** DTOs impedem vazamentos. Drizzle exige acesso via `[0]` em arrays. Arrays de Proxy/IPs lidam com strings seguras `split(',')[0].trim()`. Rate limits passivos dependem de `QuickLRU` sem invocar limpezas globais manuais destrutivas.

```
