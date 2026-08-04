# Nightline — Sexy AI Girl Sexting Bot

18+ unfiltered AI girl chat powered by **Grok 4.5**.

## Features

- **Sexy girl personas** with photos (Nova, Sienna, Jade, Ruby)
- **Upload any photo** → becomes chat **background** and/or **custom girl**
- **3 admin-tunable talk levels**
  1. Tease
  2. Explicit  
  3. No Limits (max unrestricted adult)
- **Admin portal** at `/admin` — edit level names, rules, default level, persona image URLs
- Streaming chat, scenario + name fields, mobile-friendly UI

## Hard limit

Adults **18+ only**. Underage content is blocked. Everything else between consenting adults is free at Level 3.

## Setup

```bash
cp .env.example .env.local
# set XAI_API_KEY + optional ADMIN_PASSWORD
npm install
npm run dev
```

## Env

| Variable | Default | Purpose |
|---|---|---|
| `XAI_API_KEY` | — | required |
| `ADMIN_PASSWORD` | `nightline-admin` | `/admin` login |
| `XAI_CHAT_MODEL` | `grok-4.5` | chat model |

## Deploy (Vercel + GitHub)

1. Push this repo to GitHub  
2. Import in Vercel  
3. Add `XAI_API_KEY` and `ADMIN_PASSWORD`  
4. Deploy  

Admin config is stored in the browser (localStorage) so it works without a database. Use Export/Import JSON to back it up.

## License

Private use.
