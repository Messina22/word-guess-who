/**
 * Core type definitions for Sight Word Guess Who
 */

/** A single word entry in a word bank */
export interface WordEntry {
  word: string;
  phonetic?: string;
  category?: string;
}

/** Categories for suggested questions */
export type QuestionCategory =
  | "letters"
  | "sounds"
  | "length"
  | "patterns"
  | "meaning";

/** A suggested question for the game */
export interface Question {
  text: string;
  category: QuestionCategory;
}

/** Valid grid sizes for the game board */
export type GridSize = 12 | 16 | 20 | 24;

/** Game settings configuration */
export interface GameSettings {
  gridSize: GridSize;
  allowCustomQuestions: boolean;
  turnTimeLimit: number; // 0 = no limit, otherwise seconds
  showPhoneticHints: boolean;
  enableSounds: boolean;
}

/** Complete game configuration */
export interface GameConfig {
  id: string;
  name: string;
  description?: string;
  wordBank: WordEntry[];
  suggestedQuestions: Question[];
  settings: GameSettings;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new game config (without auto-generated fields) */
export interface GameConfigInput {
  id?: string;
  name: string;
  description?: string;
  wordBank: WordEntry[];
  suggestedQuestions: Question[];
  settings: GameSettings;
}

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

/** Database row representation of a game config */
export interface GameConfigRow {
  id: string;
  name: string;
  config_json: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Game Session Types (Phase 2)
// ============================================

/** Game session phases */
export type GamePhase = "waiting" | "playing" | "finished";

/** Player in a game session */
export interface Player {
  id: string;
  name: string;
  /** Index of the player's secret word in the word grid */
  secretWordIndex: number;
  /** Indices of cards this player has flipped (eliminated) */
  flippedCards: number[];
  /** Whether this player is currently connected */
  connected: boolean;
}

/** A word card on the game board */
export interface CardState {
  word: string;
  index: number;
}

/** Current state of a game in progress */
export interface GameState {
  /** The words displayed on the board (same for both players) */
  cards: CardState[];
  /** Index of the player whose turn it is (0 or 1) */
  currentTurn: number;
  /** The current question being asked (if any) */
  pendingQuestion: string | null;
  /** Whether the game is waiting for an answer */
  awaitingAnswer: boolean;
  /** Index of the winning player (null if game not over) */
  winner: number | null;
}

/** A complete game session */
export interface GameSession {
  /** Unique game code for joining */
  code: string;
  /** ID of the game configuration being used */
  configId: string;
  /** Whether this is a local 2-player mode (questions asked in person) */
  isLocalMode: boolean;
  /** Whether to show only the most recent question in the log */
  showOnlyLastQuestion: boolean;
  /** Current phase of the game */
  phase: GamePhase;
  /** Players in the session (max 2) */
  players: Player[];
  /** Current game state (null until game starts) */
  gameState: GameState | null;
  /** When the session was created */
  createdAt: string;
  /** When the session expires */
  expiresAt: string;
}

/** Public game session info (excludes secret words) */
export interface PublicGameSession {
  code: string;
  configId: string;
  /** Whether this is a local 2-player mode (questions asked in person) */
  isLocalMode: boolean;
  /** Whether to show only the most recent question in the log */
  showOnlyLastQuestion: boolean;
  phase: GamePhase;
  players: Array<{ id: string; name: string; connected: boolean }>;
  createdAt: string;
}

// ============================================
// WebSocket Message Types
// ============================================

/** Client → Server message types */
export type ClientMessageType =
  | "join_game"
  | "flip_card"
  | "ask_question"
  | "answer_question"
  | "make_guess"
  | "leave_game";

/** Server → Client message types */
export type ServerMessageType =
  | "error"
  | "game_state"
  | "player_joined"
  | "player_left"
  | "player_reconnected"
  | "card_flipped"
  | "question_asked"
  | "question_answered"
  | "guess_made"
  | "game_over"
  | "game_expired";

/** Base client message */
interface ClientMessageBase {
  type: ClientMessageType;
}

/** Join a game room */
export interface JoinGameMessage extends ClientMessageBase {
  type: "join_game";
  gameCode: string;
  playerName: string;
  /** Optional: reconnect with existing player ID */
  playerId?: string;
}

/** Flip a card on the player's board */
export interface FlipCardMessage extends ClientMessageBase {
  type: "flip_card";
  cardIndex: number;
}

/** Ask a question about the opponent's word */
export interface AskQuestionMessage extends ClientMessageBase {
  type: "ask_question";
  question: string;
}

/** Answer a yes/no question */
export interface AnswerQuestionMessage extends ClientMessageBase {
  type: "answer_question";
  answer: boolean;
}

/** Make a guess at the opponent's word */
export interface MakeGuessMessage extends ClientMessageBase {
  type: "make_guess";
  word: string;
}

/** Leave the current game */
export interface LeaveGameMessage extends ClientMessageBase {
  type: "leave_game";
}

/** Union of all client messages */
export type ClientMessage =
  | JoinGameMessage
  | FlipCardMessage
  | AskQuestionMessage
  | AnswerQuestionMessage
  | MakeGuessMessage
  | LeaveGameMessage;

/** Base server message */
interface ServerMessageBase {
  type: ServerMessageType;
}

/** Error message */
export interface ErrorMessage extends ServerMessageBase {
  type: "error";
  message: string;
}

/** Full game state sync (sent on join and reconnect) */
export interface GameStateMessage extends ServerMessageBase {
  type: "game_state";
  session: PublicGameSession;
  /** Player's own index in the players array */
  playerIndex: number;
  /** The game board cards */
  cards: CardState[];
  /** Player's own flipped cards */
  myFlippedCards: number[];
  /** Opponent's flipped cards */
  opponentFlippedCards: number[];
  /** Current turn (0 or 1) */
  currentTurn: number;
  /** Pending question if any */
  pendingQuestion: string | null;
  /** Whether awaiting answer */
  awaitingAnswer: boolean;
  /** Winner index if game is over */
  winner: number | null;
  /** Player's own secret word (for display) */
  mySecretWord: string;
}

/** Another player joined */
export interface PlayerJoinedMessage extends ServerMessageBase {
  type: "player_joined";
  playerName: string;
  playerIndex: number;
}

/** A player left */
export interface PlayerLeftMessage extends ServerMessageBase {
  type: "player_left";
  playerIndex: number;
}

/** A player reconnected */
export interface PlayerReconnectedMessage extends ServerMessageBase {
  type: "player_reconnected";
  playerIndex: number;
}

/** A card was flipped */
export interface CardFlippedMessage extends ServerMessageBase {
  type: "card_flipped";
  playerIndex: number;
  cardIndex: number;
}

/** A question was asked */
export interface QuestionAskedMessage extends ServerMessageBase {
  type: "question_asked";
  playerIndex: number;
  question: string;
}

/** A question was answered */
export interface QuestionAnsweredMessage extends ServerMessageBase {
  type: "question_answered";
  playerIndex: number;
  answer: boolean;
}

/** A guess was made */
export interface GuessMadeMessage extends ServerMessageBase {
  type: "guess_made";
  playerIndex: number;
  word: string;
  correct: boolean;
}

/** Game is over */
export interface GameOverMessage extends ServerMessageBase {
  type: "game_over";
  winnerIndex: number;
  winnerName: string;
  /** The secret words revealed */
  secretWords: [string, string];
}

/** Game session expired */
export interface GameExpiredMessage extends ServerMessageBase {
  type: "game_expired";
}

/** Union of all server messages */
export type ServerMessage =
  | ErrorMessage
  | GameStateMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | PlayerReconnectedMessage
  | CardFlippedMessage
  | QuestionAskedMessage
  | QuestionAnsweredMessage
  | GuessMadeMessage
  | GameOverMessage
  | GameExpiredMessage;

// ============================================
// API Types for Game Sessions
// ============================================

/** Input for creating a new game session */
export interface CreateGameInput {
  configId: string;
  /** Enable local 2-player mode (questions asked in person) */
  isLocalMode?: boolean;
  /** Show only the most recent question in the log */
  showOnlyLastQuestion?: boolean;
}

/** Response when creating a game */
export interface CreateGameResponse {
  code: string;
  expiresAt: string;
}
