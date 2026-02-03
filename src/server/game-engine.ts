/**
 * Core game engine for Word Guess Who
 * Manages game state, turns, and win detection
 */

import type {
  GameSession,
  GameState,
  Player,
  CardState,
  GamePhase,
  GridSize,
  WordEntry,
} from "@shared/types";
import { nanoid } from "nanoid";

export const SESSION_TIMEOUT_MINUTES = 20;
export const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

/** Generate a short, readable game code */
export function generateGameCode(): string {
  // Use uppercase letters and numbers, avoiding confusing characters (0, O, I, 1, L)
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Generate a unique player ID */
export function generatePlayerId(): string {
  return nanoid(12);
}

/** Shuffle an array in place using Fisher-Yates algorithm */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Select random words for the game board */
export function selectWordsForGame(
  wordBank: WordEntry[],
  gridSize: GridSize
): CardState[] {
  if (wordBank.length < gridSize) {
    throw new Error(
      `Word bank has ${wordBank.length} words but needs ${gridSize}`
    );
  }

  // Shuffle and take the first gridSize words
  const shuffled = shuffleArray(wordBank);
  const selected = shuffled.slice(0, gridSize);

  return selected.map((entry, index) => ({
    word: entry.word,
    index,
  }));
}

/** Create a new game session */
export function createGameSession(
  configId: string,
  gridSize: GridSize,
  wordBank: WordEntry[],
  isLocalMode: boolean = false,
  showOnlyLastQuestion: boolean = false,
  randomSecretWords: boolean = false,
  sharedComputerMode: boolean = false
): GameSession {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

  const cards = selectWordsForGame(wordBank, gridSize);

  return {
    code: generateGameCode(),
    configId,
    isLocalMode,
    showOnlyLastQuestion,
    randomSecretWords,
    sharedComputerMode,
    phase: "waiting",
    players: [],
    gameState: {
      cards,
      currentTurn: 0,
      pendingQuestion: null,
      awaitingAnswer: false,
      winner: null,
    },
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/** Add a player to a game session */
export function addPlayer(
  session: GameSession,
  playerName: string,
  existingPlayerId?: string
): { player: Player; playerIndex: number } | { error: string } {
  // Check if game is full
  if (session.players.length >= 2) {
    // Check for reconnection
    if (existingPlayerId) {
      const existingIndex = session.players.findIndex(
        (p) => p.id === existingPlayerId
      );
      if (existingIndex !== -1) {
        session.players[existingIndex].connected = true;
        return {
          player: session.players[existingIndex],
          playerIndex: existingIndex,
        };
      }
    }
    return { error: "Game is full" };
  }

  // Check for duplicate name
  if (
    session.players.some(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    )
  ) {
    return { error: "Player name already taken" };
  }

  if (!session.gameState) {
    return { error: "Game not initialized" };
  }

  let secretWordIndex: number | null = null;
  let hasSelectedWord = false;

  if (session.randomSecretWords) {
    // Assign secret word randomly (random card that isn't already assigned)
    const assignedIndices = new Set(
      session.players.map((p) => p.secretWordIndex).filter((i) => i !== null)
    );
    const availableIndices = session.gameState.cards
      .map((_, i) => i)
      .filter((i) => !assignedIndices.has(i));

    if (availableIndices.length === 0) {
      return { error: "No available secret words" };
    }

    secretWordIndex =
      availableIndices[Math.floor(Math.random() * availableIndices.length)];
    hasSelectedWord = true;
  }

  const player: Player = {
    id: existingPlayerId || generatePlayerId(),
    name: playerName,
    secretWordIndex,
    hasSelectedWord,
    flippedCards: [],
    connected: true,
  };

  session.players.push(player);
  const playerIndex = session.players.length - 1;

  // When both players have joined
  if (session.players.length === 2) {
    if (session.randomSecretWords) {
      // Start playing immediately with random words
      session.phase = "playing";
    } else {
      // Go to selecting phase for players to choose their words
      session.phase = "selecting";
    }
  }

  return { player, playerIndex };
}

/** Mark a player as disconnected */
export function disconnectPlayer(
  session: GameSession,
  playerId: string
): boolean {
  const player = session.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;
    return true;
  }
  return false;
}

/** Check if both players are disconnected */
export function allPlayersDisconnected(session: GameSession): boolean {
  return (
    session.players.length > 0 && session.players.every((p) => !p.connected)
  );
}

/** Flip a card for a player */
export function flipCard(
  session: GameSession,
  playerId: string,
  cardIndex: number
): { success: true; playerIndex: number } | { success: false; error: string } {
  const playerIndex = session.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, error: "Player not found" };
  }

  if (session.phase !== "playing") {
    return { success: false, error: "Game is not in progress" };
  }

  const player = session.players[playerIndex];
  if (!session.gameState) {
    return { success: false, error: "Game state not initialized" };
  }

  // Validate card index
  if (cardIndex < 0 || cardIndex >= session.gameState.cards.length) {
    return { success: false, error: "Invalid card index" };
  }

  // Players CAN flip their own secret word - if a question eliminates it,
  // they should be able to flip it to track the game state properly

  // Toggle flip state
  const flippedIndex = player.flippedCards.indexOf(cardIndex);
  if (flippedIndex === -1) {
    player.flippedCards.push(cardIndex);
  } else {
    player.flippedCards.splice(flippedIndex, 1);
  }

  return { success: true, playerIndex };
}

