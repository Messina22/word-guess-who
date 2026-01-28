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
- **Frontend**: React (planned)
- **Database**: SQLite (via Bun's native `bun:sqlite`)
- **Styling**: Tailwind CSS
- **Real-time**: WebSockets (planned)

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Server runs at http://localhost:3000
```

## Scripts

```bash
bun run dev        # Start dev server with hot reload
bun run build      # Build for production
bun run start      # Run production build
bun run test       # Run tests
bun run lint       # Run ESLint
bun run typecheck  # TypeScript type checking
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/configs` | List all game configurations |
| GET | `/api/configs/:id` | Get specific configuration |
| POST | `/api/configs` | Create new configuration |
| PUT | `/api/configs/:id` | Update configuration |
| DELETE | `/api/configs/:id` | Delete configuration |

## Project Structure

```
src/
├── server/           # Bun HTTP server
│   ├── index.ts      # Server entry point
│   ├── db.ts         # SQLite database
│   ├── config-manager.ts
│   └── routes/
│       └── api.ts    # REST API handlers
└── shared/           # Shared code
    ├── types.ts      # TypeScript interfaces
    └── validation.ts # Zod schemas
configs/              # Game configuration JSON files
data/                 # SQLite database (gitignored)
```

## License

MIT