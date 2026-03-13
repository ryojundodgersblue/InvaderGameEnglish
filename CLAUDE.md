# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

English conversation learning game (英会話ゲーム) with a battle-style UI. Users answer English questions via voice recognition (Web Speech API) to attack an enemy character. Data is stored in Google Sheets as the primary database.

## Commands

### Backend (Express, CommonJS)
```bash
cd backend
npm install
npm run dev      # node --watch index.js (port 4000)
npm start        # node index.js
```

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
npm run dev      # vite dev server (port 5173)
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

No test framework is configured yet.

## Architecture

### Data Flow
Google Sheets (primary DB) → Backend (Express API) → Frontend (React SPA)

- **Google Sheets** stores all data: users, questions, answer_patterns, scores, parts
- **Redis** is an optional cache layer (gracefully degrades when unavailable; disabled by default in dev when REDIS_HOST is not set or is localhost)
- **Google Cloud TTS** provides text-to-speech audio for question playback

### Backend (`backend/`)
- `index.js` — Entry point, loads dotenv, starts Express on PORT (default 4000)
- `src/app.js` — Express app setup, CORS config, route mounting
- `src/routes/` — Route handlers:
  - `logInPage.js` — Auth endpoints (`/auth/login`)
  - `playGame.js` — Game logic (`/game/part`, `/game/questions`, `/game/score`, `/game/advance`)
  - `ranking.js` — Ranking data (`/ranking`)
  - `select.js` — Stage selection (`/select`)
  - `tts.js` — Text-to-speech proxy (`/api/tts`)
  - `admin.js` — Admin user management (`/admin`)
- `src/services/google.js` — Google Sheets + TTS client (supports both keyfile and JSON env var auth for cloud deployment)
- `src/services/redis.js` — Redis cache with TTL-based caching for sheets data, TTS audio, and rankings
- `src/middleware/auth.js` — JWT auth via httpOnly cookies (`authToken`), with `authenticateToken` and `optionalAuth`
- `src/middleware/validation.js` — Request validation and error sanitization

### Frontend (`frontend/`)
- React 19 + React Router 7 + Vite + TypeScript
- `src/config.ts` — API base URL from `VITE_API_URL` env var (default `http://localhost:4000`)
- Pages: LoginPage → SelectPage → PlayPage → ResultPage, plus Ranking and AdminPage
- `src/pages/PlayPage.tsx` — Core game logic with state machine (phases: idle → speaking → listening → beam/explosion → reveal → intermission → finished). Uses Web Speech API for voice recognition.
- `src/utils/googleTTS.ts` / `audioCache.ts` — TTS audio fetching and caching on frontend

### Key Patterns
- All backend routes validate Google Sheets headers against expected constants before processing data
- User IDs may have leading zeros (e.g., "00002") — use `FORMATTED_VALUE` when reading from Sheets to preserve them
- Game progression: users advance to next stage after clearing or after 10 attempts (`REQUIRED_ATTEMPTS`)
- Auth uses JWT stored in httpOnly cookies, not Authorization headers
- Backend supports two auth modes for Google APIs: keyfile (`credentials.json`) or `GOOGLE_CREDENTIALS_JSON` env var (for cloud platforms like Render)

### Environment Variables
See `backend/.env.example` for required config: `SHEET_ID`, `GOOGLE_KEYFILE`, `JWT_SECRET`, `REDIS_*`, `FRONTEND_URL`.
Frontend uses `VITE_API_URL` for the backend URL.
