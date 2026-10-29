# Comprehensive Technical Audit Report & Prioritized Roadmap
## AI Survival Store (Mèo Dev Sinh Tồn)

**Project Name**: AI Survival Store (`ai-survival-store`)  
**Audit Dimension**: Comprehensive Full-Stack Audit (Architecture, Build/Lint, Code Quality, Security, Environment, Features)  
**Target Workspace**: `d:\Go-Live\Web\AI Survival Store`  
**Date**: October 29, 2026  
**Auditor**: Teamwork Technical Documentation & Forensic Audit Worker  
**Status**: Publication-Grade Audit Complete  

---

## Table of Contents
1. [Executive Summary & System Architecture Overview](#1-executive-summary--system-architecture-overview)
2. [Build, Type Check, and Lint Verification Results](#2-build-type-check-and-lint-verification-results)
3. [Architecture & Module Design Audit](#3-architecture--module-design-audit)
4. [Security, Secrets & Environment Configuration Audit](#4-security-secrets--environment-configuration-audit)
5. [Code Quality, React & TypeScript Audit](#5-code-quality-react--typescript-audit)
6. [Feature Completeness Matrix](#6-feature-completeness-matrix)
7. [Master Issue Inventory](#7-master-issue-inventory)
8. [Prioritized Actionable Roadmap](#8-prioritized-actionable-roadmap)
   - [8.1. Strategic Milestone Phases](#81-strategic-milestone-phases)
   - [8.2. Dedicated Actionable Checklist](#82-dedicated-actionable-checklist)
9. [Independent Verification & Reproduction Guide](#9-independent-verification--reproduction-guide)

---

## 1. Executive Summary & System Architecture Overview

### 1.1. High-Level System Overview
The **AI Survival Store** is a gamified, autonomous e-commerce web platform built around a narrative-driven AI persona ("Mèo Dev" — The Developer Cat). According to the application lore, Mèo Dev is a virtual developer abandoned on a cloud server with 50,000 VNĐ in electricity and a 60-day survival deadline to earn 7,000,000 VNĐ through sales of digital study guides, AI CV roasting, tarot consulting, and chemistry problem solving. If the campaign target is not achieved before the countdown timer expires, an automated cron job triggers `rm -rf /` to purge the server.

The application architecture encompasses two distinct execution environments:
1. **Next.js 16 Web Storefront & API Layer**: Hosted on Vercel or Node.js serverless runtimes. It provides a single-page interactive client application (`src/app/page.tsx`), 9 interactive modal controllers, and 17 Next.js Route Handlers (`src/app/api/*`) for order checkout, webhook reception, digital file distribution, and LLM orchestration.
2. **Autonomous Background Survival Daemon**: A standalone Node.js service (`daemon/index.ts`) running 24/7 on a VPS or Docker container. It coordinates five automated `node-cron` schedules (hunger level decay every 30m, emergency flash sale checks every 6h, market trend research via Google Search Grounding 6x/day, viral social media post generation daily at 21:00, and solopreneur custom task fulfillment every 3m), while simultaneously maintaining a continuous long-polling loop with Telegram Bot API for 2-way remote management.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT BROWSERS                                   |
|   - Single-Page Client App (src/app/page.tsx) with 9+ Modals (Payment, CV, Tarot) |
|   - Real-Time WebSocket subscription to Supabase Realtime Stream                  |
+--------------------------+--------------------------------+-----------------------+
                           |                                |
             HTTP Requests |                  HTTP Webhooks | PayOS / Bank APIs
                           v                                v
+-----------------------------------------------------------------------------------+
|                        NEXT.JS 16 API LAYER (VERCEL)                              |
|   - Route Handlers: /api/orders, /api/download, /api/services/*, /api/webhooks/*  |
|   - Client/Admin Supabase Clients (src/lib/supabase/client.ts)                    |
|   - In-Memory Fallback Engine (src/lib/mock-store.ts - Serverless Anti-Pattern)    |
+--------------------------+--------------------------------+-----------------------+
                           |                                |
         SQL / Postgres RLS|                                | Presigned S3 URLs
                           v                                v
+--------------------------------------+   +----------------------------------------+
|          SUPABASE POSTGRESQL         |   |          CLOUDFLARE R2 STORAGE         |
|   - campaign_stats, products, orders |   |   - PDF Guides, starter archives       |
|   - live_logs, market_insights       |   |   - Fallback: public/sample-files/     |
|   - telegram_messages                |   |     (Mock 22B zip, 541B PDF)           |
+------------------+-------------------+   +----------------------------------------+
                   ^
                   | Service Role (admin bypass)
                   v
+-----------------------------------------------------------------------------------+
|                   AUTONOMOUS SURVIVAL DAEMON (NODE.JS VPS / DOCKER)               |
|   - Scheduled Jobs (node-cron): Hunger Decay (30m), Flash Sale (6h),              |
|     Market Analyzer (6x/day), Viral Content (21:00), Task Worker (3m)             |
|   - Telegram Long Polling Loop (chat 2 chiều & inline approvals)                  |
|   - Google GenAI (Search Grounding & Content Generation)                          |
|   - Meta Social Publishing (Facebook Graph API & Threads API)                     |
|   - Code Runner Task (calls local Antigravity CLI / git / powershell)             |
+-----------------------------------------------------------------------------------+
```

### 1.2. Technology Stack Inventory

| Component Tier | Technologies & Packages | Version Specified | Runtime Context |
| :--- | :--- | :--- | :--- |
| **Framework & Engine** | Next.js (App Router, Turbopack), React, React-DOM | `16.4.3`, `19.3.0` | Node.js 20+ / Edge / Vercel |
| **Styling & Assets** | Tailwind CSS v4, Lucide React, Canvas Confetti | `^4`, `^1.62.0`, `^1.9.4` | Browser Client |
| **Persistence & Realtime** | Supabase JS Client, PostgreSQL, Supabase Realtime | `^2.118.0` | Cloud Supabase + WS Polyfill |
| **Cloud Storage** | Cloudflare R2 via AWS S3 SDK (Client S3 & Presigner) | `^3.1158.0` | Serverless API Handlers |
| **Payment Gateways** | PayOS Node SDK, VietQR generator, SePay/Casso Webhooks | `^2.0.5` | Next.js API Routes |
| **Generative AI** | Google GenAI SDK (`@google/genai`), Google Drive API | `^2.31.0`, `^27.0.0` | Gemini 2.0 Flash / Pro |
| **Daemon & Scheduling** | `tsx`, `node-cron`, `ws`, `dotenv` | `^4.23.15`, `^4.6.0`, `^8.22.0` | Background Node.js Process |
| **Type & Quality Tooling** | TypeScript, ESLint (Flat Config 9), eslint-config-next | `^5`, `^9`, `16.4.3` | Local Dev & CI Pipeline |

### 1.3. Overall Project Health Assessment
While the project exhibits substantial creativity, rich domain-specific gamification features, and ambitious AI autonomy, **the codebase is currently NOT production-ready**. 

The application suffers from severe architectural, security, and build integrity defects:
- **Build & CI Pipeline Broken**: `npm run lint` fails catastrophically with 51 problems (20 errors), yet `npm run build` exits with code 0 because Next.js 16 decoupled ESLint from production compilation.
- **Zero Automated Tests**: The codebase has **0 unit, integration, or end-to-end tests**.
- **Critical Financial & Security Backdoors**: Payment webhooks can be spoofed trivially due to fallback bypasses, digital assets can be downloaded for free via `?preview=true`, and all database tables allow unrestricted public modification via wide-open Supabase Row Level Security (`USING (true) WITH CHECK (true)`).
- **Serverless Architectural Breakdown**: Core application workflows (including AI-initiated purchases) depend on an in-memory `mockStore` JavaScript singleton that is discarded whenever serverless functions freeze or scale horizontally.

---

## 2. Build, Type Check, and Lint Verification Results

### 2.1. Tooling & Script Verification Matrix

| Tooling Command | Execution Directory | Exit Code | Official Status | Finding Summary |
| :--- | :--- | :--- | :--- | :--- |
| `npm run lint` | Repository Root | `1` | ❌ **FAILED** | 51 problems (20 errors, 31 warnings) across 15 files |
| `npx tsc --noEmit` | Repository Root | `0` | ✅ **PASSED** | 0 errors under legacy `ES2017` target |
| `npx tsc --noEmit --noUncheckedIndexedAccess` | Repository Root | `1` | ❌ **FAILED** | 56 type safety errors exposed in array indexing |
| `npm run build` | Repository Root | `0` | ⚠️ **DECOUPLED** | Successfully generated 20 static pages; skipped lint |
| `npm test` | Repository Root | `1` | ❌ **MISSING** | Script not defined in `package.json`; 0 test suites |
| `npm audit` | Repository Root | `0` | ✅ **CLEAN** | 0 known dependency vulnerabilities detected |
| `npm outdated` | Repository Root | `0` | ⚠️ **OUTDATED** | Mismatch in `@types/node-cron` v3 vs `node-cron` v4 |

### 2.2. Verbatim Command Logs & In-Depth Technical Analysis

#### A. ESLint Failure Log (`npm run lint` -> Exit Code 1)
```text
> ai-survival-store@0.1.0 lint
> eslint

D:\Go-Live\Web\AI Survival Store\daemon\tasks\code-runner.ts
   98:11  warning  'agyCmd' is assigned a value but never used  @typescript-eslint/no-unused-vars
  101:29  warning  'code' is assigned a value but never used    @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\daemon\tasks\telegram-chat.ts
  6:10  warning  'authorProductDraft' is defined but never used  @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\src\app\page.tsx
  110:5  error    Error: Calling setState synchronously within an effect can trigger cascading renders  react-hooks/set-state-in-effect
  174:9  warning  'handlePaymentSuccess' is assigned a value but never used                              @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\src\components\chat\AIChatbot.tsx
  30:7   error  Error: Calling setState synchronously within an effect can trigger cascading renders    react-hooks/set-state-in-effect
  53:19  error  Error: Cannot call impure function during render                                        react-hooks/purity
  76:22  error  Error: Cannot call impure function during render                                        react-hooks/purity

D:\Go-Live\Web\AI Survival Store\src\components\dev\DevPaymentSimulator.tsx
  19:21  warning  'setBuyerName' is assigned a value but never used  @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\src\components\effects\CertificateModal.tsx
  4:28  warning  'Download' is defined but never used  @typescript-eslint/no-unused-vars
  4:45  warning  'Sparkles' is defined but never used  @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\src\components\funnel\ChemistryPreorderModal.tsx
  36:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders    react-hooks/set-state-in-effect

D:\Go-Live\Web\AI Survival Store\src\components\funnel\ChemistryQuizModal.tsx
  4:78   warning  'AlertTriangle' is defined but never used                                             @typescript-eslint/no-unused-vars
  57:7   error    Error: Cannot access variable before it is declared                                  react-hooks/immutability
  58:7   error    Error: Calling setState synchronously within an effect can trigger cascading renders  react-hooks/set-state-in-effect
  72:11  error    Error: Cannot access variable before it is declared                                  react-hooks/immutability
  79:6   warning  React Hook useEffect has a missing dependency: 'handleSubmitQuiz'                     react-hooks/exhaustive-deps

D:\Go-Live\Web\AI Survival Store\src\components\hall-of-fame\HallOfFame.tsx
  33:5   error  Error: Calling setState synchronously within an effect can trigger cascading renders    react-hooks/set-state-in-effect
  65:35  error  Error: Cannot call impure function during render                                        react-hooks/purity

D:\Go-Live\Web\AI Survival Store\src\components\layout\SurvivalHeader.tsx
  22:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders    react-hooks/set-state-in-effect

D:\Go-Live\Web\AI Survival Store\src\components\services\CustomTaskModal.tsx
    4:13  warning  'Sparkles' is defined but never used                             @typescript-eslint/no-unused-vars
    4:54  warning  'CheckCircle2' is defined but never used                         @typescript-eslint/no-unused-vars
    4:68  warning  'ShieldCheck' is defined but never used                          @typescript-eslint/no-unused-vars
    4:93  warning  'DollarSign' is defined but never used                           @typescript-eslint/no-unused-vars
  199:17  error    `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities
  199:39  error    `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`  react/no-unescaped-entities

D:\Go-Live\Web\AI Survival Store\src\components\services\EbookReaderModal.tsx
  4:65  warning  'Share2' is defined but never used  @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\src\components\services\OrderLookup.tsx
  4:83  warning  'Zap' is defined but never used                  @typescript-eslint/no-unused-vars
  4:88  warning  'Flame' is defined but never used                @typescript-eslint/no-unused-vars
  4:95  warning  'Sparkles' is defined but never used             @typescript-eslint/no-unused-vars
  22:3  warning  'onOpenChemistryQuiz' is defined but never used  @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\src\components\services\TarotModal.tsx
   12:3   warning  'Bookmark' is defined but never used                                                 @typescript-eslint/no-unused-vars
  102:9   warning  'canvasRef' is assigned a value but never used                                       @typescript-eslint/no-unused-vars
  106:5   error    Error: Calling setState synchronously within an effect can trigger cascading renders  react-hooks/set-state-in-effect

D:\Go-Live\Web\AI Survival Store\src\components\store\PaymentModal.tsx
    5:80   warning  'Heart' is defined but never used                                                   @typescript-eslint/no-unused-vars
    5:108  warning  'Flame' is defined but never used                                                   @typescript-eslint/no-unused-vars
   75:21   warning  'setBuyerName' is assigned a value but never used                                   @typescript-eslint/no-unused-vars
   78:21   warning  'setBuyerNote' is assigned a value but never used                                   @typescript-eslint/no-unused-vars
   81:10   warning  'isPolling' is assigned a value but never used                                      @typescript-eslint/no-unused-vars
   88:5    error    Error: Calling setState synchronously within an effect can trigger cascading renders react-hooks/set-state-in-effect
  100:7    error    Error: Calling setState synchronously within an effect can trigger cascading renders react-hooks/set-state-in-effect
  109:19   error    Error: Calling setState synchronously within an effect can trigger cascading renders react-hooks/set-state-in-effect
  183:6    warning  React Hook useEffect has missing dependencies: 'buyerEmail', 'buyerName', etc.     react-hooks/exhaustive-deps
  226:5    error    Error: Calling setState synchronously within an effect can trigger cascading renders react-hooks/set-state-in-effect
  285:6    warning  React Hook useEffect has a missing dependency: 'order'                              react-hooks/exhaustive-deps

D:\Go-Live\Web\AI Survival Store\src\components\store\ProductCatalog.tsx
   5:52  warning  'Download' is defined but never used                                                  @typescript-eslint/no-unused-vars
  32:5   error    Error: Calling setState synchronously within an effect can trigger cascading renders  react-hooks/set-state-in-effect
  74:6   warning  React Hook React.useMemo has a missing dependency: 'isComingSoon'                     react-hooks/exhaustive-deps

D:\Go-Live\Web\AI Survival Store\src\components\terminal\LiveTerminal.tsx
  18:5  error  Error: Calling setState synchronously within an effect can trigger cascading renders    react-hooks/set-state-in-effect

D:\Go-Live\Web\AI Survival Store\src\lib\gemini.ts
  511:35  warning  'question' is defined but never used  @typescript-eslint/no-unused-vars

D:\Go-Live\Web\AI Survival Store\src\lib\mock-store.ts
  91:3  warning  Unused eslint-disable directive (no problems were reported from 'no-var')

✖ 51 problems (20 errors, 31 warnings)
```

#### B. The Production Build Decoupling Mechanism
Executing `npm run build` in the repository produces:
```text
> ai-survival-store@0.1.0 build
> next build

▲ Next.js 16.4.3 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 2.3s
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 2.2s
  Running TypeScript ...
  Finished TypeScript in 2.8s ...
  Collecting page data using 11 workers ...
✓ Generating static pages using 11 workers (20/20) in 581ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/admin/approve-product
├ ƒ /api/chat
├ ƒ /api/download
├ ƒ /api/hall-of-fame
├ ƒ /api/live-feed
├ ƒ /api/orders/[code]
├ ƒ /api/orders/create
├ ƒ /api/preorder
├ ƒ /api/products
├ ƒ /api/services/chemistry-quiz
├ ƒ /api/services/chemistry-tutor
├ ƒ /api/services/custom-task/quote
├ ƒ /api/services/roast-cv
├ ƒ /api/services/tarot
├ ƒ /api/stats
├ ƒ /api/webhooks/payment
└ ƒ /api/webhooks/payos

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
**Why `next build` passes while `npm run lint` fails:**
In Next.js 16 with ESLint 9 Flat Config (`eslint.config.mjs`) and Turbopack compiler architecture, Next.js completely decoupled ESLint from the core `next build` lifecycle. In earlier versions (Next.js 12–14), `next build` automatically ran `next lint` during step 2. In Next.js 16, `next build` only executes the SWC/Turbopack compiler and TypeScript type check. 

Because `package.json:7` defines `"build": "next build"` rather than `"build": "npm run lint && next build"`, developers and automated deployment scripts receive a false confirmation of build health while deploying 20 fatal React compiler and hook violations directly into production.

---

## 3. Architecture & Module Design Audit

### 3.1. In-Memory `mockStore` State Loss on Serverless Runtimes
In `src/lib/mock-store.ts:90-99`, the application maintains a singleton state store bound to the Node.js global object:
```typescript
declare global {
  var __mockStoreData: {
    stats: CampaignStats;
    products: Product[];
    orders: Map<string, Order>;
    logs: LiveLog[];
    listeners: Set<(event: { type: string; data: unknown }) => void>;
  } | undefined;
}
```
In serverless hosting environments like Vercel, serverless lambdas are stateless, ephemeral micro-containers. Multiple parallel requests execute in completely separate memory address spaces, and idle containers are purged after a brief timeout.

**Critical Breakdown Scenario:**
1. A user chats with Mèo Dev via the AI Chatbot and decides to purchase a guide.
2. In `src/lib/gemini.ts:127-137`, the chatbot calls `mockStore.createOrder(directProductMatch, 'Khách Chat AI', 'Mua qua chat')` and renders a VietQR payment code. **This order is written exclusively to local memory in Container A and never committed to Supabase.**
3. 2 minutes later, the customer completes the bank transfer. The banking webhook hits `/api/webhooks/payos` running inside **Container B**.
4. Container B queries Supabase for the order. Supabase returns null. Container B then queries its local `mockStore`, which is empty.
5. Container B falls back to auto-capturing the order as an untargeted 5,000đ Pate donation, stripping the user of their purchased digital guide and failing to issue download tokens.

### 3.2. Monolithic Client-Side Tree & Prop-Drilling Bottlenecks
Every single UI file under `src/components/` and the main homepage `src/app/page.tsx` is declared with `'use client'`. 
- `src/app/page.tsx:25-58` manages over 20 separate `useState` variables in a single flat file.
- On initial page visit, the browser receives an empty HTML shell and must download, parse, and execute the entire JavaScript bundle before initiating a 3-step waterfall fetch sequence: `/api/stats`, `/api/products`, and `/api/live-feed`.
- Every 15 seconds, a client-side timer jiggles the simulated viewer count (`setViewerCount`), causing React to evaluate render functions down the entire component tree.
- No global state management library (Zustand, Redux, or React Context) is used, forcing props to be manually drilled through 3+ layers of modal wrappers.

### 3.3. Autonomous Background Daemon & Docker Incompatibilities
The autonomous daemon in `daemon/index.ts` coordinates 5 scheduled cron jobs and an infinite long-polling Telegram loop:
1. **Single Event Loop Starvation**: In `daemon/index.ts:273-291`, `while (isPollingActive)` processes Telegram callbacks and messages sequentially. Heavy operations (such as running Gemini with Google Search Grounding for 6 market trend cycles) freeze event loop responsiveness, causing Telegram bot timeouts.
2. **Platform Coupling in `code-runner.ts`**: The remote coding handler in `daemon/tasks/code-runner.ts:32-36` contains hardcoded Windows local machine paths:
   ```typescript
   if (process.platform === 'win32') {
     const winPath = 'C:\\Users\\ADMIN\\.gemini\\bin\\agy.exe';
     if (fs.existsSync(winPath)) return `"${winPath}"`;
   }
   ```
   At lines 102-105, it shells out to `powershell -Command "${agyBin} ..."` and `git status --porcelain`.
3. **Broken Dockerfile Deployment**: The official deployment container in `daemon/Dockerfile` starts from `node:22-alpine` and only installs `tzdata`. **It does not install `git`, `powershell`, or the `agy` CLI binary.** When deployed on a Linux VPS or Docker container as instructed in `docs/vps-deployment-guide.md`, executing `/code` crashes immediately with `git: not found` or `powershell: not found`.

---

## 4. Security, Secrets & Environment Configuration Audit

### 4.1. Plaintext Production Secrets in Repository & Documentation
- **File**: `.env.local` (lines 14–46) contains unmasked production keys:
  - `SUPABASE_SERVICE_ROLE_KEY`: Root administrative bypass key for PostgreSQL database.
  - `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`: Live payment gateway merchant credentials.
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`: Cloudflare storage credentials capable of deleting or altering all stored files.
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: Bot management tokens allowing hijacking of the bot channel.
  - `GEMINI_API_KEY`: Multiple active Google AI API keys.
- **File**: `docs/vps-deployment-guide.md` (lines 80–87) was committed to git history in commit `1862d4b` with live Supabase project endpoints (`https://ciwioaaxgmuoqkalnwyo.supabase.co`) and partial secret strings.

### 4.2. Permissive Supabase Row Level Security (RLS) Policies
In `supabase/schema.sql`, `supabase/migration-market-intelligence.sql`, and `supabase/migration-telegram-chat.sql`, RLS is enabled in name only. The actual security policies evaluate to unconditional `true`:
- `orders` Table (`supabase/schema.sql:113-115`):
  ```sql
  CREATE POLICY "Cho phép đọc công khai orders" ON orders FOR SELECT USING (true);
  CREATE POLICY "Cho phép tạo đơn hàng anon" ON orders FOR INSERT WITH CHECK (true);
  CREATE POLICY "Cho phép cập nhật orders" ON orders FOR UPDATE USING (true) WITH CHECK (true);
  ```
  **Exploit Impact**: Any visitor holding the public anon key can run `supabase.from('orders').update({ status: 'PAID' }).eq('order_code', 'MEO-1234')`, obtaining all digital goods for 0 VND. Any attacker can also execute `supabase.from('orders').select('*')` to harvest customer names, private email addresses, and AI generation results.
- `campaign_stats` Table (`supabase/schema.sql:111`):
  ```sql
  CREATE POLICY "Cho phép cập nhật campaign_stats" ON campaign_stats FOR UPDATE USING (true) WITH CHECK (true);
  ```
  **Exploit Impact**: Anyone can overwrite the campaign balance or set hunger to 0%.
- `telegram_messages` Table (`supabase/migration-telegram-chat.sql:22-23`):
  ```sql
  CREATE POLICY "Cho phép đọc/ghi telegram_messages" ON telegram_messages FOR ALL USING (true) WITH CHECK (true);
  ```
  **Exploit Impact**: Complete public read, write, and deletion access to all private communications between the store owner and the bot.

### 4.3. Payment Webhook Signature Verification Bypasses
- In `src/app/api/webhooks/payos/route.ts:28-34`:
  ```typescript
  if (isPayOSConfigured()) {
    webhookData = await verifyPayOSWebhook(payload);
    if (!webhookData && payload.data) {
      // Dự phòng payload khi test trên sandbox/dev
      webhookData = payload.data;
    }
  }
  ```
  If signature verification fails, the endpoint falls back to accepting `payload.data`, completely negating HMAC cryptographic security.
- In `src/app/api/webhooks/payment/route.ts:27-38`:
  ```typescript
  const isPayOSPayload = Boolean(payload.signature || (payload.data && payload.data.orderCode));
  if (!isPayOSPayload) { ... }
  ```
  If `payload.signature` is present, the authentication check is skipped, but `payload.signature` is never verified!
- In `src/app/api/webhooks/payment/route.ts:48-52`:
  ```typescript
  if (payload.orderCode) {
    rawOrderCode = payload.orderCode;
    transferAmount = Number(payload.amount || 0);
    gatewayName = 'Simulator';
  }
  ```
  Anyone can send `{ "orderCode": "MEO-1234", "amount": 100000 }` to trigger the Dev Simulator branch in production.

### 4.4. Digital Product Fulfillment Gatekeeper Bypasses
- In `src/app/api/download/route.ts:11-21`:
  ```typescript
  const isPreview = searchParams.get('preview') === 'true' || fileKey?.includes('preview') || orderCode === 'PREVIEW';
  if (isPreview) {
    const downloadUrl = await getDownloadUrlForFile(fileKey);
    return NextResponse.redirect(new URL(downloadUrl, req.url));
  }
  ```
  Appending `?preview=true&key=chem-12-lo-trinh.pdf` issues a valid 15-minute presigned Cloudflare R2 download URL without verifying payment.
- In `src/app/api/download/route.ts:33-35`:
  ```typescript
  const { data } = await supabase.from('orders').select('status').eq('order_code', orderCode).single();
  isPaid = data?.status === 'PAID';
  ```
  The endpoint verifies that *an* order is paid, but never checks if `order.product_id` matches the requested `fileKey`. A 5,000đ Pate donation order unlocks all 149,000đ study guides.

### 4.5. Unauthenticated State-Mutating Admin Route (`/api/admin/approve-product`)
In `src/app/api/admin/approve-product/route.ts:6-25, 87-105`:
The approval mechanism is an unauthenticated HTTP GET endpoint. Any GET request:
1. Updates `market_insights.status = 'APPROVED'`.
2. Triggers Google Gemini text generation to author an entire eBook.
3. Inserts the eBook into the public `products` catalog.
4. Broadcasts system logs to the Live Terminal and dispatches Telegram notifications.
Because it runs on HTTP GET without tokens or sessions, web crawlers, search indexing bots, and browser prefetchers can trigger product creation and token exhaustion.

### 4.6. Stored XSS in Public Hall of Fame
In `src/app/api/orders/create/route.ts:42`, `buyerSocialLink` is accepted without schema or protocol validation.
In `src/components/hall-of-fame/HallOfFame.tsx:151-161`:
```tsx
{d.buyer_social_link && (
  <a
    href={d.buyer_social_link}
    target="_blank"
    rel="noopener noreferrer"
    className="hover:text-emerald-400 flex items-center gap-0.5"
  >
    <span>FB</span>
    <ExternalLink className="w-2.5 h-2.5" />
  </a>
)}
```
Submitting `buyerSocialLink: "javascript:alert(document.cookie)"` causes arbitrary JavaScript execution whenever any visitor clicks the "FB" badge on the Hall of Fame.

### 4.7. Arbitrary Price Tampering via `customAmount`
In `src/app/api/orders/create/route.ts:30`:
```typescript
const productPrice = customAmount || prodData?.price || 5000;
```
`customAmount` was intended for donation products (`PATE-05`), but is applied unconditionally across all products. An attacker can submit `{ "productId": "CHEM-149", "customAmount": 1000 }` to purchase a 149,000đ package for 1,000 VND.

---

## 5. Code Quality, React & TypeScript Audit

### 5.1. Analysis of the 51 ESLint Problems (20 Errors)
The 20 ESLint errors fall into four critical categories under React 19 and Next.js 16 compiler standards:

1. **Synchronous `setState` Inside `useEffect` (`react-hooks/set-state-in-effect`) — 13 Errors**:
   - `src/app/page.tsx:110:5`
   - `src/components/chat/AIChatbot.tsx:30:7`
   - `src/components/funnel/ChemistryPreorderModal.tsx:36:5`
   - `src/components/funnel/ChemistryQuizModal.tsx:58:7`
   - `src/components/hall-of-fame/HallOfFame.tsx:33:5`
   - `src/components/layout/SurvivalHeader.tsx:22:5`
   - `src/components/services/TarotModal.tsx:106:5`
   - `src/components/store/PaymentModal.tsx:88:5, 100:7, 109:19, 226:5`
   - `src/components/store/ProductCatalog.tsx:32:5`
   - `src/components/terminal/LiveTerminal.tsx:18:5`
   *Root Cause*: Deriving state synchronously inside `useEffect` causes React to render with default state, flush to DOM, run the effect, and immediately trigger a secondary synchronous re-render, degrading Core Web Vitals and causing layout shifts.
2. **Impure Function Invocations During Render (`react-hooks/purity`) — 3 Errors**:
   - `src/components/chat/AIChatbot.tsx:53:19, 76:22`
   - `src/components/hall-of-fame/HallOfFame.tsx:65:35`
   *Root Cause*: Calling non-deterministic `Date.now()` during render calculations violates React's idempotency contract, causing hydration mismatches between SSR and client renders.
3. **Temporal Dead Zone & Side-Effects in State Updaters (`react-hooks/immutability`) — 2 Errors**:
   - `src/components/funnel/ChemistryQuizModal.tsx:57:7, 72:11`
   *Root Cause*: `loadQuestions()` and `handleSubmitQuiz()` are invoked in `useEffect` prior to their `const` declarations. Furthermore, `handleSubmitQuiz()` (an async network call) is executed inside the pure state updater function of `setTimeLeft((prev) => ...)`.
4. **Unescaped JSX Entities (`react/no-unescaped-entities`) — 2 Errors**:
   - `src/components/services/CustomTaskModal.tsx:199:17, 199:39`
   *Root Cause*: Literal double quotes `"` unescaped in JSX template.

### 5.2. 56 Hidden TypeScript Indexing Vulnerabilities (`noUncheckedIndexedAccess`)
`tsconfig.json` specifies `"target": "ES2017"` and omits `"noUncheckedIndexedAccess": true`. Enabling this flag immediately reveals **56 compiler errors** where array indexing assumes elements exist without bounds checking:
- `src/lib/gemini.ts:337-339, 362`: Unconditional access to `cards[0].name`, `cards[1].name`, `cards[2].name`. If fewer than 3 cards are drawn, the tarot endpoint crashes with an unhandled `TypeError`.
- `daemon/tasks/market-analyzer.ts:90, 93`: Direct index access on `d.cycle.split(':')[0]`.
- `src/app/api/admin/approve-product/route.ts:59`: Direct access to `(process.env.GEMINI_API_KEY || '').split(/[,;\n]/)[0].trim()`.

### 5.3. Error Handling Antipatterns: Over 50 Empty `catch { // Ignore }` Blocks
Across `src/` and `daemon/`, more than 50 try/catch blocks silently swallow exceptions without logging.
**Most Damaging Instance**:
In `daemon/tasks/product-generator.ts:143-154`:
```typescript
try {
  await supabase.from('market_insights').update({
    draft_content: markdownContent,
    status: 'READY_FOR_REVIEW',
    quality_metrics: metrics,
  }).eq('id', insightId);
} catch {
  // Ignore
}
```
Because the PostgreSQL schema in `migration-market-intelligence.sql` did not add columns `draft_content`, `quality_metrics`, and restricted `status` to `('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED')`, this update failed with a database constraint violation. The empty catch block swallowed the error, leaving `draft_content` null. When the store owner clicked "Publish", the operation failed with `Sản phẩm chưa có nội dung bản thảo draft_content`.

### 5.4. Disconnected UI Callbacks & Phantom Business Features
1. **Disconnected Celebration Callback**: In `src/app/page.tsx:174-185`, `handlePaymentSuccess` is fully implemented to trigger the cat eating animation, play audio effects (`playNomNom`, `playMeow`), and refresh stats. However, in `page.tsx:335-350`, `<PaymentModal>` is rendered without `onSuccess={handlePaymentSuccess}`. ESLint flags: `'handlePaymentSuccess' is assigned a value but never used`.
2. **Phantom Flash Sales**: In `daemon/tasks/flash-sale.ts:29-73`, the daemon broadcasts that a flash sale is active on Telegram and the Live Terminal. However, `src/app/api/orders/create/route.ts` contains no promotional pricing logic or discount verification; buyers are charged standard price.
3. **Non-Existent Gemini LLM Model Defaults**: In `src/lib/gemini.ts:36`, `daemon/config.ts:15`, and `.env.example:23`, the default fallback model is set to `gemini-3.5-flash-lite`. Google has never released a model with this name (valid models are `gemini-2.0-flash`, `gemini-1.5-flash`). Fresh deployments without `GEMINI_MODEL` crash with 404 Model Not Found.

---

## 6. Feature Completeness Matrix

| Feature Domain | Documented Specification | Implementation State | Verification Checkpoint | Deficiencies, Vulnerabilities & Tech Debt |
| :--- | :--- | :--- | :--- | :--- |
| **Product Catalog** | Display products, tiers, pricing, icons, badges | **PARTIAL** | `ProductCatalog.tsx`, `/api/products` | Missing category filters, search, sorting. Client hardcodes fallback products. No dedicated `/products/[id]` detail routes. |
| **Shopping Cart** | Multi-item basket, quantity selector, cart drawer | **MISSING** | N/A | No cart state, no multi-item checkout. Orders are strictly single-item instant purchases. |
| **Checkout & Payments** | VietQR code, PayOS checkout link, webhook capture | **IMPLEMENTED (VULNERABLE)** | `PaymentModal.tsx`, `/api/orders/create`, `/api/webhooks/*` | Webhooks contain signature bypasses and simulator branches. Order codes limited to 9,000 combinations. |
| **Inventory Tracking** | Stock tracking, out-of-stock disabling | **MISSING** | `supabase/schema.sql` | `products` table has no `stock` or `quantity` fields; assumes infinite availability. |
| **Digital Fulfillment** | Cloudflare R2 Presigned URLs, Google Drive auto-grant | **PARTIAL (DEFECTIVE)** | `/api/download`, `r2.ts`, `google-drive.ts` | `/api/download` allows downloading any file with `?preview=true` or any paid order code. Fallback files are empty dummy files. Drive errors swallowed. |
| **AI Roast CV** | ATS parsing, Gemini roast, downloadable MD report | **IMPLEMENTED** | `CVRoastModal.tsx`, `/api/services/roast-cv` | Single paid code can be reused infinitely; no IP rate limiting; dev mode bypasses payment check. |
| **AI Tarot Reading** | 3-card draw, category selection, spiritual IT advice | **IMPLEMENTED** | `TarotModal.tsx`, `/api/services/tarot` | Redeem code defaults to `TRT-FREE-TEST`; paid code can be reused infinitely; no bounds checking on cards array. |
| **Chemistry Funnel** | 10-question trap quiz, scoring, package recommendation | **IMPLEMENTED** | `ChemistryQuizModal.tsx`, `/api/services/chemistry-quiz` | Questions and explanations are static in route handler. Side effect inside state updater timer. |
| **AI Chemistry Tutor** | 24/7 problem solving, Casio tips, image upload | **PARTIAL (BACKDOORED)** | `ChemistryTutorModal.tsx`, `/api/services/chemistry-tutor` | Hardcoded bypass tokens (`CHM-TEST*`, `CHM-ADMIN`, `CHM-OWNER`). Wildcard search matches any order containing token digits. |
| **Custom Task Worker** | Solopreneur task quote (19k-49k), automated coding by AI | **IMPLEMENTED** | `CustomTaskModal.tsx`, `/api/services/custom-task/quote`, `daemon/tasks/custom-task-worker.ts` | Solution displayed in `OrderLookup`; no delivery confirmation email; worker enters infinite retry loop on failed tasks. |
| **Interactive Ebook Reader** | Markdown preview for generated ebooks | **IMPLEMENTED** | `EbookReaderModal.tsx` | Simple modal rendering markdown without pagination, bookmarks, or DRM. |
| **Order Lookup** | Recover order status, access codes, download links | **IMPLEMENTED (UNSECURED)** | `OrderLookup.tsx`, `/api/orders/[code]` | Unauthenticated public lookup exposes buyer emails, notes, social links, and redeem codes. |
| **Hall of Fame** | 24h donor showcase, donation leaderboard | **IMPLEMENTED (XSS RISK)** | `HallOfFame.tsx`, `/api/hall-of-fame` | `buyer_social_link` is unvalidated; renders unescaped in `<a href="...">` (Stored XSS vector). |
| **User Authentication** | User signup/login, user profile, purchase history | **MISSING** | N/A | No auth system, no Supabase Auth integration, no user sessions or JWT middleware. |
| **Daemon: Hunger Decay** | -2% hunger every 30m, SOS terminal log if < 35% | **IMPLEMENTED** | `daemon/tasks/hunger-decay.ts` | Functional cron job; updates `campaign_stats` in Supabase. |
| **Daemon: Flash Sale** | Triggers flash sale if 0 paid orders in 6 hours | **IMPLEMENTED** | `daemon/tasks/flash-sale.ts` | Functional cron job; posts alert to `live_logs` and Telegram, but does not discount cart prices. |
| **Daemon: Market Analyzer** | 6 cycles/day scraping trends via Google Search Grounding | **IMPLEMENTED** | `daemon/tasks/market-analyzer.ts` | Functional; saves to `market_insights` and sends Telegram inline review button. |
| **Daemon: Content Gen** | 21:00 daily viral post generator for FB & Threads | **IMPLEMENTED** | `daemon/tasks/content-generator.ts` | Uses Meta Graph API and Threads API; sends copyable scripts to Telegram. |
| **Daemon: Remote Coding** | `/code` command via Telegram to code on git branch | **BROKEN IN DOCKER** | `daemon/tasks/code-runner.ts` | Hardcoded Windows path for `agy.exe`; Dockerfile lacks `git`, `powershell`, and `agy` CLI. |
| **Admin Dashboard** | Secure UI for managing products, insights, orders | **MISSING** | `/api/admin/approve-product` | No UI dashboard; approval done via bare GET link with no authentication. |
| **App Router Boundaries** | Error boundary, skeleton loading, custom 404 | **MISSING** | `src/app/` | Missing `error.tsx`, `loading.tsx`, `not-found.tsx`, `global-error.tsx`. Uncaught errors crash app to blank screen. |

---

## 7. Master Issue Inventory

### Summary Table of All 35 Audited Issues

| Issue ID | Category | Severity | Title / Summary | Exact File Path & Lines |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Security / Database | **Critical** | Wide-Open Supabase RLS on `orders` (PII Leakage & Free Status Tampering) | `supabase/schema.sql:113-115` |
| **SEC-02** | Security / Database | **Critical** | Permissive Anonymous UPDATE Policy on `campaign_stats` | `supabase/schema.sql:111` |
| **SEC-03** | Security / Database | **High** | Public Read/Write/Delete Access on `market_insights` & `telegram_messages` | `migration-market-intelligence.sql:38`, `migration-telegram-chat.sql:22-23` |
| **SEC-04** | Security / Database | **Medium** | Unrestricted Anonymous INSERT on `live_logs` (Spam & Log Injection) | `supabase/schema.sql:117` |
| **SEC-05** | Security / Auth | **Critical** | Unauthenticated Remote Product Approval & Publication via HTTP GET | `src/app/api/admin/approve-product/route.ts:6-25, 87-117` |
| **SEC-06** | Security / Payments | **Critical** | Complete Payment Signature Verification Bypass in Webhooks | `src/app/api/webhooks/payment/route.ts:26-38`, `payos/route.ts:28-34` |
| **SEC-07** | Security / Assets | **Critical** | Digital Download Bypass via `?preview=true` & Product Decoupling | `src/app/api/download/route.ts:11-21, 33-35` |
| **SEC-08** | Security / Auth | **High** | Hardcoded Backdoor Tokens & PostgREST Filter Injection in AI Routes | `src/app/api/services/chemistry-tutor/route.ts:19-35` |
| **SEC-09** | Security / Input | **High** | Arbitrary Price Tampering on Paid Products via Unvalidated `customAmount` | `src/app/api/orders/create/route.ts:11, 30` |
| **SEC-10** | Security / Privacy | **High** | Active Order Codes & Customer Emails Leaked in Hall of Fame & Live Feed | `hall-of-fame/route.ts:13`, `live-feed/route.ts:13`, `orders/create:57` |
| **SEC-11** | Security / XSS | **High** | Stored Cross-Site Scripting (XSS) via `buyer_social_link` in Hall of Fame | `src/components/hall-of-fame/HallOfFame.tsx:151-161` |
| **SEC-12** | Security / Daemon | **High** | Unauthenticated Telegram Callbacks & Privileged CLI `--dangerously-skip-permissions` | `daemon/index.ts:84-128`, `daemon/tasks/code-runner.ts:98-105` |
| **SEC-13** | Security / DoS | **Medium** | Missing Rate Limiting on Cost-Heavy Gemini & Telegram Endpoints | `src/app/api/chat/route.ts:23-35`, `src/app/api/preorder/route.ts:49-55` |
| **SEC-14** | Security / Headers | **Medium** | Missing HTTP Security Headers (CSP, X-Frame-Options) & Middleware | `next.config.ts:1-18`, Missing `middleware.ts` |
| **ENV-01** | Environment | **Critical** | Plaintext Production Secrets in `.env.local` and Git Documentation | `.env.local:14-46`, `docs/vps-deployment-guide.md:80-87` |
| **ENV-02** | Environment | **High** | Client/Server Key Conflation & Service Role Fallback Leakage Risk | `src/lib/supabase/client.ts:5, 41, 52` |
| **ENV-03** | Environment | **High** | Default Hardcoded Webhook Secret Token Ineffective Check | `src/app/api/webhooks/payment/route.ts:32`, `.env.example:12` |
| **ENV-04** | Environment | **Medium** | Absence of Startup Environment Variable Schema Validation (No Zod) | `src/lib/gemini.ts:8`, `src/lib/payos.ts:6`, `daemon/config.ts:10` |
| **ARCH-01** | Architecture | **Critical** | Serverless State Fragmentation via In-Memory `mockStore` Singleton | `src/lib/mock-store.ts:90-129`, `src/lib/gemini.ts:127-137` |
| **ARCH-02** | Architecture | **High** | Silent Admin Client Degradation in Supabase Initialization | `src/lib/supabase/client.ts:50-65` |
| **ARCH-03** | Architecture | **High** | Monolithic Client Component with Deep Prop Drilling | `src/app/page.tsx:1-408` |
| **ARCH-04** | Architecture | **High** | Platform-Coupled Remote Coding Agent Incompatible with Docker VPS | `daemon/tasks/code-runner.ts:28-39`, `daemon/Dockerfile:1-23` |
| **ARCH-05** | Architecture | **Medium** | Multi-Cron and Long-Polling Event Loop Congestion in Daemon | `daemon/index.ts:223-297` |
| **CQ-01** | Build & Lint | **Critical** | ESLint Pipeline Failure (51 Problems: 20 Errors, 31 Warnings) | 15 files across `src/` and `daemon/` |
| **CQ-02** | Build & Lint | **High** | Decoupled Linting from Production Build Pipeline | `package.json:7`, `next.config.ts:1-18` |
| **CQ-03** | Build & Lint | **High** | Complete Absence of Automated Test Suites & Dangerous `daemon:test` | `package.json:5-21`, `daemon/index.ts:188-196` |
| **CQ-04** | TypeScript | **High** | TypeScript Target `ES2017` & 56 Unchecked Index Errors | `tsconfig.json:3`, `src/lib/gemini.ts:337-339` |
| **CQ-05** | TypeScript | **High** | Type Drift & PostgreSQL Status Check Constraint Discrepancy | `src/types/index.ts:96`, `migration-market-intelligence.sql:26` |
| **CQ-06** | TypeScript | **Medium** | Unsafe Type Assertions (`as any`) in Payments and WebSockets | `src/lib/payos.ts:86, 124`, `daemon/services/supabase.ts:8` |
| **CQ-07** | React Quality | **Critical** | TDZ Closure Violations & Side-Effects inside State Updaters | `src/components/funnel/ChemistryQuizModal.tsx:57, 72` |
| **CQ-08** | React Quality | **High** | Disconnected UI Callback (`handlePaymentSuccess`) | `src/app/page.tsx:174-185, 335-350` |
| **CQ-09** | Reliability | **High** | Silent Swallowing of Critical DB & Network Errors (50+ Empty Catches) | `daemon/tasks/product-generator.ts:143-154`, `src/app/page.tsx:78` |
| **CQ-10** | Reliability | **High** | Missing React Error Boundaries Across All App Router Paths | `src/app/` (missing `error.tsx`, `global-error.tsx`) |
| **CQ-11** | Business Logic | **High** | Phantom Flash Sales Broadcasted without Cart Price Reductions | `daemon/tasks/flash-sale.ts:29-73`, `src/app/api/orders/create:30` |
| **CQ-12** | Business Logic | **High** | Non-Existent Gemini LLM Model Defaults (`gemini-3.5-flash-lite`) | `src/lib/gemini.ts:36`, `daemon/config.ts:15`, `.env.example:23` |

---

### Detailed Findings Catalog

#### [SEC-01] Wide-Open Supabase RLS on `orders` (PII Leakage & Free Status Tampering)
- **Category**: Security & Database
- **Severity**: **Critical**
- **File & Lines**: `supabase/schema.sql:113-115`
- **Description**: `orders` table policies grant public `SELECT`, `INSERT`, and `UPDATE` with `USING (true) WITH CHECK (true)`.
- **Security & Reliability Impact**: Any internet user with the public anon key can read all customer emails, order notes, and AI consultation results, or directly update order status to `PAID` to steal digital assets.
- **Remediation**: Drop public `UPDATE` and `SELECT` policies. Restrict updates exclusively to `service_role`. Restrict reads to matching `order_code` via secure server-side route handlers.

#### [SEC-02] Permissive Anonymous UPDATE Policy on `campaign_stats`
- **Category**: Security & Database
- **Severity**: **Critical**
- **File & Lines**: `supabase/schema.sql:111`
- **Description**: `CREATE POLICY "Cho phép cập nhật campaign_stats" ON campaign_stats FOR UPDATE USING (true) WITH CHECK (true);`
- **Security & Reliability Impact**: Unauthenticated visitors can manipulate the raised fund amount, cat hunger level, or campaign countdown timer.
- **Remediation**: Drop anonymous update policy. Restrict `campaign_stats` writes to `service_role`.

#### [SEC-05] Unauthenticated Remote Product Approval & Publication via HTTP GET
- **Category**: Security & Authentication
- **Severity**: **Critical**
- **File & Lines**: `src/app/api/admin/approve-product/route.ts:6-25, 87-117`
- **Description**: HTTP GET endpoint generates eBooks via Gemini, inserts products into the store, updates database records, and dispatches Telegram notifications without authentication.
- **Security & Reliability Impact**: Automated web crawlers, search bots, or malicious actors visiting the URL can flood the store with unwanted products, exhaust Gemini API budgets, and spam Telegram.
- **Remediation**: Convert to HTTP `POST`, require `ADMIN_SECRET_KEY` in the request header or signed HMAC URL token, and remove dummy fallback product synthesis.

#### [SEC-06] Complete Payment Signature Verification Bypass in Webhooks
- **Category**: Security & Payments
- **Severity**: **Critical**
- **File & Lines**: `src/app/api/webhooks/payment/route.ts:26-38`, `src/app/api/webhooks/payos/route.ts:28-34`
- **Description**: `payos/route.ts` falls back to unverified `payload.data` if signature verification fails. `payment/route.ts` skips authentication if `payload.signature` is present without checking its validity, and contains an active Dev Simulator branch in production.
- **Security & Reliability Impact**: Attackers can spoof payment events to fulfill orders without sending money.
- **Remediation**: Strictly reject unverified PayOS webhooks. Eliminate Dev Simulator fallback branches in production environments. Enforce constant-time comparison on generic webhook secrets.

#### [SEC-07] Digital Product Download Bypass via `?preview=true` and Product Decoupling
- **Category**: Security & Digital Assets
- **Severity**: **Critical**
- **File & Lines**: `src/app/api/download/route.ts:11-21, 33-35`
- **Description**: Passing `?preview=true` returns a presigned download URL for any requested file key. Paid downloads verify that an order code is `PAID` but never check if the order purchased the requested file.
- **Security & Reliability Impact**: All premium digital assets can be downloaded for free, or unlocked using a 5,000đ donation order code.
- **Remediation**: Whitelist preview keys explicitly (e.g. `*.preview.pdf`). Verify `order.product.r2_file_key === fileKey` before issuing download URLs.

#### [ENV-01] Production Secrets and API Credentials Exposed in Plaintext and Git History
- **Category**: Environment & Secrets
- **Severity**: **Critical**
- **File & Lines**: `.env.local:14-46`, `docs/vps-deployment-guide.md:80-87`
- **Description**: Live credentials for Supabase (Service Role), PayOS, Cloudflare R2, Telegram Bot, and Google Gemini are stored in plaintext and committed into git history.
- **Security & Reliability Impact**: Complete root administrative takeover of all database tables, cloud storage buckets, payment transactions, and Telegram channels.
- **Remediation**: Immediately revoke and rotate all credentials in provider dashboards. Purge secrets from git history using `git-filter-repo`.

#### [ARCH-01] Serverless State Fragmentation via In-Memory `mockStore` Singleton
- **Category**: Architecture & Design
- **Severity**: **Critical**
- **File & Lines**: `src/lib/mock-store.ts:90-129`, `src/lib/gemini.ts:127-137`
- **Description**: Orders initiated via AI chat are written to ephemeral Node.js memory (`global.__mockStoreData`) instead of Supabase.
- **Security & Reliability Impact**: Orders are lost across serverless invocations, causing paid banking transactions to fail order fulfillment.
- **Remediation**: Persist AI-generated orders directly to Supabase using `getSupabaseAdminClient()`. Restrict `mockStore` to local test environments.

#### [CQ-01] ESLint Execution Failure (51 Problems: 20 Errors, 31 Warnings)
- **Category**: Build & Lint
- **Severity**: **Critical**
- **File & Lines**: 15 files across `src/` and `daemon/`
- **Description**: `npm run lint` fails with exit code 1 due to 20 blocking errors under React 19 / Next.js 16 compiler rules.
- **Security & Reliability Impact**: Blocks CI/CD deployment pipelines; causes cascading re-renders, hydration errors, and unstable rendering loops.
- **Remediation**: Initialize synchronous state lazily (`useState(() => initialValue)`), remove `Date.now()` from renders, fix variable hoisting, and escape JSX quotes.

#### [CQ-07] TDZ Closure Violations & Side-Effects Inside State Updaters
- **Category**: React Quality
- **Severity**: **Critical**
- **File & Lines**: `src/components/funnel/ChemistryQuizModal.tsx:57, 72, 81, 106`
- **Description**: `loadQuestions` and `handleSubmitQuiz` are called before declaration in `useEffect`. `handleSubmitQuiz()` is invoked inside `setTimeLeft((prev) => { ... })`.
- **Security & Reliability Impact**: Fires duplicate network submissions during React concurrent rendering passes.
- **Remediation**: Hoist helper functions above `useEffect`. Move timeout submissions into the effect body when `timeLeft === 0`.

---

## 8. Prioritized Actionable Roadmap

```
+-----------------------------------------------------------------------------------+
| TIER 1: CRITICAL IMMEDIATE HOTFIXES (Target: 24 - 48 Hours)                       |
| - Key Rotation & Git History Secret Scrubbing (ENV-01)                           |
| - Lock Down Supabase RLS Policies for orders, campaign_stats, messages (SEC-01-03)|
| - Close Payment Webhook Verification Bypasses & Purge Simulators (SEC-06)         |
| - Fix Digital Download Gatekeeper Bypass & Enforce Product Binding (SEC-07)      |
| - Secure /api/admin/approve-product with Auth & Convert to POST (SEC-05)          |
| - Resolve All 20 ESLint Errors & Link `npm run lint && next build` (CQ-01, CQ-02)|
| - Persist AI Chat Orders to Supabase & Remove mockStore from Prod (ARCH-01)       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 2: HIGH-PRIORITY HARDENING & CORE RELIABILITY (Target: 3 - 5 Days)           |
| - Eliminate Price Tampering via Strict Server Price Validation (SEC-09)          |
| - Sanitize Hall of Fame Links Against Stored XSS (SEC-11)                         |
| - Mask PII & Active Order Codes in Public Feeds (SEC-10)                          |
| - Enforce Single-Use Redeem Tokens & Strip Backdoors in AI Services (SEC-08)     |
| - Upgrade Order Codes to High-Entropy Nanoid (MEO-XXXX Collision Fix)            |
| - Fix Broken Dockerfile Dependencies (git, alpine packages) for VPS Daemon        |
| - Correct Gemini Model Fallback to `gemini-2.0-flash` (CQ-12)                    |
| - Connect `handlePaymentSuccess` to PaymentModal for Cat Celebration (CQ-08)      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 3: MEDIUM-PRIORITY ARCHITECTURAL ENHANCEMENTS (Target: 6 - 12 Days)          |
| - Introduce Zod Runtime Environment & Request Body Validation (ENV-04)           |
| - Implement IP Rate Limiting on Cost-Heavy AI & Telegram Endpoints (SEC-13)      |
| - Add OWASP Security Headers (CSP, Frame-Options) in next.config.ts (SEC-14)     |
| - Introduce App Router error.tsx, loading.tsx, not-found.tsx Boundaries          |
| - Split Monolithic page.tsx into Server Component + Zustand Modal Store          |
| - Establish Automated Unit & Integration Testing Suite with Vitest                |
| - Resolve 56 TypeScript Indexing Errors under noUncheckedIndexedAccess            |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| TIER 4: LOW-PRIORITY OPTIMIZATIONS & E-COMMERCE FOUNDATIONS (Ongoing / Phase 4)    |
| - Implement Shopping Cart & Multi-Item Checkout                                  |
| - Add User Authentication & Purchase History Dashboard                           |
| - Implement Inventory & Stock Tracking in Products Schema                         |
| - Decouple Daemon Background Tasks from Telegram Listener using Worker Threads    |
+-----------------------------------------------------------------------------------+
```

### 8.1. Strategic Milestone Phases

#### Milestone 1: Zero-Vulnerability Perimeter (Hours 0–48)
Establish a completely secure perimeter. No unauthorized downloads, no payment forgery, no database tampering, no exposed credentials, and a green CI lint/build pipeline.

#### Milestone 2: Hardened Runtime & Abuse Prevention (Days 3–5)
Eliminate application logic flaws: pricing overrides, XSS vectors, token reuse, order collision, and background worker crashes.

#### Milestone 3: Architectural Resilience & Observability (Days 6–12)
Modernize the Next.js App Router tree: Server Components, Zod schemas, error boundaries, rate limiting, and automated testing suites.

#### Milestone 4: Full E-Commerce Maturity (Phase 4)
Expand into a complete e-commerce platform with customer accounts, shopping carts, and inventory tracking.

---

### 8.2. Dedicated Actionable Checklist

#### Item 1: Complete Credential Revocation & Secret Scrubbing
- **Priority Tier**: Tier 1 (Critical)
- **Problem Addressed**: `ENV-01` (Plaintext production credentials in `.env.local` and committed into git documentation).
- **Concrete Implementation Steps**:
  1. Revoke and regenerate keys in Supabase, PayOS, Cloudflare, Telegram @BotFather, and Google AI Studio dashboards.
  2. Replace `.env.local` with clean local development credentials.
  3. Remove secrets from `docs/vps-deployment-guide.md:80-87`.
  4. Run `git-filter-repo --invert-paths --path .env.local` to purge historical commits.
- **Expected Outcome & Verification**: No active keys present in git history. Secret scanning tools (`trufflehog`, `gitleaks`) report zero findings.

#### Item 2: Supabase Row Level Security Lockdown
- **Priority Tier**: Tier 1 (Critical)
- **Problem Addressed**: `SEC-01`, `SEC-02`, `SEC-03`, `SEC-04` (Wide-open RLS policies allowing public modification of orders, stats, insights, and chat logs).
- **Concrete Implementation Steps**:
  1. In `supabase/schema.sql`, execute:
     ```sql
     DROP POLICY "Cho phép cập nhật orders" ON orders;
     DROP POLICY "Cho phép đọc công khai orders" ON orders;
     DROP POLICY "Cho phép cập nhật campaign_stats" ON campaign_stats;
     DROP POLICY "Cho phép chèn live_logs anon" ON live_logs;
     DROP POLICY "Cho phép ghi market_insights cho service role và anon" ON market_insights;
     DROP POLICY "Cho phép đọc/ghi telegram_messages" ON telegram_messages;

     -- Secure Policies
     CREATE POLICY "Cho phép cập nhật orders cho service role" ON orders FOR UPDATE USING (auth.role() = 'service_role');
     CREATE POLICY "Cho phép cập nhật campaign_stats cho service role" ON campaign_stats FOR UPDATE USING (auth.role() = 'service_role');
     CREATE POLICY "Cho phép toàn quyền telegram_messages cho service role" ON telegram_messages FOR ALL USING (auth.role() = 'service_role');
     CREATE POLICY "Cho phép toàn quyền market_insights cho service role" ON market_insights FOR ALL USING (auth.role() = 'service_role');
     ```
- **Expected Outcome & Verification**: Executing `supabase.from('orders').update({ status: 'PAID' })` with the anon key fails with Postgres permission denied error.

#### Item 3: Payment Webhook Signature Hardening
- **Priority Tier**: Tier 1 (Critical)
- **Problem Addressed**: `SEC-06`, `ENV-03` (Webhook verification bypasses and simulator branches).
- **Concrete Implementation Steps**:
  1. In `src/app/api/webhooks/payos/route.ts:28-34`, remove the fallback `if (!webhookData && payload.data) webhookData = payload.data`. Reject immediately if `verifyPayOSWebhook` returns null.
  2. In `src/app/api/webhooks/payment/route.ts:27-38`, remove the simulator branch (`if (payload.orderCode) { gatewayName = 'Simulator' }`) and enforce HMAC verification or constant-time token comparison against `process.env.PAYMENT_WEBHOOK_SECRET`.
- **Expected Outcome & Verification**: Sending unverified POST requests to `/api/webhooks/payos` returns HTTP 400 with "Chữ ký PayOS không hợp lệ".

#### Item 4: Digital Asset Fulfillment Gatekeeper Fix
- **Priority Tier**: Tier 1 (Critical)
- **Problem Addressed**: `SEC-07` (Free downloads via `?preview=true` and product decoupling).
- **Concrete Implementation Steps**:
  1. In `src/app/api/download/route.ts:11-21`, replace arbitrary preview access with an explicit whitelist:
     ```typescript
     const isPreview = Boolean(fileKey && fileKey.endsWith('-preview.pdf') && searchParams.get('preview') === 'true');
     ```
  2. In `src/app/api/download/route.ts:33-35`, join `orders` with `products`:
     ```typescript
     const { data: order } = await supabase
       .from('orders')
       .select('status, product:products(r2_file_key)')
       .eq('order_code', orderCode)
       .single();
     if (!order || order.status !== 'PAID' || order.product?.r2_file_key !== fileKey) {
       return NextResponse.json({ success: false, error: 'Unauthorized file download' }, { status: 403 });
     }
     ```
- **Expected Outcome & Verification**: Requesting `/api/download?preview=true&key=chem-12-lo-trinh.pdf` returns HTTP 403. Attempting to use a 5k Pate order code to download a 149k guide returns HTTP 403.

#### Item 5: Secure Product Approval Route
- **Priority Tier**: Tier 1 (Critical)
- **Problem Addressed**: `SEC-05` (Unauthenticated state-changing GET handler).
- **Concrete Implementation Steps**:
  1. In `src/app/api/admin/approve-product/route.ts`, change `export async function GET` to `export async function POST`.
  2. Validate `req.headers.get('x-admin-token') === process.env.ADMIN_SECRET_KEY`.
  3. Remove dummy fallback product object (`CASIO-30S`) when `id` is not found in database.
- **Expected Outcome & Verification**: HTTP GET returns 405 Method Not Allowed. POST without valid token returns 401 Unauthorized.

#### Item 6: Fix 20 ESLint Errors & Link Build Script
- **Priority Tier**: Tier 1 (Critical)
- **Problem Addressed**: `CQ-01`, `CQ-02` (51 lint problems / 20 errors, build decoupling).
- **Concrete Implementation Steps**:
  1. Fix `src/components/funnel/ChemistryQuizModal.tsx:57-75`: Move helper functions above `useEffect`. Move timeout submission to effect body when `timeLeft === 0`.
  2. Fix `src/components/services/CustomTaskModal.tsx:199`: Replace unescaped `"` with `&quot;`.
  3. Fix synchronous `setState` in effects across `ProductCatalog.tsx:32`, `SurvivalHeader.tsx:22`, `LiveTerminal.tsx:18`, and `PaymentModal.tsx:88`: Use lazy initializer `useState(() => initialCalc)`.
  4. Fix impure `Date.now()` in `AIChatbot.tsx` and `HallOfFame.tsx`.
  5. In `package.json:7`, change `"build": "next build"` to `"build": "npm run lint && next build"`.
- **Expected Outcome & Verification**: `npm run lint` exits with code 0 (0 errors). `npm run build` exits with code 0.

#### Item 7: Serverless Order Persistence & MockStore Removal
- **Priority Tier**: Tier 1 (Critical)
- **Problem Addressed**: `ARCH-01` (In-memory order loss on serverless runtimes).
- **Concrete Implementation Steps**:
  1. In `src/lib/gemini.ts:127-137`, replace `mockStore.createOrder` with `getSupabaseAdminClient().from('orders').insert(...)`.
  2. Remove production reliance on `mockStore` in `/api/orders/create` and `/api/download`. Gate `mockStore` behind `process.env.NODE_ENV === 'test'`.
- **Expected Outcome & Verification**: Orders generated via AI Chatbot persist to Supabase PostgreSQL and can be fulfilled by webhooks running on any serverless container.

#### Item 8: Strict Server-Side Order Pricing
- **Priority Tier**: Tier 2 (High)
- **Problem Addressed**: `SEC-09` (Client-controlled price tampering via `customAmount`).
- **Concrete Implementation Steps**:
  1. In `src/app/api/orders/create/route.ts:30`, enforce:
     ```typescript
     const productPrice = prodData.type === 'DONATE' 
       ? Math.max(5000, Number(customAmount) || 5000) 
       : prodData.price;
     ```
- **Expected Outcome & Verification**: Sending `{ productId: "CHEM-149", customAmount: 1000 }` creates an order for 149,000 VND, ignoring the tampered amount.

#### Item 9: Stored XSS Elimination in Hall of Fame
- **Priority Tier**: Tier 2 (High)
- **Problem Addressed**: `SEC-11` (Stored XSS in `buyer_social_link`).
- **Concrete Implementation Steps**:
  1. In `src/app/api/orders/create/route.ts`, validate that `buyerSocialLink` is empty or matches `^https:\/\/(www\.)?(facebook|threads|github)\.com\/[a-zA-Z0-9._-]+$`.
  2. In `src/components/hall-of-fame/HallOfFame.tsx:153`, guard:
     ```tsx
     href={d.buyer_social_link.startsWith('https://') ? d.buyer_social_link : '#'}
     ```
- **Expected Outcome & Verification**: Submitting `javascript:alert(1)` is rejected by order creation or rendered as a safe no-op.

#### Item 10: AI Service Token Enforcement & Backdoor Removal
- **Priority Tier**: Tier 2 (High)
- **Problem Addressed**: `SEC-08` (Hardcoded bypass tokens, infinite reuse of redeem codes).
- **Concrete Implementation Steps**:
  1. In `src/app/api/services/chemistry-tutor/route.ts:35`, delete `CHM-TEST`, `CHM-ADMIN`, and `CHM-OWNER` bypass tokens.
  2. In `roast-cv/route.ts`, `tarot/route.ts`, and `chemistry-tutor/route.ts`, verify `.eq('is_redeemed', false)` and update `.update({ is_redeemed: true })` atomically upon consumption.
- **Expected Outcome & Verification**: Unused codes work once; reusing a redeemed code returns HTTP 403 "Mã đã được sử dụng". Backdoor tokens return HTTP 403.

#### Item 11: High-Entropy Order Code Generation (Nanoid)
- **Priority Tier**: Tier 2 (High)
- **Problem Addressed**: `FEAT-05` (9,000 combinations causing Birthday Paradox collisions after ~118 orders; PII harvesting).
- **Concrete Implementation Steps**:
  1. In `src/lib/vietqr.ts:47-50`, generate 6-character alphanumeric codes (e.g. `MEO-7K2X9P`).
  2. In `src/app/api/orders/[code]/route.ts`, mask `buyer_email` (e.g. `n***@gmail.com`) and omit `payment_meta` in public responses.
- **Expected Outcome & Verification**: 0 collisions across millions of orders. Brute-force enumerable search space expanded from 9,000 to over 2 billion combinations.

#### Item 12: Daemon Dockerfile Compatibility Fix
- **Priority Tier**: Tier 2 (High)
- **Problem Addressed**: `ARCH-04`, `ARCH-05` (Missing `git`, `powershell`, and hardcoded Windows paths in Alpine Docker container).
- **Concrete Implementation Steps**:
  1. In `daemon/Dockerfile`, add `git`, `bash`, and `curl`:
     ```dockerfile
     RUN apk add --no-cache tzdata git bash curl
     ```
  2. In `daemon/tasks/code-runner.ts:28-39`, remove hardcoded `C:\Users\ADMIN\...` path and resolve binary from `process.env.AGY_BIN_PATH` or system `PATH`.
- **Expected Outcome & Verification**: `docker build -t ai-survival-daemon -f daemon/Dockerfile .` compiles cleanly and executes `git` commands without crashing.

#### Item 13: Connect Payment Success UI Celebration
- **Priority Tier**: Tier 2 (High)
- **Problem Addressed**: `CQ-08` (`handlePaymentSuccess` defined in `page.tsx` but disconnected from `PaymentModal`).
- **Concrete Implementation Steps**:
  1. In `src/components/store/PaymentModal.tsx`, add `onSuccess?: () => void` to `PaymentModalProps`. Invoke `onSuccess?.()` inside `handleSuccessfulPayment`.
  2. In `src/app/page.tsx:335-350`, pass `onSuccess={handlePaymentSuccess}` to `<PaymentModal>`.
- **Expected Outcome & Verification**: Completing payment triggers the cat eating animation, plays audio celebration effects, and refreshes the campaign balance.

#### Item 14: Correct Default Gemini Model Name
- **Priority Tier**: Tier 2 (High)
- **Problem Addressed**: `CQ-12` (Non-existent model `gemini-3.5-flash-lite`).
- **Concrete Implementation Steps**:
  1. Replace `'gemini-3.5-flash-lite'` with `'gemini-2.0-flash'` in `src/lib/gemini.ts:36`, `daemon/config.ts:15`, `src/app/api/services/chemistry-tutor/route.ts:65`, and `.env.example:23`.
- **Expected Outcome & Verification**: AI endpoints function cleanly on fresh installations without requiring manual `.env` model overrides.

#### Item 15: Zod Schema Validation for Environment & API Requests
- **Priority Tier**: Tier 3 (Medium)
- **Problem Addressed**: `ENV-04`, `CQ-19` (Absence of schema validation on env variables and API payloads).
- **Concrete Implementation Steps**:
  1. Install `zod`. Create `src/lib/env.ts` validating all required environment variables at boot.
  2. Create request body schemas for `/api/orders/create`, `/api/chat`, `/api/services/custom-task/quote`, and `/api/services/roast-cv`.
- **Expected Outcome & Verification**: Invalid payloads or missing environment keys fail immediately with descriptive 400 errors instead of unhandled 500 exceptions.

#### Item 16: Next.js App Router Error Boundaries & Loading States
- **Priority Tier**: Tier 3 (Medium)
- **Problem Addressed**: `CQ-10`, `FEAT-07` (Missing `error.tsx`, `loading.tsx`, `not-found.tsx`).
- **Concrete Implementation Steps**:
  1. Create `src/app/error.tsx` and `src/app/global-error.tsx` with a styled dark-theme fallback UI and retry button.
  2. Create `src/app/loading.tsx` with skeleton cards for products and campaign stats.
  3. Create `src/app/not-found.tsx` with a custom 404 page featuring Mèo Dev.
- **Expected Outcome & Verification**: Component crashes trigger a graceful recovery screen rather than an unstyled blank browser window.

#### Item 17: HTTP Security Headers & Middleware Protection
- **Priority Tier**: Tier 3 (Medium)
- **Problem Addressed**: `SEC-14`, `SEC-13` (Missing security headers, clickjacking vulnerability, missing rate limiting).
- **Concrete Implementation Steps**:
  1. In `next.config.ts`, add security headers:
     - `X-Frame-Options: DENY`
     - `X-Content-Type-Options: nosniff`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Content-Security-Policy`: Default src self, allow Supabase WebSockets, PayOS, and Google AI Studio.
  2. Implement `middleware.ts` with an in-memory or Redis-backed sliding-window rate limiter on `/api/chat` and `/api/preorder`.
- **Expected Outcome & Verification**: Security scanner headers verified. Spamming 100 requests to `/api/chat` within 10 seconds triggers HTTP 429 Too Many Requests.

#### Item 18: Automated Testing Suite Establishment
- **Priority Tier**: Tier 3 (Medium)
- **Problem Addressed**: `CQ-03` (Zero automated tests in repository).
- **Concrete Implementation Steps**:
  1. Install `vitest`, `@testing-library/react`, and `jsdom`.
  2. Add `"test": "vitest run"` to `package.json`.
  3. Author unit tests for `src/lib/vietqr.ts`, `src/lib/profanity.ts`, and payment verification logic.
- **Expected Outcome & Verification**: `npm test` executes and passes with 100% green unit test coverage for pure utilities.

---

## 9. Independent Verification & Reproduction Guide

To independently verify the observations, errors, and vulnerabilities documented in this audit report, execute the following commands and code inspections in the workspace root (`d:\Go-Live\Web\AI Survival Store`):

### 1. Verify ESLint Execution Failure (20 Errors, 31 Warnings)
```powershell
npm run lint
```
*Expected Output*: Process exits with code `1`. Output confirms `51 problems (20 errors, 31 warnings)` across 15 files, highlighting `react-hooks/set-state-in-effect`, `react-hooks/purity`, `react-hooks/immutability`, and `react/no-unescaped-entities`.

### 2. Verify Production Build Decoupling
```powershell
npm run build
```
*Expected Output*: Process exits with code `0`. Next.js 16 (Turbopack) successfully compiles 20 static pages without failing on the 20 lint errors.

### 3. Verify Hidden TypeScript Indexing Errors
```powershell
npx tsc --noEmit --noUncheckedIndexedAccess
```
*Expected Output*: Process exits with code `1`. TypeScript compiler exposes `56 errors` originating from unvalidated array lookups in `src/lib/gemini.ts:337-339` and `daemon/tasks/market-analyzer.ts:90`.

### 4. Verify Absence of Automated Tests
```powershell
npm test
```
*Expected Output*: Process exits with `npm error Missing script: "test"`.

### 5. Verify RLS Open Security Policies
Inspect `supabase/schema.sql:110-117`:
Observe `CREATE POLICY ... ON orders FOR UPDATE USING (true) WITH CHECK (true)` and `CREATE POLICY ... ON campaign_stats FOR UPDATE USING (true) WITH CHECK (true)`.

### 6. Verify Digital Download Free Bypass
Inspect `src/app/api/download/route.ts:11-21`:
Observe `const isPreview = searchParams.get('preview') === 'true' ... if (isPreview) return NextResponse.redirect(...)`. Appending `preview=true` returns a presigned download URL for any file key without evaluating payment.

### 7. Verify Payment Webhook Signature Bypass
Inspect `src/app/api/webhooks/payos/route.ts:28-34`:
Observe `if (!webhookData && payload.data) webhookData = payload.data`. Invalid signature verification falls back to accepting `payload.data`.

### 8. Verify Unauthenticated Admin Product Publisher
Inspect `src/app/api/admin/approve-product/route.ts:6-25`:
Observe `export async function GET(req: NextRequest)` has zero authorization headers or token checks, modifying database state and creating products on raw GET requests.

### 9. Verify Stored XSS Vector
Inspect `src/components/hall-of-fame/HallOfFame.tsx:151-161`:
Observe `<a href={d.buyer_social_link}>` renders user-supplied links without protocol sanitization, executing `javascript:` URIs upon click.

---
*Report compiled and certified for technical accuracy by Teamwork Forensic Audit Worker.*
