# MeetSpace Frontend

Next.js 14 (App Router) web client for the Meeting platform.

## Stack

- React 18 + TypeScript (strict)
- Tailwind CSS
- LiveKit Client + `@livekit/components-react`
- TanStack Query, Zustand, React Hook Form + Zod

## Setup

```bash
cd frontend
cp .env.local.example .env.local
# set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_LIVEKIT_URL
npm install
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend REST base URL (no trailing slash) |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit WebSocket URL (`wss://…`) |

Auth uses **Bearer token** in the `Authorization` header (token stored in `localStorage` under `meeting_access_token`). Cookie auth can be swapped in `lib/api/client.ts` later.

## Folder map

```
app/                 routes (marketing, auth, dashboard, meeting, settings)
components/call/     reusable in-call UI (SDK-ready, Next-light)
components/auth/     login / signup forms
components/dashboard/
components/ui/       Button, Input, Modal, Toast, ErrorBoundary
lib/api/             typed REST client
lib/livekit/         connection helpers
lib/store/           Zustand call + preferences
lib/hooks/
types/
```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
