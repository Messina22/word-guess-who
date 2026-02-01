# Sight Word Guess Who - Project Plan

## Overview

A web-based educational game inspired by the classic "Guess Who" board game, but using sight words instead of character faces. Two players compete to guess each other's secret word by asking yes/no questions about letter patterns, sounds, and word characteristics. Players can tap cards to flip them over, eliminating words that don't match the answers—just like the physical Guess Who game.

## Game Concept

### How It Works

1. **Setup**: An instructor creates a game configuration with a word bank (e.g., 24 sight words) and a set of suggested questions
2. **Game Start**: Two players join a game session. Each player sees the same grid of word cards. The game secretly assigns each player a target word from the bank
3. **Gameplay**: Players take turns asking yes/no questions about their opponent's word (e.g., "Does your word have the letter 'e' in it?")
4. **Card Flipping**: After hearing the answer, the asking player taps cards on their board to flip over words that are eliminated based on the response
5. **Guessing**: When a player thinks they know the opponent's word, they can make a guess
6. **Winning**: First player to correctly guess the opponent's word wins

### Example Questions

- "Does your word have the letter 'a' in it?"
- "Does your word start with a consonant?"
- "Does your word have more than 4 letters?"
- "Does your word rhyme with 'cat'?"
- "Does your word have a silent letter?"
- "Does your word have a double letter?"

### Game Rules & Behavior

#### Grid Setup
- **Both players see the same words in the same positions** on their game boards
- The instructor selects which words from the word bank (up to 100 words) will appear in each game
- Grid sizes: 12, 16, 20, or 24 cards depending on configuration

