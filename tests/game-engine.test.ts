import { describe, expect, test, beforeEach } from "bun:test";
import {
  generateGameCode,
  generatePlayerId,
  selectWordsForGame,
  createGameSession,
  addPlayer,
  updatePlayerName,
  disconnectPlayer,
  allPlayersDisconnected,
  flipCard,
  askQuestion,
  answerQuestion,
  makeGuess,
  endTurn,
  isSessionExpired,
  extendSession,
  selectSecretWord,
  getPlayerSecretWord,
  SESSION_TIMEOUT_MS,
} from "@server/game-engine";
import type { GameSession, WordEntry, GridSize } from "@shared/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal word bank for tests */
function makeWordBank(count: number): WordEntry[] {
  const words: WordEntry[] = [];
  for (let i = 0; i < count; i++) {
    words.push({ word: `word${i}` });
  }
  return words;
}

/** Create a session with two players already in the "playing" phase */
function createPlayingSession(
  options: {
    gridSize?: GridSize;
    isLocalMode?: boolean;
    randomSecretWords?: boolean;
    sharedComputerMode?: boolean;
  } = {}
): { session: GameSession; player1Id: string; player2Id: string } {
  const gridSize = options.gridSize ?? 12;
  const wordBank = makeWordBank(gridSize);
  const session = createGameSession(
    "test-config",
    gridSize,
    wordBank,
    options.isLocalMode ?? false,
    false,
    options.randomSecretWords ?? false,
    options.sharedComputerMode ?? false
  );

  const r1 = addPlayer(session, "Alice");
  if ("error" in r1) throw new Error(r1.error);
  const r2 = addPlayer(session, "Bob");
  if ("error" in r2) throw new Error(r2.error);

  if (!options.randomSecretWords) {
    // Both players select their secret words
    selectSecretWord(session, r1.player.id, 0);
    selectSecretWord(session, r2.player.id, 1);
  }

  expect(session.phase).toBe("playing");
  return {
    session,
    player1Id: r1.player.id,
    player2Id: r2.player.id,
  };
}

// ===========================================================================
// generateGameCode
// ===========================================================================

describe("generateGameCode", () => {
  test("returns a 6-character string", () => {
    const code = generateGameCode();
    expect(code).toHaveLength(6);
  });

  test("only uses the allowed character set (no confusing chars)", () => {
    const allowed = new Set("ABCDEFGHJKMNPQRSTUVWXYZ23456789");
    for (let i = 0; i < 50; i++) {
      const code = generateGameCode();
      for (const ch of code) {
        expect(allowed.has(ch)).toBe(true);
      }
    }
  });

  test("generates unique codes (probabilistic)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateGameCode());
    }
    // With 30^6 possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});

// ===========================================================================
// generatePlayerId
// ===========================================================================

describe("generatePlayerId", () => {
  test("returns a 12-character string", () => {
    expect(generatePlayerId()).toHaveLength(12);
  });

  test("generates unique IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generatePlayerId());
    }
    expect(ids.size).toBe(100);
  });
});

// ===========================================================================
// selectWordsForGame
// ===========================================================================

describe("selectWordsForGame", () => {
  test("returns the correct number of cards", () => {
    const cards = selectWordsForGame(makeWordBank(24), 12);
    expect(cards).toHaveLength(12);
  });

  test("each card has word and sequential index", () => {
    const cards = selectWordsForGame(makeWordBank(20), 16);
    for (let i = 0; i < cards.length; i++) {
      expect(cards[i].index).toBe(i);
      expect(typeof cards[i].word).toBe("string");
      expect(cards[i].word.length).toBeGreaterThan(0);
    }
  });

  test("throws when word bank is too small", () => {
    expect(() => selectWordsForGame(makeWordBank(5), 12)).toThrow(
      /Word bank has 5 words but needs 12/
    );
  });

  test("works when word bank equals grid size", () => {
    const cards = selectWordsForGame(makeWordBank(12), 12);
    expect(cards).toHaveLength(12);
  });
});