/** Ask a question */
export function askQuestion(
  session: GameSession,
  playerId: string,
  question: string
): { success: true; playerIndex: number } | { success: false; error: string } {
  const playerIndex = session.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, error: "Player not found" };
  }

  if (session.phase !== "playing" || !session.gameState) {
    return { success: false, error: "Game is not in progress" };
  }

  // Check if it's this player's turn (local mode allows guessing any time)
  if (!session.isLocalMode && session.gameState.currentTurn !== playerIndex) {
    return { success: false, error: "Not your turn" };
  }

  // Check if already waiting for an answer
  if (session.gameState.awaitingAnswer) {
    return { success: false, error: "Already waiting for an answer" };
  }

  session.gameState.pendingQuestion = question;
  session.gameState.awaitingAnswer = true;

  return { success: true, playerIndex };
}

/** Answer a question */
export function answerQuestion(
  session: GameSession,
  playerId: string,
  answer: boolean
):
  | { success: true; playerIndex: number; answer: boolean }
  | { success: false; error: string } {
  const playerIndex = session.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, error: "Player not found" };
  }

  if (session.phase !== "playing" || !session.gameState) {
    return { success: false, error: "Game is not in progress" };
  }

  // The answerer is the one who is NOT the current turn
  if (session.gameState.currentTurn === playerIndex) {
    return { success: false, error: "Cannot answer your own question" };
  }

  if (!session.gameState.awaitingAnswer) {
    return { success: false, error: "No question pending" };
  }

  session.gameState.pendingQuestion = null;
  session.gameState.awaitingAnswer = false;
  // After the answer, it becomes the answerer's turn to ask or guess
  session.gameState.currentTurn = playerIndex;

  return { success: true, playerIndex, answer };
}

/** Make a guess at the opponent's word */
export function makeGuess(
  session: GameSession,
  playerId: string,
  guessedWord: string
):
  | {
      success: true;
      playerIndex: number;
      correct: boolean;
      opponentWord: string;
      gameOver: boolean;
    }
  | { success: false; error: string } {
  const playerIndex = session.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, error: "Player not found" };
  }

  if (session.phase !== "playing" || !session.gameState) {
    return { success: false, error: "Game is not in progress" };
  }

  // Check if it's this player's turn (local mode allows guessing any time)
  if (!session.isLocalMode && session.gameState.currentTurn !== playerIndex) {
    return { success: false, error: "Not your turn" };
  }

  // Can't guess while a question is pending
  if (session.gameState.awaitingAnswer) {
    return { success: false, error: "Must wait for question to be answered" };
  }

  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponent = session.players[opponentIndex];
  if (opponent.secretWordIndex === null) {
    return { success: false, error: "Opponent has not selected a word" };
  }
  const opponentWord = session.gameState.cards[opponent.secretWordIndex].word;

  const correct = guessedWord.toLowerCase() === opponentWord.toLowerCase();

  if (correct) {
    session.gameState.winner = playerIndex;
    session.phase = "finished";
  } else {
    // Wrong guess ends the turn
    session.gameState.currentTurn = opponentIndex;
  }

  return {
    success: true,
    playerIndex,
    correct,
    opponentWord,
    gameOver: correct,
  };
}

