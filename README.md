# Nightline — Unrestricted AI Sex Chat Bot

18+ adult AI companion platform powered by **Grok / xAI**.

## What's included

- **Auth**: signup, login, httpOnly session cookies, forgot + reset password
- **3 talk levels** (admin assigns max level per user)
  1. Tease
  2. Explicit
  3. **No Limits** — full unrestricted adult (kinks, CNC fantasy, voice call mode)
- **Credits** — admin adds/sets credits; messages, media, voice spend credits
- **Companions** — women, men, gay, lesbian, bi, trans, custom (real-looking portraits)
- **Roleplays** — hotel, ex texts, OF chat, dom/sub, CNC (L3), etc.
- **Media** — share images; AI can "send" photo/voice tags
- **Voice notes** — browser mic recording
- **Voice call mode** — L3 conversational call UI
- **Admin dashboard** (`/admin`)
  - Assign credits & levels
  - Ban / set password
  - **Live chats** (auto-refresh)
  - Full **chat history**
  - Site config + level rules
  - Password reset queue

## Hard limit

**Adults 18+ only.** Characters are 21+. Underage content is blocked.

## Setup

```bash
cp .env.example .env.local
# set XAI_API_KEY, ADMIN_PASSWORD, AUTH_SECRET
npm install
npm run dev
```

Open http://localhost:3000

### Default admin

- URL: `/admin`
- Password: `nightline-admin` (or your `ADMIN_PASSWORD`)
- Seed user: `admin@nightline.app` with the same password

## Env

| Variable | Default | Purpose |
|---|---|---|
| `XAI_API_KEY` | — | required |
| `ADMIN_PASSWORD` | `nightline-admin` | admin unlock |
| `AUTH_SECRET` | fallback | JWT cookie signing |
| `DEFAULT_CREDITS` | `50` | new user credits |
| `XAI_CHAT_MODEL` | `grok-4.5` | chat model |

## Deploy (Netlify or Vercel)

1. Connect this GitHub repo
2. Add env: `XAI_API_KEY`, `ADMIN_PASSWORD`, `AUTH_SECRET`
3. Build command: `npm run build` (Netlify uses `@netlify/plugin-nextjs`)

### Storage note

User accounts, chats, and messages persist in `data/db.json` (and in-memory on the server).

- **Local / VPS / Railway**: file persistence works out of the box
- **Netlify/Vercel serverless**: filesystem is ephemeral — data can reset on cold starts. For production scale, plug in Postgres/Upstash later; `lib/db.ts` is the single place to swap.

## User flow

1. Land on `/` → **Sign up** or **Log in**
2. Admin sets their **level** (1–3) and **credits**
3. User picks companion category, roleplay, level ≤ their max
4. Chat, share media, voice notes; L3 can start call mode
5. Admin watches **Live** + **History**

## License

Private use.
