# Nightline — Unfiltered Adult Sexting Bot

18+ AI companion chat powered by **Grok 4.5** (xAI). Explicit adult roleplay with persona picker, custom character, intensity modes, and streaming replies.

> **Adults only.** Hard block on underage content. Everything else between consenting adults is allowed in the system prompts.

## Stack

- Next.js 15 (App Router)
- OpenAI-compatible client → `https://api.x.ai/v1`
- Model: `grok-4.5`
- Deploy: Vercel

## Local setup

```bash
cd sexting-bot
cp .env.example .env.local
# put your key from https://console.x.ai
npm install
npm run dev
```

Open http://localhost:3000

## Env

| Variable | Required | Description |
|---|---|---|
| `XAI_API_KEY` | yes | xAI API key |
| `XAI_CHAT_MODEL` | no | default `grok-4.5` |

## Deploy (Vercel)

1. Push this repo to GitHub
2. Import the project in Vercel (team **WC** / your account)
3. Add env var **`XAI_API_KEY`** for Production + Preview
4. Deploy

Or CLI:

```bash
npx vercel --prod
```

## Notes

- Age gate is client-side (localStorage). This is not legal compliance by itself.
- API key stays server-side (`app/api/chat`).
- Underage cues in requests are rejected by the API route.

## License

Private — for your own use.