/** End turn without guessing (pass) */
export function endTurn(
  session: GameSession,
  playerId: string
): { success: true; nextTurn: number } | { success: false; error: string } {
  const playerIndex = session.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, error: "Player not found" };
  }

  if (session.phase !== "playing" || !session.gameState) {
    return { success: false, error: "Game is not in progress" };
  }

  if (session.gameState.currentTurn !== playerIndex) {
    return { success: false, error: "Not your turn" };
  }

  if (session.gameState.awaitingAnswer) {
    return { success: false, error: "Must wait for question to be answered" };
  }

  const nextTurn = playerIndex === 0 ? 1 : 0;
  session.gameState.currentTurn = nextTurn;

  return { success: true, nextTurn };
}

/** Check if a session has expired */
export function isSessionExpired(session: GameSession): boolean {
  return new Date() > new Date(session.expiresAt);
}

/** Extend session expiration (e.g., when game starts or player reconnects) */
export function extendSession(
  session: GameSession,
  minutes: number = SESSION_TIMEOUT_MINUTES
): void {
  const newExpiry = new Date(Date.now() + minutes * 60 * 1000);
  session.expiresAt = newExpiry.toISOString();
}

/** Select a secret word for a player during the selecting phase */
export function selectSecretWord(
  session: GameSession,
  playerId: string,
  cardIndex: number,
  forPlayerIndex?: number
):
  | { success: true; playerIndex: number; bothSelected: boolean }
  | { success: false; error: string } {
  // In shared computer mode, forPlayerIndex can be used to select on behalf of another player
  let targetPlayerIndex: number;

  if (forPlayerIndex !== undefined && session.sharedComputerMode) {
    // Validate the forPlayerIndex
    if (forPlayerIndex < 0 || forPlayerIndex >= session.players.length) {
      return { success: false, error: "Invalid player index" };
    }
    targetPlayerIndex = forPlayerIndex;
  } else {
    // Normal mode: find player by their ID
    targetPlayerIndex = session.players.findIndex((p) => p.id === playerId);
    if (targetPlayerIndex === -1) {
      return { success: false, error: "Player not found" };
    }
  }

  if (session.phase !== "selecting") {
    return { success: false, error: "Game is not in selecting phase" };
  }

  const player = session.players[targetPlayerIndex];
  if (player.hasSelectedWord) {
    return { success: false, error: "This player has already selected a word" };
  }

  if (!session.gameState) {
    return { success: false, error: "Game state not initialized" };
  }

  // Validate card index
  if (cardIndex < 0 || cardIndex >= session.gameState.cards.length) {
    return { success: false, error: "Invalid card index" };
  }

  // Check if the other player already selected this word
  const otherPlayerIndex = targetPlayerIndex === 0 ? 1 : 0;
  const otherPlayer = session.players[otherPlayerIndex];
  if (otherPlayer && otherPlayer.secretWordIndex === cardIndex) {
    return {
      success: false,
      error: "This word is already taken by the other player",
    };
  }

  // Assign the word
  player.secretWordIndex = cardIndex;
  player.hasSelectedWord = true;

  // Check if both players have selected
  const bothSelected = session.players.every((p) => p.hasSelectedWord);
  if (bothSelected) {
    session.phase = "playing";
  }

  return { success: true, playerIndex: targetPlayerIndex, bothSelected };
}

/** Get the secret word for a player */
export function getPlayerSecretWord(
  session: GameSession,
  playerIndex: number
): string | null {
  const player = session.players[playerIndex];
  if (!player || !session.gameState || player.secretWordIndex === null) {
    return null;
  }
  return session.gameState.cards[player.secretWordIndex].word;
}