// ===========================================================================
// createGameSession
// ===========================================================================

describe("createGameSession", () => {
  test("creates a session in the waiting phase", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    expect(session.phase).toBe("waiting");
    expect(session.players).toHaveLength(0);
    expect(session.code).toHaveLength(6);
    expect(session.configId).toBe("cfg");
  });

  test("sets correct default options", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    expect(session.isLocalMode).toBe(false);
    expect(session.showOnlyLastQuestion).toBe(false);
    expect(session.randomSecretWords).toBe(false);
    expect(session.sharedComputerMode).toBe(false);
  });

  test("respects provided options", () => {
    const session = createGameSession(
      "cfg",
      12,
      makeWordBank(12),
      true,
      true,
      true,
      true
    );
    expect(session.isLocalMode).toBe(true);
    expect(session.showOnlyLastQuestion).toBe(true);
    expect(session.randomSecretWords).toBe(true);
    expect(session.sharedComputerMode).toBe(true);
  });

  test("initialises game state with cards and no winner", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    expect(session.gameState).not.toBeNull();
    expect(session.gameState!.cards).toHaveLength(12);
    expect(session.gameState!.currentTurn).toBe(0);
    expect(session.gameState!.winner).toBeNull();
    expect(session.gameState!.pendingQuestion).toBeNull();
    expect(session.gameState!.awaitingAnswer).toBe(false);
  });

  test("sets expiration in the future", () => {
    const before = Date.now();
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const expires = new Date(session.expiresAt).getTime();
    expect(expires).toBeGreaterThanOrEqual(before + SESSION_TIMEOUT_MS - 1000);
  });
});

// ===========================================================================
// addPlayer
// ===========================================================================

describe("addPlayer", () => {
  let session: GameSession;

  beforeEach(() => {
    session = createGameSession("cfg", 12, makeWordBank(12));
  });

  test("adds first player successfully", () => {
    const result = addPlayer(session, "Alice");
    expect("player" in result).toBe(true);
    if (!("player" in result)) return;
    expect(result.player.name).toBe("Alice");
    expect(result.playerIndex).toBe(0);
    expect(session.players).toHaveLength(1);
    expect(session.phase).toBe("waiting");
  });

  test("transitions to selecting phase when second player joins", () => {
    addPlayer(session, "Alice");
    const result = addPlayer(session, "Bob");
    expect("player" in result).toBe(true);
    if (!("player" in result)) return;
    expect(result.playerIndex).toBe(1);
    expect(session.players).toHaveLength(2);
    expect(session.phase).toBe("selecting");
  });

  test("transitions to playing phase when randomSecretWords is enabled", () => {
    const s = createGameSession("cfg", 12, makeWordBank(12), false, false, true);
    addPlayer(s, "Alice");
    addPlayer(s, "Bob");
    expect(s.phase).toBe("playing");
    // Both players should have secret words assigned
    expect(s.players[0].secretWordIndex).not.toBeNull();
    expect(s.players[1].secretWordIndex).not.toBeNull();
    expect(s.players[0].secretWordIndex).not.toBe(s.players[1].secretWordIndex);
  });

  test("rejects third player", () => {
    addPlayer(session, "Alice");
    addPlayer(session, "Bob");
    const result = addPlayer(session, "Charlie");
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error).toBe("Game is full");
  });

  test("rejects duplicate player name (case-insensitive)", () => {
    addPlayer(session, "Alice");
    const result = addPlayer(session, "alice");
    expect("error" in result).toBe(true);
    if (!("error" in result)) return;
    expect(result.error).toBe("Player name already taken");
  });

  test("allows reconnection with existing player ID", () => {
    const r1 = addPlayer(session, "Alice");
    if (!("player" in r1)) throw new Error("failed");
    addPlayer(session, "Bob");

    // Disconnect Alice
    disconnectPlayer(session, r1.player.id);
    expect(session.players[0].connected).toBe(false);

    // Reconnect Alice
    const reconnect = addPlayer(session, "Alice", r1.player.id);
    expect("player" in reconnect).toBe(true);
    if (!("player" in reconnect)) return;
    expect(reconnect.player.id).toBe(r1.player.id);
    expect(reconnect.player.connected).toBe(true);
  });

  test("rejects unknown player ID when game is full", () => {
    addPlayer(session, "Alice");
    addPlayer(session, "Bob");
    const result = addPlayer(session, "Charlie", "unknown-id");
    expect("error" in result).toBe(true);
  });
});

