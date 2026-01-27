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

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | [Bun](https://bun.sh) |
| Language | JavaScript/TypeScript |
| Frontend Framework | TBD (React, Vue, or Vanilla JS) |
| Backend/API | Bun's built-in HTTP server |
| Real-time Communication | WebSockets (via Bun) |
| Database | SQLite (via Bun's native SQLite support) or JSON file storage |
| Styling | TBD |

## Art Style

<!-- TODO: Define art style once determined -->

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
│                    │  (SQLite/JSON)  │                          │
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
│   │   └── routes/
│   │       ├── api.ts            # REST API endpoints
│   │       └── websocket.ts      # WebSocket handlers
│   ├── client/
│   │   ├── index.html            # Main HTML entry
│   │   ├── styles/
│   │   │   └── main.css
│   │   ├── scripts/
│   │   │   ├── app.ts            # Client entry point
│   │   │   ├── game-board.ts     # Card grid rendering & interactions
│   │   │   ├── websocket.ts      # WebSocket client
│   │   │   └── ui/
│   │   │       ├── card.ts       # Individual card component
│   │   │       ├── question-panel.ts
│   │   │       └── lobby.ts      # Game lobby UI
│   │   └── instructor/
│   │       ├── index.html        # Instructor dashboard
│   │       └── config-editor.ts  # Config creation UI
│   └── shared/
│       ├── types.ts              # Shared TypeScript types
│       └── validation.ts         # Config validation
├── configs/                      # Saved game configurations
│   └── default.json              # Default word bank
├── data/                         # Runtime data (sessions, etc.)
├── public/                       # Static assets
│   ├── images/
│   └── sounds/
├── tests/
├── package.json
├── bunfig.toml
├── tsconfig.json
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

- [ ] **Question Suggestions**: Show relevant questions based on remaining words
- [ ] **Auto-Evaluation**: Automatically answer questions based on word metadata
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

### Hosting Options

1. **Bun on a VPS** (DigitalOcean, Linode, etc.)
   - Full control, cost-effective
   - Requires server management

2. **Container Deployment** (Fly.io, Railway)
   - Easy deployment from Dockerfile
   - Built-in scaling

3. **Serverless with Bun** (Limited support currently)
   - May need adapter for platforms like Vercel

### Environment Variables

```env
PORT=3000
NODE_ENV=production
CONFIG_PATH=./configs
DATA_PATH=./data
SESSION_SECRET=your-secret-key
```

## Open Questions

1. Should the game support more than 2 players (team mode)?
2. Should there be a solo practice mode against AI?
3. How should game history/statistics be stored?
4. Should configurations be shareable between instructors?
5. Is there a need for user accounts/authentication?

---

*Last updated: 2025-01-27*
