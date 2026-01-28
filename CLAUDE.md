# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sight Word Guess Who is a web-based two-player educational game for practicing sight words. Players compete to guess each other's secret word by asking yes/no questions about letter patterns, sounds, and word characteristics.

**Tech Stack:** Bun runtime, TypeScript, React (planned), Tailwind CSS, SQLite via `bun:sqlite`, WebSockets for real-time multiplayer.

## Commands

```bash
bun run dev        # Start development server with hot reload (port 3000)
bun run build      # Build for production
bun run start      # Run production build
bun run test       # Run tests with Bun's test runner
bun run lint       # ESLint
bun run typecheck  # TypeScript type checking
```

## Architecture

### Path Aliases
- `@shared/*` → `src/shared/*` (types, validation)
- `@server/*` → `src/server/*` (server code)

### Server Structure
- `src/server/index.ts` - HTTP server entry point using `Bun.serve()`, manual routing
- `src/server/routes/api.ts` - REST API handlers for `/api/configs` endpoints
- `src/server/config-manager.ts` - CRUD operations for game configs, loads JSON from `configs/` on startup
- `src/server/db.ts` - SQLite connection with WAL mode, schema initialization

### Shared Code
- `src/shared/types.ts` - Core TypeScript interfaces (`GameConfig`, `WordEntry`, `Question`, `GameSettings`, `ApiResponse`)
- `src/shared/validation.ts` - Zod schemas for config validation

### Data Flow
1. JSON config files in `configs/` are loaded into SQLite on server startup (if not already present)
2. Full config stored as JSON blob in `config_json` column, with `id`, `name`, timestamps in separate columns
3. API responses wrapped in `ApiResponse<T>` with `success`, `data`, `error`/`errors` fields

### Validation Rules
- Config ID: lowercase alphanumeric with hyphens
- Word bank: 12-100 words required
- At least 1 suggested question required
- Grid size must be 12, 16, 20, or 24

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/configs` | List all configurations |
| GET | `/api/configs/:id` | Get specific configuration |
| POST | `/api/configs` | Create configuration |
| PUT | `/api/configs/:id` | Update configuration |
| DELETE | `/api/configs/:id` | Delete configuration |

## Development Notes

- Database stored at `data/game.db` (gitignored)
- Default config with 24 Dolch sight words loaded from `configs/default.json`
- CORS is permissive (`*`) for development
- React frontend and WebSocket game logic are planned for future phases