// ===========================================================================
// updatePlayerName
// ===========================================================================

describe("updatePlayerName", () => {
  let session: GameSession;

  beforeEach(() => {
    session = createGameSession("cfg", 12, makeWordBank(12));
    addPlayer(session, "Alice");
    addPlayer(session, "Bob");
  });

  test("updates a player name", () => {
    const result = updatePlayerName(session, 0, "Alicia");
    expect(result.success).toBe(true);
    expect(session.players[0].name).toBe("Alicia");
  });

  test("trims whitespace", () => {
    const result = updatePlayerName(session, 0, "  Alicia  ");
    expect(result.success).toBe(true);
    expect(session.players[0].name).toBe("Alicia");
  });

  test("rejects empty name", () => {
    const result = updatePlayerName(session, 0, "   ");
    expect(result.success).toBe(false);
  });

  test("rejects duplicate name (case-insensitive)", () => {
    const result = updatePlayerName(session, 0, "bob");
    expect(result.success).toBe(false);
  });

  test("rejects invalid player index", () => {
    expect(updatePlayerName(session, -1, "X").success).toBe(false);
    expect(updatePlayerName(session, 5, "X").success).toBe(false);
    expect(updatePlayerName(session, 1.5, "X").success).toBe(false);
  });
});

// ===========================================================================
// disconnectPlayer / allPlayersDisconnected
// ===========================================================================

describe("disconnect / allPlayersDisconnected", () => {
  test("marks a player as disconnected", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r = addPlayer(session, "Alice");
    if (!("player" in r)) throw new Error("failed");

    expect(disconnectPlayer(session, r.player.id)).toBe(true);
    expect(session.players[0].connected).toBe(false);
  });

  test("returns false for unknown player", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    expect(disconnectPlayer(session, "nope")).toBe(false);
  });

  test("allPlayersDisconnected returns true when all disconnected", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r1 = addPlayer(session, "Alice");
    const r2 = addPlayer(session, "Bob");
    if (!("player" in r1) || !("player" in r2)) throw new Error("failed");

    disconnectPlayer(session, r1.player.id);
    expect(allPlayersDisconnected(session)).toBe(false);
    disconnectPlayer(session, r2.player.id);
    expect(allPlayersDisconnected(session)).toBe(true);
  });

  test("allPlayersDisconnected returns false with no players", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    expect(allPlayersDisconnected(session)).toBe(false);
  });
});

// ===========================================================================
// flipCard
// ===========================================================================

describe("flipCard", () => {
  test("flips a card for a player", () => {
    const { session, player1Id } = createPlayingSession();
    const result = flipCard(session, player1Id, 3);
    expect(result.success).toBe(true);
    expect(session.players[0].flippedCards).toContain(3);
  });

  test("unflips a previously flipped card (toggle)", () => {
    const { session, player1Id } = createPlayingSession();
    flipCard(session, player1Id, 3);
    expect(session.players[0].flippedCards).toContain(3);

    flipCard(session, player1Id, 3);
    expect(session.players[0].flippedCards).not.toContain(3);
  });

  test("rejects invalid card index", () => {
    const { session, player1Id } = createPlayingSession();
    expect(flipCard(session, player1Id, -1).success).toBe(false);
    expect(flipCard(session, player1Id, 99).success).toBe(false);
  });

  test("rejects unknown player", () => {
    const { session } = createPlayingSession();
    expect(flipCard(session, "unknown", 0).success).toBe(false);
  });

  test("rejects when game is not in playing phase", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r = addPlayer(session, "Alice");
    if (!("player" in r)) throw new Error("failed");
    expect(flipCard(session, r.player.id, 0).success).toBe(false);
  });
});

