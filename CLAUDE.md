# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sight Word Guess Who is a web-based two-player educational game for practicing sight words. Players compete to guess each other's secret word by asking yes/no questions about letter patterns, sounds, and word characteristics.

**Tech Stack:** Bun runtime, TypeScript, React 18, Tailwind CSS, SQLite via `bun:sqlite`, WebSockets for real-time multiplayer.

## Commands

```bash
bun run dev          # Start backend server with hot reload (port 3000)
bun run dev:client   # Start Vite dev server for React (port 5173)
bun run dev:all      # Run both servers concurrently
bun run build        # Build server for production
bun run build:client # Build React client for production
bun run start        # Run production build
bun run test         # Run tests with Bun's test runner
bun run lint         # ESLint
bun run typecheck    # TypeScript type checking
```

## Architecture

### Path Aliases
- `@shared/*` → `src/shared/*` (types, validation)
- `@server/*` → `src/server/*` (server code)
- `@client/*` → `src/client/*` (React components, hooks, context)

### Server Structure
- `src/server/index.ts` - HTTP server entry point using `Bun.serve()`, manual routing, static file serving in production
- `src/server/routes/api.ts` - REST API handlers for `/api/configs` endpoints
- `src/server/routes/game.ts` - REST API handlers for `/api/games` endpoints
- `src/server/config-manager.ts` - CRUD operations for game configs, loads JSON from `configs/` on startup
- `src/server/session-manager.ts` - WebSocket session management, game rooms, message broadcasting
- `src/server/game-engine.ts` - Core game logic (turns, questions, guesses, win detection, word selection)
- `src/server/db.ts` - SQLite connection with WAL mode, schema initialization

### Client Structure
- `src/client/App.tsx` - React Router setup with HomePage and GamePage routes
- `src/client/context/GameContext.tsx` - Game state management via React Context + reducer
- `src/client/hooks/useGameState.ts` - Derived game state (isMyTurn, isPlaying, etc.)
- `src/client/hooks/useGameActions.ts` - Game action wrappers (flipCard, askQuestion, etc.)
- `src/client/lib/websocket.ts` - WebSocket client with reconnection
- `src/client/lib/api.ts` - REST API client
- `src/client/components/game/` - GameBoard, WordCard, QuestionPanel, QuestionLog, TurnIndicator, GameOverOverlay, WordSelectionScreen
- `src/client/components/lobby/` - CreateGameForm, JoinGameForm, WaitingRoom

### Shared Code
- `src/shared/types.ts` - Core TypeScript interfaces (GameSession, Player, CardState, all WebSocket message types)
- `src/shared/validation.ts` - Zod schemas for config validation

### Game Flow
1. **waiting** - Game created, waiting for second player to join
2. **selecting** - Both players joined, each selects their secret word (unless randomSecretWords is enabled)
3. **playing** - Players take turns asking questions and making guesses
4. **finished** - A player correctly guessed the opponent's word

### Game Session Options
- `isLocalMode` - Questions asked in person, only word guesses submitted through the app
- `showOnlyLastQuestion` - Only display the most recent question in the log
- `randomSecretWords` - Auto-assign secret words (skips selecting phase)

### WebSocket Messages
**Client → Server:** `join_game`, `flip_card`, `ask_question`, `answer_question`, `make_guess`, `leave_game`, `select_secret_word`

**Server → Client:** `error`, `game_state`, `player_joined`, `player_left`, `player_reconnected`, `card_flipped`, `question_asked`, `question_answered`, `guess_made`, `game_over`, `game_expired`, `word_selected`

### Data Flow
1. JSON config files in `configs/` are loaded into SQLite on server startup (if not already present)
2. Full config stored as JSON blob in `config_json` column, with `id`, `name`, timestamps in separate columns
3. API responses wrapped in `ApiResponse<T>` with `success`, `data`, `error`/`errors` fields
4. Game sessions stored in memory (SessionManager), not persisted to database

### Validation Rules
- Config ID: lowercase alphanumeric with hyphens
- Word bank: 12-100 words required
- At least 1 suggested question required
- Grid size must be 12, 16, 20, or 24

## API Endpoints

### Configuration API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/configs` | List all configurations |
| GET | `/api/configs/:id` | Get specific configuration |
| POST | `/api/configs` | Create configuration |
| PUT | `/api/configs/:id` | Update configuration |
| DELETE | `/api/configs/:id` | Delete configuration |

### Game Session API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | Create a new game session |
| GET | `/api/games/:code` | Get game session by code |
| WS | `/ws` | WebSocket connection for real-time gameplay |

## Development Notes

- Database stored at `data/game.db` (gitignored)
- Default config with 24 Dolch sight words loaded from `configs/default.json`
- CORS is permissive (`*`) for development
- In production, server serves static files from `dist/client/`
- Player IDs stored in localStorage for reconnection support
- Sessions expire after 5 minutes of inactivity
