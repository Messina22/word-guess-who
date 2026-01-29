# Sight Word Guess Who

A web-based educational game inspired by the classic "Guess Who" board game, using sight words instead of character faces. Two players compete to guess each other's secret word by asking yes/no questions about letter patterns, sounds, and word characteristics.

## How It Works

1. **Setup**: An instructor creates a game configuration with a word bank and suggested questions
2. **Game Start**: Two players join a game session and each receives a secret word
3. **Gameplay**: Players take turns asking yes/no questions (e.g., "Does your word have the letter 'e'?")
4. **Card Flipping**: Players tap cards to eliminate words based on answers
5. **Winning**: First player to correctly guess the opponent's word wins

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Language**: TypeScript
- **Frontend**: React 18 + React Router 6
- **Build Tool**: Vite
- **Database**: SQLite (via Bun's native `bun:sqlite`)
- **Styling**: Tailwind CSS with custom "bulletin board" theme
- **Real-time**: WebSockets for multiplayer gameplay

## Getting Started

```bash
# Install dependencies
bun install

# Start development (two terminals)
bun run dev          # Backend server on port 3000
bun run dev:client   # Vite dev server on port 5173

# Or run both together
bun run dev:all

# Open http://localhost:5173 in your browser
```

## Scripts

```bash
bun run dev          # Start backend server with hot reload
bun run dev:client   # Start Vite dev server for React
bun run dev:all      # Run both servers concurrently
bun run build        # Build server for production
bun run build:client # Build React client for production
bun run start        # Run production build
bun run test         # Run tests
bun run lint         # Run ESLint
bun run typecheck    # TypeScript type checking
```

## API Endpoints

### Configuration API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/configs` | List all game configurations |
| GET | `/api/configs/:id` | Get specific configuration |
| POST | `/api/configs` | Create new configuration |
| PUT | `/api/configs/:id` | Update configuration |
| DELETE | `/api/configs/:id` | Delete configuration |

### Game Session API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | Create a new game session |
| GET | `/api/games/:code` | Get game session by code |
| WS | `/ws` | WebSocket connection for real-time gameplay |

## Project Structure

```
src/
├── client/             # React frontend
│   ├── components/     # UI components
│   │   ├── game/       # Game board, cards, question panel
│   │   └── lobby/      # Create/join game forms
│   ├── context/        # React Context for game state
│   ├── hooks/          # Custom hooks (useGameState, etc.)
│   ├── lib/            # WebSocket client, API client
│   ├── pages/          # HomePage, GamePage
│   ├── App.tsx         # Router setup
│   ├── main.tsx        # Entry point
│   └── index.css       # Tailwind + custom styles
├── server/             # Bun HTTP server
│   ├── index.ts        # Server entry point
│   ├── db.ts           # SQLite database
│   ├── config-manager.ts
│   ├── session-manager.ts  # WebSocket game sessions
│   ├── game-engine.ts  # Game logic
│   └── routes/
│       ├── api.ts      # Config REST handlers
│       └── game.ts     # Game session handlers
└── shared/             # Shared code
    ├── types.ts        # TypeScript interfaces
    └── validation.ts   # Zod schemas
configs/                # Game configuration JSON files
data/                   # SQLite database (gitignored)
dist/                   # Production builds (gitignored)
```

## Art Style

The UI features an "Elementary School Bulletin Board" aesthetic with:
- Cork board background texture
- Paper card styling with subtle shadows
- Playful color palette (paper-red, crayon-blue, sunshine, grass, grape, tangerine)
- Hand-drawn style fonts (Patrick Hand, Andika)
- Card flip animations and confetti effects

## License

MIT
