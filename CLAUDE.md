@AGENTS.md

# Loopical — Voice-first Feedback Platform

## Was ist Loopical?
User laden Bilder/Dokumente hoch, definieren Feedback-Punkte ("Loopicals"), und Feedback-Geber (auch Gäste ohne Account) nehmen Voice-Feedback auf. Audio wird per ElevenLabs Scribe v2 transkribiert und per Kimi K2.5 (Ollama Cloud) in Summary + Action Items zerlegt.

## Tech Stack
- **Next.js 16.2.1** (App Router, Server Components, Server Actions)
- **React 19.2.4** mit React Compiler
- **Tailwind CSS v4** (OKLch colors, `@import "tailwindcss"` statt config file)
- **shadcn/ui** (base-nova style, uses `@base-ui/react` primitives — NOT radix)
- **Supabase** (PostgreSQL, Auth, Storage) — Projekt: `fbtobuuaenwjpbjftxhc`, Region: EU West
- **ElevenLabs Scribe v2** für Speech-to-Text
- **Kimi K2.5** via Ollama Cloud (`https://ollama.com/api`, model `kimi-k2.5:cloud`)
- **Deployment:** Vercel (auto-deploy bei push auf `main`)

## Kritische Next.js 16 Patterns
- `params`, `searchParams`, `cookies()`, `headers()` sind **Promises** — immer `await`
- **`proxy.ts`** statt `middleware.ts` (named export `proxy`, NOT `middleware`)
- `useActionState` statt deprecated `useFormState`
- Turbopack ist default Bundler
- `serverActions.bodySizeLimit` liegt unter `experimental` in next.config.ts

## Architektur-Entscheidungen

### Admin Client für DB-Operationen
Alle authentifizierten Server Actions und Server Components nutzen den **Admin Client** (`SUPABASE_SERVICE_ROLE_KEY`) für Datenbank-Operationen. Der User wird vorher über `requireUser()` verifiziert. Grund: Der Supabase SSR Server-Client kann in Next.js 16 Server Actions die User-Session aus Cookies nicht zuverlässig an RLS weitergeben.

- `src/lib/supabase/admin.ts` → für alle authenticated reads/writes
- `src/lib/supabase/server.ts` → nur für Auth-Operationen (login, getUser)
- `src/lib/supabase/client.ts` → Browser-Client (Realtime subscriptions)

### Auth Flow
- **Demo Login:** `demo@loopical.app` / `demo1234` (Email+Password)
- **Magic Link:** Supabase OTP mit PKCE Flow → `/auth/confirm` (handles both `code` und `token_hash`)
- **Google OAuth:** Konfiguriert aber nicht aktiviert (braucht Google Cloud Console setup)
- **Proxy** (`src/proxy.ts`): Schützt alle Routes außer `/`, `/login`, `/auth`, `/feedback`, `/api`, `/_next`

### Guest Feedback (kein Login)
- `/feedback/[share_token]` → zeigt Projekt + Loopicals
- `/feedback/[share_token]/[loopicalId]` → Voice Recording
- Nutzt `get_project_by_share_token()` und `get_loopicals_by_share_token()` DB-Funktionen (security definer)
- Audio Upload via `/api/feedback` Route Handler (Admin Client, bypasses RLS)

### AI Pipeline
- Trigger: `after()` in `/api/feedback` Route Handler nach Upload
- Flow: `pending` → `transcribing` (ElevenLabs) → `analyzing` (Kimi K2.5) → `complete`
- Status-Updates via Admin Client → Supabase Realtime
- Robustes JSON-Parsing für Kimi K2.5 (Markdown-Stripping, Regex-Fallback)

