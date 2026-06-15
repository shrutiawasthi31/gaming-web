# PulsePlay Arena

PulsePlay Arena is a full-stack gaming web app built with Next.js. It includes:

- a responsive gaming landing page
- register and login flows with secure hashed passwords
- cookie-based sessions
- a playable browser mini-game
- a backend leaderboard API that stores scores server-side

## Tech stack

- Next.js App Router
- React
- Node.js file-backed persistence in `data/`

## Run locally

1. Install dependencies:

```bash
pnpm install
```

2. Start the dev server:

```bash
pnpm dev
```

3. Open `http://localhost:3000`

## Notes

- User and score records are stored in JSON files under `data/`.
- `data/*.json` is ignored by git so local account data and scores do not get committed.