// ===========================================================================
// askQuestion
// ===========================================================================

describe("askQuestion", () => {
  test("player whose turn it is can ask a question", () => {
    const { session, player1Id } = createPlayingSession();
    // currentTurn starts at 0 (player1)
    const result = askQuestion(session, player1Id, "Does it start with A?");
    expect(result.success).toBe(true);
    expect(session.gameState!.pendingQuestion).toBe("Does it start with A?");
    expect(session.gameState!.awaitingAnswer).toBe(true);
  });

  test("rejects question from player whose turn it is not", () => {
    const { session, player2Id } = createPlayingSession();
    const result = askQuestion(session, player2Id, "Does it start with A?");
    expect(result.success).toBe(false);
  });

  test("local mode allows any player to ask", () => {
    const { session, player2Id } = createPlayingSession({ isLocalMode: true });
    const result = askQuestion(session, player2Id, "Does it start with A?");
    expect(result.success).toBe(true);
  });

  test("rejects when already awaiting an answer", () => {
    const { session, player1Id } = createPlayingSession();
    askQuestion(session, player1Id, "Q1?");
    const result = askQuestion(session, player1Id, "Q2?");
    expect(result.success).toBe(false);
  });

  test("rejects when game is not playing", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r = addPlayer(session, "Alice");
    if (!("player" in r)) throw new Error("failed");
    expect(askQuestion(session, r.player.id, "Q?").success).toBe(false);
  });
});

// ===========================================================================
// answerQuestion
// ===========================================================================