#### Card Flipping
- **Manual flipping only (MVP)**: Players tap/click cards to flip and eliminate words based on the answers they receive
- Auto-evaluation (highlighting cards that match/don't match a question) is a **future enhancement**

#### Turn Flow
1. Player A asks a yes/no question about Player B's secret word
2. Player B answers "yes" or "no"
3. Player A manually flips cards to eliminate words
4. Player A can optionally make a guess, or pass
5. Turn switches to Player B

#### Reconnection
- **Players can rejoin** a game in progress if they disconnect
- Game state is preserved and restored upon reconnection
- Players rejoin using the same game code and player name

#### Game Room Lifecycle
All game rooms expire after **20 minutes** in these scenarios:
- Room created but second player never joins
- Game completed (room persists briefly for rematch option)
- Both players disconnect

#### Configuration Visibility
- Game configurations are **public**: all instructors can view configurations created by other instructors
- Instructors **cannot edit** other instructors' configurations
- Instructors can **copy/duplicate** configurations to create their own versions

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | [Bun](https://bun.sh) |
| Language | JavaScript/TypeScript |
| Frontend Framework | React |
| Backend/API | Bun's built-in HTTP server |
| Real-time Communication | WebSockets (via Bun) |
| Database | SQLite (via Bun's native SQLite support) |
| Styling | Tailwind CSS |

## Art Style

**Theme**: Elementary School Bulletin Board / Crayon Box

The game feels like a classroom bulletin board come to life—everything looks hand-crafted with construction paper, crayons, scissors, and tape. The aesthetic evokes the warmth and creativity of an elementary school classroom.

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| **Construction Paper Red** | `#E63946` | Primary accent, important buttons |
| **Crayon Blue** | `#457B9D` | Secondary accent, links |
| **Sunshine Yellow** | `#FFD166` | Highlights, success states |
| **Grass Green** | `#2A9D8F` | Correct/positive feedback |
| **Grape Purple** | `#7B2CBF` | Player 2 accent |
| **Tangerine Orange** | `#F77F00` | Warnings, turn indicators |
| **Kraft Paper Brown** | `#C9B99A` | Card backgrounds, neutral elements |
| **Cork Board Tan** | `#D4A574` | Main background texture |
| **Lined Paper White** | `#FFFEF9` | Text areas, input fields |
| **Pencil Gray** | `#5C5C5C` | Text, borders |
| **Chalkboard Green** | `#2E5339` | Optional header/footer areas |

### Visual Elements

| Element | School Supply Inspiration |
|---------|---------------------------|
| **Word Cards** | Construction paper rectangles with slightly uneven "scissor-cut" edges |
| **Card Backs** | Kraft paper with crayon scribble pattern |
| **Buttons** | Rounded rectangles that look like erasers or sticky notes |
| **Borders** | Dashed lines like scissors cutting guides, or wavy crayon strokes |
| **Backgrounds** | Cork bulletin board texture with subtle push-pin holes |
| **Dividers** | Strips of washi tape or masking tape |
| **Icons** | Hand-drawn style (wobbly lines, imperfect shapes) |
| **Decorations** | Gold star stickers, smiley faces, "Good Job!" stamps |
| **Flipped Cards** | Look "pinned" to the board with a colored push-pin |

### Typography

| Use | Font Suggestion | Style |
|-----|-----------------|-------|
| **Sight Words** | **Andika** or **Lexend** | Clear, dyslexia-friendly, easy for early readers |
| **Headings** | **Patrick Hand** or **Caveat** | Looks like neat teacher handwriting |
| **UI Labels** | **Nunito** or **Quicksand** | Rounded, friendly, readable |
| **Fun Accents** | **Gaegu** or **Just Another Hand** | Crayon/marker feel for decorative text |

### Textures & Effects

- **Paper grain overlay** on cards and backgrounds
- **Subtle drop shadows** that look like paper is slightly lifted
- **Crayon stroke borders** (slightly transparent, uneven edges)
- **Tape pieces** in corners holding elements "in place"
- **Pencil smudge** subtle texture on interactive elements
- **Sticker shine** effect on achievement badges

### Card States

| State | Visual Treatment |
|-------|------------------|
| **Active (face-up)** | Bright construction paper, word clearly visible, slight "popped up" shadow |
| **Flipped (eliminated)** | Faded/grayed, rotated slightly, looks "pushed down" into the board |
| **Hover** | Gentle wobble, paper lifting effect |
| **Selected** | Gold star sticker appears in corner |
| **Opponent's secret word** | Special "mystery" treatment with a question mark stamp |

### Animations

| Action | Animation Style |
|--------|-----------------|
| **Card flip** | Paper folding effect, like turning a page |
| **Correct guess** | Confetti of gold stars and smiley stickers |
| **Wrong guess** | Gentle "eraser shake" wobble |
| **Turn change** | Washi tape "slides" to indicate active player |
| **Win celebration** | "A+" stamp animation, stickers flying |

### Sound Design (Future Enhancement)

| Action | Sound |
|--------|-------|
| Card flip | Paper rustling |
| Button click | Stapler "chunk" |
| Correct answer | Triangle ding (classroom instrument) |
| Win | Children cheering / bell ringing |

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Game Board │  │  Question   │  │  Instructor Dashboard   │  │
│  │   (Cards)   │  │    Panel    │  │   (Config Editor)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket / HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Server (Bun)                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Game      │  │   Config    │  │   Session Manager       │  │
│  │   Engine    │  │   Manager   │  │   (WebSocket rooms)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Storage Layer  │                          │
│                    │    (SQLite)     │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
word-guess-who/
├── src/
│   ├── server/
│   │   ├── index.ts              # Server entry point
│   │   ├── game-engine.ts        # Core game logic
│   │   ├── session-manager.ts    # WebSocket room management
│   │   ├── config-manager.ts     # Load/save game configs
│   │   ├── db.ts                 # SQLite database connection & queries
│   │   └── routes/
│   │       ├── api.ts            # REST API endpoints
│   │       └── websocket.ts      # WebSocket handlers
│   ├── client/
│   │   ├── index.html            # Main HTML entry
│   │   ├── App.tsx               # React root component
│   │   ├── main.tsx              # React entry point
│   │   ├── index.css             # Tailwind CSS entry
│   │   ├── components/
│   │   │   ├── GameBoard.tsx     # Card grid rendering & interactions
│   │   │   ├── Card.tsx          # Individual word card component
│   │   │   ├── QuestionPanel.tsx # Question asking/answering UI
│   │   │   ├── Lobby.tsx         # Game lobby & room joining
│   │   │   └── GameOver.tsx      # Win/lose screen
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Landing page
│   │   │   ├── Game.tsx          # Main game page
│   │   │   └── Instructor.tsx    # Instructor dashboard
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts   # WebSocket connection hook
│   │   │   └── useGameState.ts   # Game state management hook
│   │   └── lib/
│   │       └── websocket.ts      # WebSocket client utilities
│   └── shared/
│       ├── types.ts              # Shared TypeScript types
│       └── validation.ts         # Config validation
├── configs/                      # Saved game configurations
│   └── default.json              # Default word bank
├── data/                         # Runtime data
│   └── word-guess-who.db         # SQLite database
├── public/                       # Static assets
│   ├── images/
│   └── sounds/
├── tests/
├── package.json
├── bunfig.toml
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Game Configuration Schema

Game configurations are stored as JSON files and define the word bank and suggested questions for a game.

### Schema Definition

```typescript
// src/shared/types.ts

interface GameConfig {
  /** Unique identifier for this configuration */
  id: string;

  /** Human-readable name for this config (e.g., "Kindergarten Sight Words") */
  name: string;

  /** Description of this word set */
  description?: string;

  /** Who created this configuration */
  author?: string;

  /** When this config was created */
  createdAt: string; // ISO 8601 date

  /** When this config was last modified */
  updatedAt: string; // ISO 8601 date

  /** The word bank for this game */
  wordBank: WordEntry[];

  /** Suggested questions for players */
  suggestedQuestions: Question[];

  /** Game settings */
  settings: GameSettings;
}

interface WordEntry {
  /** The sight word */
  word: string;

  /** Optional metadata for filtering/categorization */
  metadata?: {
    /** Grade level (e.g., "K", "1", "2") */
    gradeLevel?: string;

    /** Difficulty (1-5) */
    difficulty?: number;

    /** Word category (e.g., "dolch", "fry", "custom") */
    category?: string;

    /** Phonetic features for question assistance */
    features?: {
      syllables: number;
      hasDoubleLetters: boolean;
      hasSilentLetters: boolean;
      startsWithVowel: boolean;
      endsWithVowel: boolean;
      rhymeFamily?: string;
    };
  };
}

interface Question {
  /** The question text */
  text: string;

  /** Category for organizing questions in UI */
  category: 'letters' | 'sounds' | 'length' | 'patterns' | 'custom';

  /**
   * Optional: function name to auto-evaluate this question
   * If not provided, players answer manually
   */
  autoEvaluator?: string;

  /** Parameters for auto-evaluator */
  evaluatorParams?: Record<string, unknown>;
}

interface GameSettings {
  /** Number of cards to show (subset of word bank) */
  gridSize: 12 | 16 | 20 | 24;

  /** Allow custom questions or only suggested ones */
  allowCustomQuestions: boolean;

  /** Time limit per turn in seconds (0 = no limit) */
  turnTimeLimit: number;

  /** Show phonetic hints on cards */
  showPhoneticHints: boolean;

  /** Enable sound effects */
  enableSounds: boolean;
}
```

### Example Configuration File

```json
{
  "id": "kindergarten-dolch-v1",
  "name": "Kindergarten Dolch Sight Words",
  "description": "Common sight words for kindergarten students from the Dolch word list",
  "author": "Ms. Johnson",
  "createdAt": "2025-01-27T10:00:00Z",
  "updatedAt": "2025-01-27T10:00:00Z",
  "wordBank": [
    {
      "word": "the",
      "metadata": {
        "gradeLevel": "K",
        "difficulty": 1,
        "category": "dolch",
        "features": {
          "syllables": 1,
          "hasDoubleLetters": false,
          "hasSilentLetters": true,
          "startsWithVowel": false,
          "endsWithVowel": true,
          "rhymeFamily": "-e"
        }
      }
    },
    {
      "word": "and",
      "metadata": {
        "gradeLevel": "K",
        "difficulty": 1,
        "category": "dolch",
        "features": {
          "syllables": 1,
          "hasDoubleLetters": false,
          "hasSilentLetters": false,
          "startsWithVowel": true,
          "endsWithVowel": false,
          "rhymeFamily": "-and"
        }
      }
    },
    {
      "word": "look",
      "metadata": {
        "gradeLevel": "K",
        "difficulty": 2,
        "category": "dolch",
        "features": {
          "syllables": 1,
          "hasDoubleLetters": true,
          "hasSilentLetters": false,
          "startsWithVowel": false,
          "endsWithVowel": false,
          "rhymeFamily": "-ook"
        }
      }
    }
  ],
  "suggestedQuestions": [
    {
      "text": "Does your word have the letter 'e' in it?",
      "category": "letters",
      "autoEvaluator": "containsLetter",
      "evaluatorParams": { "letter": "e" }
    },
    {
      "text": "Does your word have more than 3 letters?",
      "category": "length",
      "autoEvaluator": "lengthGreaterThan",
      "evaluatorParams": { "length": 3 }
    },
    {
      "text": "Does your word start with a vowel?",
      "category": "sounds",
      "autoEvaluator": "startsWithVowel"
    },
    {
      "text": "Does your word have a double letter?",
      "category": "patterns",
      "autoEvaluator": "hasDoubleLetters"
    },
    {
      "text": "Does your word rhyme with 'cat'?",
      "category": "sounds"
    }
  ],
  "settings": {
    "gridSize": 24,
    "allowCustomQuestions": true,
    "turnTimeLimit": 0,
    "showPhoneticHints": false,
    "enableSounds": true
  }
}
```

### JSON Schema (for validation)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://word-guess-who.example.com/config.schema.json",
  "title": "Game Configuration",
  "type": "object",
  "required": ["id", "name", "wordBank", "suggestedQuestions", "settings"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "description": "Unique identifier (lowercase alphanumeric with hyphens)"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "description": {
      "type": "string",
      "maxLength": 500
    },
    "author": {
      "type": "string",
      "maxLength": 100
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "wordBank": {
      "type": "array",
      "minItems": 12,
      "maxItems": 100,
      "items": {
        "type": "object",
        "required": ["word"],
        "properties": {
          "word": {
            "type": "string",
            "minLength": 1,
            "maxLength": 20
          },
          "metadata": {
            "type": "object",
            "properties": {
              "gradeLevel": { "type": "string" },
              "difficulty": { "type": "integer", "minimum": 1, "maximum": 5 },
              "category": { "type": "string" },
              "features": {
                "type": "object",
                "properties": {
                  "syllables": { "type": "integer", "minimum": 1 },
                  "hasDoubleLetters": { "type": "boolean" },
                  "hasSilentLetters": { "type": "boolean" },
                  "startsWithVowel": { "type": "boolean" },
                  "endsWithVowel": { "type": "boolean" },
                  "rhymeFamily": { "type": "string" }
                }
              }
            }
          }
        }
      }
    },
    "suggestedQuestions": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["text", "category"],
        "properties": {
          "text": { "type": "string", "minLength": 1 },
          "category": {
            "type": "string",
            "enum": ["letters", "sounds", "length", "patterns", "custom"]
          },
          "autoEvaluator": { "type": "string" },
          "evaluatorParams": { "type": "object" }
        }
      }
    },
    "settings": {
      "type": "object",
      "required": ["gridSize", "allowCustomQuestions", "turnTimeLimit", "showPhoneticHints", "enableSounds"],
      "properties": {
        "gridSize": { "type": "integer", "enum": [12, 16, 20, 24] },
        "allowCustomQuestions": { "type": "boolean" },
        "turnTimeLimit": { "type": "integer", "minimum": 0 },
        "showPhoneticHints": { "type": "boolean" },
        "enableSounds": { "type": "boolean" }
      }
    }
  }
}
```

## Features

### Core Features (MVP)

- [ ] **Game Board**: Grid of word cards that can be tapped to flip/eliminate
- [ ] **Two-Player Online**: Real-time multiplayer via WebSockets
- [ ] **Turn System**: Alternating turns with question/answer flow
- [ ] **Win Detection**: Automatic win when correct word is guessed
- [ ] **Instructor Dashboard**: Create and manage game configurations
- [ ] **Config Persistence**: Save/load game configs as JSON files
- [ ] **Game Lobby**: Create/join game rooms with shareable codes

### Enhanced Features (Post-MVP)

- [ ] **Team Mode**: Support more than 2 players in team-based gameplay
- [ ] **Solo Practice Mode**: Practice against AI opponent
- [ ] **Game Statistics & History**: Track player performance, game outcomes, and word analytics
- [ ] **Mobile/Tablet Support**: Responsive design for touch devices
- [ ] **Auto-Evaluation**: Automatically highlight/flip cards based on question answers
- [ ] **Question Suggestions**: Show relevant questions based on remaining words
- [ ] **Progress Tracking**: Track student performance over time
- [ ] **Multiple Word Banks**: Switch between different grade levels/themes
- [ ] **Spectator Mode**: Allow instructors to watch games
- [ ] **Replay System**: Review past games
- [ ] **Sound Effects**: Audio feedback for card flips, wins, etc.
- [ ] **Accessibility**: Screen reader support, keyboard navigation

## API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/configs` | List all game configurations |
| GET | `/api/configs/:id` | Get a specific configuration |
| POST | `/api/configs` | Create a new configuration |
| PUT | `/api/configs/:id` | Update a configuration |
| DELETE | `/api/configs/:id` | Delete a configuration |
| POST | `/api/games` | Create a new game session |
| GET | `/api/games/:code` | Get game session info |

### WebSocket Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_game` | `{ gameCode, playerName }` | Join a game room |
| `flip_card` | `{ wordIndex }` | Flip a card on player's board |
| `ask_question` | `{ question }` | Ask a question |
| `answer_question` | `{ answer: boolean }` | Answer yes/no |
| `make_guess` | `{ word }` | Guess opponent's word |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `game_state` | `{ ...fullState }` | Full game state sync |
| `player_joined` | `{ playerName }` | Another player joined |
| `card_flipped` | `{ playerIndex, wordIndex }` | Card was flipped |
| `question_asked` | `{ question }` | Question was asked |
| `question_answered` | `{ answer }` | Question was answered |
| `guess_made` | `{ word, correct }` | Guess result |
| `game_over` | `{ winner }` | Game ended |

## Development Phases

### Phase 1: Foundation
- Set up Bun project with TypeScript
- Create basic server with HTTP endpoints
- Implement config file loading/saving
- Build config validation

### Phase 2: Game Logic
- Implement core game engine
- Create WebSocket session management
- Build turn system and win detection
- Develop question evaluation system

### Phase 3: Client UI
- Create game board with card grid
- Implement card flip animations
- Build question/answer interface
- Create game lobby and room joining

### Phase 4: Instructor Tools
- Build configuration editor UI
- Add word bank management
- Create question builder
- Implement config preview/testing

### Phase 5: Polish & Deploy
- Add responsive design
- Implement art style and theming
- Add sound effects (optional)
- Set up deployment pipeline
- Performance optimization

## Deployment

### Platform: Fly.io

**Why Fly.io:**
- Native WebSocket support (required for real-time gameplay)
- Simple container deployments with `flyctl`
- Persistent volumes for SQLite database
- Auto-stop machines when idle (cost savings)
- Free tier available for low-traffic apps

### Database Persistence: Fly.io Volumes

SQLite database is persisted using Fly.io Volumes:
- Volume mounted at `/app/data`
- Database file: `/app/data/game.db`
- Survives deployments and machine restarts
- No code changes required from development setup

### CI/CD Pipeline

We'll use **GitHub Actions** for continuous integration and deployment.

#### Pipeline Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Push/PR   │────▶│    CI       │────▶│   Deploy    │
│   to main   │     │  (lint,     │     │  (Fly.io)   │
│             │     │   typecheck,│     │  on main    │
│             │     │   tests)    │     │  only       │
└─────────────┘     └─────────────┘     └─────────────┘
```

#### CI Behavior

| Check | Blocking? | Notes |
|-------|-----------|-------|
| Lint | No | Runs but doesn't fail the workflow |
| Typecheck | No | Runs but doesn't fail the workflow |
| Tests | **Yes** | Must pass to merge/deploy |

#### Workflow Files

##### `.github/workflows/ci.yml` - Runs on all PRs and pushes to main

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint:
    name: Lint (non-blocking)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

  typecheck:
    name: Type Check (non-blocking)
    runs-on: ubuntu-latest
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Type check
        run: bun run typecheck

  test:
    name: Tests (blocking)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun test
```

##### `.github/workflows/deploy.yml` - Auto-deploys on merge to main

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Fly.io
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun test

      - name: Build client
        run: bun run build:client

      - name: Setup Fly.io CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Docker Configuration

##### `Dockerfile`

```dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Build the application
FROM base AS builder
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:client

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (server runs from source with Bun)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Copy built client assets
COPY --from=builder /app/dist/client ./dist/client

# Copy config files
COPY --from=builder /app/configs ./configs

# Create data directory for SQLite (will be mounted as volume)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["bun", "run", "src/server/index.ts"]
```

##### `.dockerignore`

```
node_modules
dist
data
.git
.gitignore
*.md
.env*
.DS_Store
```

##### `fly.toml` (Fly.io configuration)

```toml
app = "word-guess-who"
primary_region = "iad"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[env]
  NODE_ENV = "production"
  DATA_PATH = "/app/data"

[mounts]
  source = "data"
  destination = "/app/data"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `DATA_PATH` | Path to SQLite data directory | `data` | No |

### GitHub Secrets Required

| Secret | Description | How to Get |
|--------|-------------|------------|
| `FLY_API_TOKEN` | Fly.io API token for deployments | Run `fly tokens create deploy` |

### Manual Setup Steps

Before the CI/CD pipeline will work, complete these one-time setup steps:

#### 1. Install Fly.io CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

#### 2. Authenticate and Create App

```bash
# Login to Fly.io
fly auth login

# Initialize the app (run from project root)
fly launch --name word-guess-who --region iad --no-deploy
```

#### 3. Create Persistent Volume for SQLite

```bash
# Create a 1GB volume for database storage
fly volumes create data --region iad --size 1
```

#### 4. Add GitHub Secret

1. Generate a deploy token: `fly tokens create deploy`
2. Go to GitHub repo → Settings → Secrets and variables → Actions
3. Add new secret: `FLY_API_TOKEN` with the token value

#### 5. First Deploy

```bash
# Deploy manually the first time to verify everything works
fly deploy
```

### Files to Create

| File | Description |
|------|-------------|
| `Dockerfile` | Multi-stage build for Bun application |
| `.dockerignore` | Excludes unnecessary files from Docker build |
| `fly.toml` | Fly.io deployment configuration |
| `.github/workflows/ci.yml` | CI workflow (lint, typecheck, tests) |
| `.github/workflows/deploy.yml` | Auto-deploy on merge to main |

## Resolved Decisions

| Decision | Resolution |
|----------|------------|
| Frontend Framework | React |
| Styling | Tailwind CSS |
| Database | SQLite |
| Card Flipping | Manual (MVP), Auto-evaluation (future) |
| Word Selection | Instructor chooses from word bank |
| Grid Arrangement | Same words, same positions for both players |
| Mobile Support | Future enhancement (not MVP) |
| Reconnection | Players can rejoin with same game code |
| Room Expiration | 20 minutes max in all scenarios |
| Config Visibility | Public (view-only, no cross-editing) |
| Art Style | Playful, kid-friendly with bright colors |
| Player Count | 2 players (MVP), Team mode (future) |
| Solo Practice | Future enhancement (AI opponent) |
| Game Statistics | Future enhancement (post-MVP) |

---

*Last updated: 2026-02-01*
