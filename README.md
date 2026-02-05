# Word Guess Who

A web-based educational game inspired by the classic "Guess Who" board game, using sight words instead of character faces. Two players compete to guess each other's secret word by asking yes/no questions about letter patterns, sounds, and word characteristics.

## How It Works

1. **Create a Game**: Choose a word set, configure game options, and share the 6-character game code
2. **Join & Select**: Both players join and select their secret word from the board (or have words randomly assigned)
3. **Ask Questions**: Take turns asking yes/no questions (e.g., "Does your word have the letter 'e'?")
4. **Eliminate Words**: Tap cards to flip/eliminate words based on the answers
5. **Make a Guess**: When ready, guess your opponent's secret word to win!

## Features

- **Real-time Multiplayer**: WebSocket-based gameplay with instant updates
- **Secret Word Selection**: Players choose their own secret word, or enable random assignment
- **Local 2-Player Mode**: Ask questions in person, only submit word guesses through the app
- **Question History**: Track all questions asked and their answers
- **Reconnection Support**: Rejoin a game if you get disconnected
- **Responsive Design**: Works on desktop and mobile devices

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

## Game Options

When creating a game, you can configure:

| Option                      | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| **Word Set**                | Choose which collection of sight words to use               |
| **Local 2-Player Mode**     | Ask questions verbally, only submit guesses through the app |
| **Show Only Last Question** | Display only the most recent question in the log            |
| **Random Secret Words**     | Auto-assign secret words instead of letting players choose  |

## API Endpoints

### Configuration API

| Method | Endpoint           | Description                  |
| ------ | ------------------ | ---------------------------- |
| GET    | `/api/configs`     | List all game configurations |
| GET    | `/api/configs/:id` | Get specific configuration   |
| POST   | `/api/configs`     | Create new configuration     |
| PUT    | `/api/configs/:id` | Update configuration         |
| DELETE | `/api/configs/:id` | Delete configuration         |

### Game Session API

| Method | Endpoint           | Description                                 |
| ------ | ------------------ | ------------------------------------------- |
| POST   | `/api/games`       | Create a new game session                   |
| GET    | `/api/games/:code` | Get game session by code                    |
| WS     | `/ws`              | WebSocket connection for real-time gameplay |

## Project Structure

```
src/
├── client/                 # React frontend
│   ├── components/
│   │   ├── game/           # GameBoard, WordCard, QuestionPanel, QuestionLog,
│   │   │                   # TurnIndicator, GameOverOverlay, WordSelectionScreen
│   │   └── lobby/          # CreateGameForm, JoinGameForm, WaitingRoom
│   ├── context/            # GameContext (state management)
│   ├── hooks/              # useGameState, useGameActions, useWebSocket
│   ├── lib/                # WebSocket client, API client
│   ├── pages/              # HomePage, GamePage
│   ├── App.tsx             # Router setup
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind + custom styles
├── server/                 # Bun HTTP server
│   ├── index.ts            # Server entry point
│   ├── db.ts               # SQLite database
│   ├── config-manager.ts   # Game configuration CRUD
│   ├── session-manager.ts  # WebSocket game sessions
│   ├── game-engine.ts      # Core game logic
│   └── routes/
│       ├── api.ts          # Config REST handlers
│       └── game.ts         # Game session handlers
└── shared/                 # Shared code
    ├── types.ts            # TypeScript interfaces
    └── validation.ts       # Zod schemas
configs/                    # Game configuration JSON files
data/                       # SQLite database (gitignored)
dist/                       # Production builds (gitignored)
```

## Game Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   waiting   │ ──▶ │  selecting  │ ──▶ │   playing   │ ──▶ │  finished   │
│             │     │             │     │             │     │             │
│ Waiting for │     │ Players     │     │ Ask/answer  │     │ Winner      │
│ 2nd player  │     │ pick words  │     │ questions   │     │ announced   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │
                          │ (skipped if randomSecretWords=true)
                          ▼
```

## Art Style

The UI features an "Elementary School Bulletin Board" aesthetic with:

- Cork board background texture
- Paper card styling with subtle shadows
- Playful color palette (paper-red, crayon-blue, sunshine, grass, grape, tangerine)
- Hand-drawn style fonts (Patrick Hand, Andika)
- Card flip animations and confetti effects

## Deployment

The app is deployed to [Fly.io](https://fly.io) using a multi-stage Docker build.

### Prerequisites

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Fly.io account

### Deploy

```bash
# First-time setup (already done for this app)
fly launch

# Create a persistent volume for SQLite
fly volumes create data --region iad --size 1

# Deploy
fly deploy

# View logs
fly logs
```

The production app runs at: https://word-guess-who.fly.dev

## License

MIT