describe("answerQuestion", () => {
  test("opponent can answer a pending question", () => {
    const { session, player1Id, player2Id } = createPlayingSession();
    askQuestion(session, player1Id, "Does it start with A?");

    const result = answerQuestion(session, player2Id, true);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.answer).toBe(true);
    expect(session.gameState!.pendingQuestion).toBeNull();
    expect(session.gameState!.awaitingAnswer).toBe(false);
  });

  test("switches turn to the answerer after answering", () => {
    const { session, player1Id, player2Id } = createPlayingSession();
    expect(session.gameState!.currentTurn).toBe(0);

    askQuestion(session, player1Id, "Q?");
    answerQuestion(session, player2Id, false);
    expect(session.gameState!.currentTurn).toBe(1);
  });

  test("asker cannot answer their own question", () => {
    const { session, player1Id } = createPlayingSession();
    askQuestion(session, player1Id, "Q?");
    const result = answerQuestion(session, player1Id, true);
    expect(result.success).toBe(false);
  });

  test("rejects when no question is pending", () => {
    const { session, player2Id } = createPlayingSession();
    const result = answerQuestion(session, player2Id, true);
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// makeGuess
// ===========================================================================

describe("makeGuess", () => {
  test("correct guess wins the game", () => {
    const { session, player1Id } = createPlayingSession();
    // Player 2's secret word is at index 1
    const opponentWord = session.gameState!.cards[1].word;

    const result = makeGuess(session, player1Id, opponentWord);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correct).toBe(true);
    expect(result.gameOver).toBe(true);
    expect(session.gameState!.winner).toBe(0);
    expect(session.phase).toBe("finished");
  });

  test("correct guess is case-insensitive", () => {
    const { session, player1Id } = createPlayingSession();
    const opponentWord = session.gameState!.cards[1].word;

    const result = makeGuess(session, player1Id, opponentWord.toUpperCase());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correct).toBe(true);
  });

  test("incorrect guess switches turn", () => {
    const { session, player1Id } = createPlayingSession();
    expect(session.gameState!.currentTurn).toBe(0);

    const result = makeGuess(session, player1Id, "definitely-wrong");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.correct).toBe(false);
    expect(result.gameOver).toBe(false);
    expect(session.gameState!.currentTurn).toBe(1);
    expect(session.phase).toBe("playing");
  });

  test("rejects guess from wrong player", () => {
    const { session, player2Id } = createPlayingSession();
    const result = makeGuess(session, player2Id, "anything");
    expect(result.success).toBe(false);
  });

  test("local mode allows any player to guess", () => {
    const { session, player2Id } = createPlayingSession({ isLocalMode: true });
    const result = makeGuess(session, player2Id, "anything");
    expect(result.success).toBe(true);
  });

  test("rejects guess while awaiting answer", () => {
    const { session, player1Id } = createPlayingSession();
    askQuestion(session, player1Id, "Q?");
    const result = makeGuess(session, player1Id, "anything");
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// endTurn
// ===========================================================================

describe("endTurn", () => {
  test("switches turn to the other player", () => {
    const { session, player1Id } = createPlayingSession();
    expect(session.gameState!.currentTurn).toBe(0);

    const result = endTurn(session, player1Id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.nextTurn).toBe(1);
    expect(session.gameState!.currentTurn).toBe(1);
  });

  test("rejects when not your turn", () => {
    const { session, player2Id } = createPlayingSession();
    const result = endTurn(session, player2Id);
    expect(result.success).toBe(false);
  });

  test("rejects while awaiting answer", () => {
    const { session, player1Id } = createPlayingSession();
    askQuestion(session, player1Id, "Q?");
    const result = endTurn(session, player1Id);
    expect(result.success).toBe(false);
  });

  test("rejects for unknown player", () => {
    const { session } = createPlayingSession();
    expect(endTurn(session, "nope").success).toBe(false);
  });
});

// ===========================================================================
// selectSecretWord
// ===========================================================================

describe("selectSecretWord", () => {
  test("player selects a secret word", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r1 = addPlayer(session, "Alice");
    const r2 = addPlayer(session, "Bob");
    if (!("player" in r1) || !("player" in r2)) throw new Error("failed");

    const result = selectSecretWord(session, r1.player.id, 5);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.bothSelected).toBe(false);
    expect(session.players[0].secretWordIndex).toBe(5);
    expect(session.players[0].hasSelectedWord).toBe(true);
    expect(session.phase).toBe("selecting");
  });

  test("transitions to playing when both players select", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r1 = addPlayer(session, "Alice");
    const r2 = addPlayer(session, "Bob");
    if (!("player" in r1) || !("player" in r2)) throw new Error("failed");

    selectSecretWord(session, r1.player.id, 5);
    const result = selectSecretWord(session, r2.player.id, 7);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.bothSelected).toBe(true);
    expect(session.phase).toBe("playing");
  });

  test("rejects selecting the same word as opponent", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r1 = addPlayer(session, "Alice");
    const r2 = addPlayer(session, "Bob");
    if (!("player" in r1) || !("player" in r2)) throw new Error("failed");

    selectSecretWord(session, r1.player.id, 5);
    const result = selectSecretWord(session, r2.player.id, 5);
    expect(result.success).toBe(false);
  });

  test("rejects selecting twice", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r1 = addPlayer(session, "Alice");
    addPlayer(session, "Bob");
    if (!("player" in r1)) throw new Error("failed");

    selectSecretWord(session, r1.player.id, 5);
    const result = selectSecretWord(session, r1.player.id, 6);
    expect(result.success).toBe(false);
  });

  test("rejects invalid card index", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const r1 = addPlayer(session, "Alice");
    addPlayer(session, "Bob");
    if (!("player" in r1)) throw new Error("failed");

    expect(selectSecretWord(session, r1.player.id, -1).success).toBe(false);
    expect(selectSecretWord(session, r1.player.id, 99).success).toBe(false);
  });

  test("shared computer mode allows forPlayerIndex", () => {
    const session = createGameSession(
      "cfg",
      12,
      makeWordBank(12),
      false,
      false,
      false,
      true // sharedComputerMode
    );
    const r1 = addPlayer(session, "Alice");
    addPlayer(session, "Bob");
    if (!("player" in r1)) throw new Error("failed");

    // Select on behalf of player 0
    const result = selectSecretWord(session, r1.player.id, 3, 0);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.playerIndex).toBe(0);
    expect(session.players[0].secretWordIndex).toBe(3);
  });

  test("rejects when not in selecting phase", () => {
    const { session, player1Id } = createPlayingSession();
    const result = selectSecretWord(session, player1Id, 3);
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// getPlayerSecretWord
// ===========================================================================

describe("getPlayerSecretWord", () => {
  test("returns the secret word for a player who selected", () => {
    const { session } = createPlayingSession();
    const word = getPlayerSecretWord(session, 0);
    expect(word).toBe(session.gameState!.cards[0].word);
  });

  test("returns null for player with no secret word", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    addPlayer(session, "Alice");
    expect(getPlayerSecretWord(session, 0)).toBeNull();
  });

  test("returns null for out-of-bounds index", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    expect(getPlayerSecretWord(session, 5)).toBeNull();
  });
});