## Projekt-Struktur
```
src/
  proxy.ts                          # Auth guard (Next.js 16 proxy pattern)
  lib/
    supabase/{client,server,admin}.ts
    auth.ts                         # getUser(), requireUser()
    storage.ts                      # uploadAudio(), uploadImage()
    types/database.ts               # Supabase typed schema
    ai/{transcribe,analyze,pipeline,types}.ts
  hooks/
    use-media-recorder.ts           # MediaRecorder API wrapper
    use-audio-visualizer.ts         # Canvas waveform
    use-realtime-status.ts          # Supabase Realtime subscription
  components/
    voice-recorder.tsx              # Record button, waveform, timer
    audio-player.tsx                # Play/pause, speed, progress
    transcript-view.tsx             # Word-level highlighting
    feedback-detail.tsx             # Full feedback card with player
    processing-status.tsx           # Realtime status indicator
    app-sidebar.tsx                 # Navigation sidebar
    guided-feedback-flow.tsx        # Gast-seitiger geführter Feedback-Flow
    wizard/                         # Loopical-Erstellungs-Wizard (Step 1-4)
    ...
  app/
    (authenticated)/                # Route group — requireUser() in layout
      dashboard/                    # Project overview
      projects/new/                 # Create project
      projects/[id]/                # Project detail + loopicals
      projects/[id]/loopicals/[loopicalId]/  # Loopical detail + feedback
      settings/                     # Profile settings
    feedback/[share_token]/         # Guest feedback (public)
    login/                          # Login page (demo + magic link)
    auth/{callback,confirm}/        # OAuth + magic link handlers
    api/feedback/                   # Audio upload + AI trigger
    api/question-audio/             # Voice-Frage Upload + Transkription
supabase/
  migrations/001_schema.sql         # Full schema, RLS, functions, indexes
  migrations/002_annotations.sql    # Annotation coordinates
  migrations/003_wizard_schema.sql  # Multi-media, feedback points, guided mode
```

## Datenbank
8 Tabellen: `profiles`, `projects`, `project_members`, `loopicals`, `loopical_media`, `feedback_points`, `feedback_entries`, `comments`
- `loopical_media` — mehrere Bilder/Screenshots pro Loopical
- `feedback_points` — spezifische Fragen mit optionalen Markern (für guided mode)
- `loopicals.feedback_mode` — `'guided'` oder `'open'`
- `feedback_entries.feedback_point_id` — Zuordnung zu spezifischem Feedback-Punkt
- RLS ist aktiviert auf allen Tabellen (aber authenticated ops nutzen Admin Client)
- Storage Buckets: `audio` (public read, anyone upload), `media` (public read, auth upload)
- Realtime aktiviert auf `feedback_entries`
- Guest-Zugriff via Security-Definer-Funktionen: `get_project_by_share_token()`, `get_loopicals_by_share_token()`, `get_feedback_points_by_share_token()`, `get_loopical_media_by_share_token()`

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL          # https://fbtobuuaenwjpbjftxhc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     # JWT anon key
SUPABASE_SERVICE_ROLE_KEY         # JWT service role key (server-only!)
ELEVENLABS_API_KEY                # sk_...
OLLAMA_CLOUD_BASE_URL             # https://ollama.com/api
OLLAMA_CLOUD_API_KEY              # API key für Ollama Cloud
NEXT_PUBLIC_APP_URL               # https://loopical.vercel.app (prod) / http://localhost:3000 (dev)
```

## Commands
```bash
npm run dev     # Start dev server (Turbopack)
npm run build   # Production build
npm run lint    # ESLint
```

## Deployment & Infrastruktur

### Vercel
- Auto-deploy bei push auf `main` — kein manuelles Deploy nötig
- Projekt-ID: `prj_P6u7afkQYf16PZJrj19yKWtwlQFn`
- Team-ID: `team_lEdzIh1u5lI7ql7LqRkP8IpJ`
- Deployment-Status prüfen via Vercel MCP Tools (`list_deployments`, `get_deployment`, `get_runtime_logs`)
- Production URL: `https://loopical.vercel.app`

### Supabase Migrations
- CLI ist installiert (`npx supabase`), Projekt ist gelinkt
- Migration anwenden: `SUPABASE_ACCESS_TOKEN=<pat> npx supabase db push --linked`
- Migration immer VOR dem Push zu GitHub anwenden (DB-Schema muss bereit sein wenn Vercel deployed)

## Wichtige Gotchas

### Server vs Client Components
- `src/components/ui/button.tsx` hat `"use client"` — `buttonVariants()` kann NICHT in Server Components aufgerufen werden. Stattdessen inline Klassen oder einen Client-Wrapper verwenden.
- Generell: Alle shadcn/ui Komponenten in diesem Projekt sind `"use client"` (base-ui braucht das). Exports aus diesen Dateien (auch reine Funktionen wie CVA-Varianten) können nicht in Server Components importiert und aufgerufen werden.
- Button hat kein `asChild` Prop (base-ui, nicht radix). Für Links mit Button-Styling: `<Button render={<Link href="..." />}>` oder inline Klassen auf dem Link.

## currentDate
Today's date is 2026-03-26.
