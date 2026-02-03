/**
 * Core type definitions for Word Guess Who
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

/** Grid size: number of cards on the game board (4-100) */
export type GridSize = number;

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
  author?: string;
  wordBank: WordEntry[];
  suggestedQuestions: Question[];
  settings: GameSettings;
  ownerId: string | null;
  isSystemTemplate: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new game config (without auto-generated fields) */
export interface GameConfigInput {
  id?: string;
  name: string;
  description?: string;
  author?: string;
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
  owner_id: string | null;
  is_system_template: number;
  is_public: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Instructor & Auth Types
// ============================================

/** Instructor account */
export interface Instructor {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Database row representation of an instructor */
export interface InstructorRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/** Auth response with instructor and token */
export interface AuthResponse {
  instructor: Instructor;
  token: string;
}

/** Input for instructor registration */
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

/** Input for instructor login */
export interface LoginInput {
  email: string;
  password: string;
}

// ============================================
// Game Session Types (Phase 2)
// ============================================

/** Game session phases */
export type GamePhase = "waiting" | "selecting" | "playing" | "finished";

/** Player in a game session */
export interface Player {
  id: string;
  name: string;
  /** Index of the player's secret word in the word grid (null until selected) */
  secretWordIndex: number | null;
  /** Whether this player has selected their secret word */
  hasSelectedWord: boolean;
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
  /** Whether secret words are randomly assigned (true) or player-selected (false) */
  randomSecretWords: boolean;
  /** Whether both players share one computer and must pass it between turns */
  sharedComputerMode: boolean;
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
  /** Whether secret words are randomly assigned (true) or player-selected (false) */
  randomSecretWords: boolean;
  /** Whether both players share one computer and must pass it between turns */
  sharedComputerMode: boolean;
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
  | "leave_game"
  | "select_secret_word"
  | "end_turn";

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
  | "game_expired"
  | "word_selected"
  | "turn_ended";

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

/** Select a secret word during selecting phase */
export interface SelectSecretWordMessage extends ClientMessageBase {
  type: "select_secret_word";
  cardIndex: number;
  /** In shared computer mode, allows selecting on behalf of another player */
  forPlayerIndex?: number;
}

/** End turn without guessing (used in shared computer mode to pass the device) */
export interface EndTurnMessage extends ClientMessageBase {
  type: "end_turn";
}

/** Union of all client messages */
export type ClientMessage =
  | JoinGameMessage
  | FlipCardMessage
  | AskQuestionMessage
  | AnswerQuestionMessage
  | MakeGuessMessage
  | LeaveGameMessage
  | SelectSecretWordMessage
  | EndTurnMessage;

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
  /** Player's own secret word (for display, null during selection) */
  mySecretWord: string | null;
  /** Whether the player has selected their secret word (during selecting phase) */
  hasSelectedWord?: boolean;
  /** Whether the opponent has selected their secret word (during selecting phase) */
  opponentHasSelected?: boolean;
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

/** A player selected their secret word (sent to opponent without revealing which word) */
export interface WordSelectedMessage extends ServerMessageBase {
  type: "word_selected";
  playerIndex: number;
}

/** Turn ended (used in shared computer mode to signal view switch) */
export interface TurnEndedMessage extends ServerMessageBase {
  type: "turn_ended";
  /** The player whose turn it now is */
  nextPlayerIndex: number;
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
  | GameExpiredMessage
  | WordSelectedMessage
  | TurnEndedMessage;

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
  /** Automatically assign random secret words (otherwise players choose) */
  randomSecretWords?: boolean;
  /** Both players share one computer and must pass it between turns */
  sharedComputerMode?: boolean;
}

/** Response when creating a game */
export interface CreateGameResponse {
  code: string;
  expiresAt: string;
}