// ===========================================================================
// isSessionExpired / extendSession
// ===========================================================================

describe("session expiry", () => {
  test("new session is not expired", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    expect(isSessionExpired(session)).toBe(false);
  });

  test("session with past expiry is expired", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    session.expiresAt = new Date(Date.now() - 1000).toISOString();
    expect(isSessionExpired(session)).toBe(true);
  });

  test("extendSession pushes expiry into the future", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    session.expiresAt = new Date(Date.now() - 1000).toISOString();
    expect(isSessionExpired(session)).toBe(true);

    extendSession(session);
    expect(isSessionExpired(session)).toBe(false);
  });

  test("extendSession accepts custom minutes", () => {
    const session = createGameSession("cfg", 12, makeWordBank(12));
    const before = Date.now();
    extendSession(session, 60);
    const expires = new Date(session.expiresAt).getTime();
    // Should be ~60 minutes from now
    expect(expires).toBeGreaterThanOrEqual(before + 59 * 60 * 1000);
  });
});

// ===========================================================================
// Full game flow integration test
// ===========================================================================

describe("full game flow", () => {
  test("complete game: create, join, select words, ask, answer, guess, win", () => {
    const wordBank = makeWordBank(12);
    const session = createGameSession("cfg", 12, wordBank);
    expect(session.phase).toBe("waiting");

    // Player 1 joins
    const r1 = addPlayer(session, "Alice");
    expect("player" in r1).toBe(true);
    if (!("player" in r1)) return;
    expect(session.phase).toBe("waiting");

    // Player 2 joins
    const r2 = addPlayer(session, "Bob");
    expect("player" in r2).toBe(true);
    if (!("player" in r2)) return;
    expect(session.phase).toBe("selecting");

    // Both select secret words
    selectSecretWord(session, r1.player.id, 2);
    selectSecretWord(session, r2.player.id, 8);
    expect(session.phase).toBe("playing");

    // Player 1 (turn 0) asks a question
    expect(session.gameState!.currentTurn).toBe(0);
    askQuestion(session, r1.player.id, "Does it have 5 letters?");
    expect(session.gameState!.awaitingAnswer).toBe(true);

    // Player 2 answers
    answerQuestion(session, r2.player.id, false);
    expect(session.gameState!.currentTurn).toBe(1);

    // Player 2 flips some cards
    flipCard(session, r2.player.id, 0);
    flipCard(session, r2.player.id, 4);
    expect(session.players[1].flippedCards).toEqual([0, 4]);

    // Player 2 asks a question
    askQuestion(session, r2.player.id, "Does it start with 'w'?");
    answerQuestion(session, r1.player.id, true);
    expect(session.gameState!.currentTurn).toBe(0);

    // Player 1 makes correct guess
    const secretWord = session.gameState!.cards[8].word;
    const guessResult = makeGuess(session, r1.player.id, secretWord);
    expect(guessResult.success).toBe(true);
    if (!guessResult.success) return;
    expect(guessResult.correct).toBe(true);
    expect(guessResult.gameOver).toBe(true);
    expect(session.phase).toBe("finished");
    expect(session.gameState!.winner).toBe(0);
  });
});
