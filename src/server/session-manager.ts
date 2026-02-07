/**
 * WebSocket session manager for Word Guess Who
 * Manages game rooms, player connections, and message broadcasting
 */

import type { ServerWebSocket } from "bun";
import type {
  GameSession,
  ClientMessage,
  ServerMessage,
  GameStateMessage,
  CardState,
  GameConfig,
} from "@shared/types";
import {
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
  getPlayerSecretWord,
  generateGameCode,
  selectSecretWord,
  SESSION_TIMEOUT_MS,
} from "./game-engine";
import { getConfig } from "./config-manager";

/** How often to send WebSocket ping frames (in ms) */
const HEARTBEAT_INTERVAL_MS = 30_000;

/** WebSocket data attached to each connection */
export interface WebSocketData {
  gameCode: string | null;
  playerId: string | null;
  playerIndex: number | null;
}

/** A game room with session and connected sockets */
interface GameRoom {
  session: GameSession;
  sockets: Map<string, ServerWebSocket<WebSocketData>>; // playerId -> socket
  expirationTimer: ReturnType<typeof setTimeout> | null;
}

/** The session manager singleton */
class SessionManager {
  private rooms: Map<string, GameRoom> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  /** Tracks liveness of each socket; set to false before ping, set to true on pong */
  private socketAlive: WeakMap<ServerWebSocket<WebSocketData>, boolean> =
    new WeakMap();

  /** Create a new game session */
  async createSession(
    configId: string,
    isLocalMode: boolean = false,
    showOnlyLastQuestion: boolean = false,
    randomSecretWords: boolean = false,
    sharedComputerMode: boolean = false
  ): Promise<GameSession | { error: string }> {
    const config = getConfig(configId);
    if (!config) {
      return { error: "Configuration not found" };
    }

    // Ensure we have a unique game code
    let gameCode: string;
    let attempts = 0;
    do {
      gameCode = generateGameCode();
      attempts++;
      if (attempts > 100) {
        return { error: "Failed to generate unique game code" };
      }
    } while (this.rooms.has(gameCode));

    const session = createGameSession(
      configId,
      config.settings.gridSize,
      config.wordBank,
      isLocalMode,
      showOnlyLastQuestion,
      randomSecretWords,
      sharedComputerMode
    );
    session.code = gameCode; // Use the verified unique code

    const room: GameRoom = {
      session,
      sockets: new Map(),
      expirationTimer: null,
    };

    this.rooms.set(gameCode, room);
    this.scheduleExpiration(gameCode);

    return session;
  }

  /** Get a session by code */
  getSession(gameCode: string): GameSession | null {
    const room = this.rooms.get(gameCode);
    return room?.session ?? null;
  }

  // ============================================
  // Heartbeat / Ping-Pong
  // ============================================

  /** Start the periodic heartbeat that pings all connected sockets */
  startHeartbeat(): void {
    if (this.heartbeatInterval) return; // already running

    this.heartbeatInterval = setInterval(() => {
      this.pingAllSockets();
    }, HEARTBEAT_INTERVAL_MS);
  }

  /** Stop the heartbeat interval */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /** Mark a newly opened socket as alive */
  registerSocket(ws: ServerWebSocket<WebSocketData>): void {
    this.socketAlive.set(ws, true);
  }

  /** Called when a pong frame is received from a client */
  handlePong(ws: ServerWebSocket<WebSocketData>): void {
    this.socketAlive.set(ws, true);
  }

  /** Ping every connected socket; disconnect any that missed the last pong */
  private pingAllSockets(): void {
    for (const room of this.rooms.values()) {
      for (const [playerId, socket] of room.sockets) {
        const isAlive = this.socketAlive.get(socket) ?? false;

        if (!isAlive) {
          // Did not respond to previous ping — stale connection
          console.log(
            `Heartbeat: stale WebSocket for player ${playerId} in game ${room.session.code}, disconnecting`
          );
          this.handleDisconnect(socket);
          try {
            socket.close();
          } catch {
            // Socket may already be closed
          }
          continue;
        }

        // Mark as not-alive; will be set back to true when pong arrives
        this.socketAlive.set(socket, false);
        try {
          socket.ping();
        } catch {
          // Socket may be closed
        }
      }
    }
  }

  /** Handle a new WebSocket connection attempting to join a game */
  handleJoin(
    ws: ServerWebSocket<WebSocketData>,
    gameCode: string,
    playerName: string,
    existingPlayerId?: string
  ): void {
    const room = this.rooms.get(gameCode);

    if (!room) {
      this.sendError(ws, "Game not found");
      return;
    }

    if (isSessionExpired(room.session)) {
      this.sendError(ws, "Game has expired");
      this.cleanupRoom(gameCode);
      return;
    }

    const result = addPlayer(room.session, playerName, existingPlayerId);

    if ("error" in result) {
      this.sendError(ws, result.error);
      return;
    }

    const { player, playerIndex } = result;

    // Store connection info
    ws.data.gameCode = gameCode;
    ws.data.playerId = player.id;
    ws.data.playerIndex = playerIndex;

    // Track socket
    room.sockets.set(player.id, ws);

    // Extend session when player joins
    extendSession(room.session);
    this.scheduleExpiration(gameCode);

    // Check if this is a reconnect (player was already in the game)
    const isReconnect = existingPlayerId && existingPlayerId === player.id;

    // In shared computer mode, automatically add a second player when the first player joins
    if (
      room.session.sharedComputerMode &&
      room.session.players.length === 1 &&
      !isReconnect
    ) {
      const player2Name = `${playerName}'s Opponent`;
      const result2 = addPlayer(room.session, player2Name);

      if (!("error" in result2)) {
        // Game phase will have transitioned to "selecting" or "playing" after second player added
        // Send updated game state to the first player with both players present
        this.sendGameState(ws, room.session, playerIndex);
        return;
      }
    }

    // Send full game state to the joining player
    this.sendGameState(ws, room.session, playerIndex);

    // Notify other players
    if (isReconnect) {
      this.broadcastToOthers(room, player.id, {
        type: "player_reconnected",
        playerIndex,
      });
    } else {
      this.broadcastToOthers(room, player.id, {
        type: "player_joined",
        playerName: player.name,
        playerIndex,
      });

      // If game just transitioned (second player joined), send updated state to first player
      if (
        (room.session.phase === "playing" ||
          room.session.phase === "selecting") &&
        room.session.players.length === 2
      ) {
        const firstPlayerSocket = room.sockets.get(room.session.players[0].id);
        if (firstPlayerSocket) {
          this.sendGameState(firstPlayerSocket, room.session, 0);
        }
      }
    }
  }

  /** Handle a player disconnecting */
  handleDisconnect(ws: ServerWebSocket<WebSocketData>): void {
    const { gameCode, playerId, playerIndex } = ws.data;

    if (!gameCode || !playerId) return;

    // Clear connection info to prevent duplicate processing
    // (e.g., when handleDisconnect is called explicitly before socket.close())
    ws.data.gameCode = null;
    ws.data.playerId = null;

    const room = this.rooms.get(gameCode);
    if (!room) return;

    // Remove socket
    room.sockets.delete(playerId);

    // Mark player as disconnected
    disconnectPlayer(room.session, playerId);

    // Notify other players
    if (playerIndex !== null) {
      this.broadcastToOthers(room, playerId, {
        type: "player_left",
        playerIndex,
      });
    }

    // If all players disconnected, schedule cleanup
    if (allPlayersDisconnected(room.session)) {
      this.scheduleExpiration(gameCode, SESSION_TIMEOUT_MS);
    }
  }

  /** Handle incoming message from a player */
  handleMessage(
    ws: ServerWebSocket<WebSocketData>,
    message: ClientMessage
  ): void {
    const { gameCode, playerId, playerIndex } = ws.data;

    // Handle join separately (doesn't require existing game state)
    if (message.type === "join_game") {
      this.handleJoin(
        ws,
        message.gameCode,
        message.playerName,
        message.playerId
      );
      return;
    }

    // All other messages require being in a game
    if (!gameCode || !playerId || playerIndex === null) {
      this.sendError(ws, "Not in a game");
      return;
    }

    const room = this.rooms.get(gameCode);
    if (!room) {
      this.sendError(ws, "Game not found");
      return;
    }

    extendSession(room.session);
    this.scheduleExpiration(gameCode);

    switch (message.type) {
      case "flip_card":
        this.handleFlipCard(room, playerId, message.cardIndex);
        break;

      case "ask_question":
        this.handleAskQuestion(room, playerId, message.question);
        break;

      case "answer_question":
        this.handleAnswerQuestion(room, playerId, message.answer);
        break;

      case "make_guess":
        this.handleMakeGuess(room, playerId, message.word);
        break;

      case "select_secret_word":
        this.handleSelectSecretWord(
          room,
          playerId,
          message.cardIndex,
          message.forPlayerIndex
        );
        break;

      case "end_turn":
        this.handleEndTurn(ws, room, playerId);
        break;

      case "update_player_name":
        this.handleUpdatePlayerName(room, playerId, message.playerIndex, message.playerName);
        break;

      case "leave_game":
        this.handleDisconnect(ws);
        ws.close();
        break;
    }
  }

  /** Handle card flip */
  private handleFlipCard(
    room: GameRoom,
    playerId: string,
    cardIndex: number
  ): void {
    // In shared computer mode, flip card for whoever's turn it currently is
    // (the player viewing the board is the one who should own the flip)
    let effectivePlayerId = playerId;
    if (room.session.sharedComputerMode && room.session.gameState) {
      const currentTurnPlayerIndex = room.session.gameState.currentTurn;
      effectivePlayerId =
        room.session.players[currentTurnPlayerIndex]?.id ?? playerId;
    }

    const result = flipCard(room.session, effectivePlayerId, cardIndex);

    if (!result.success) {
      const socket = room.sockets.get(playerId);
      if (socket) this.sendError(socket, result.error);
      return;
    }

    // Broadcast to all players
    this.broadcast(room, {
      type: "card_flipped",
      playerIndex: result.playerIndex,
      cardIndex,
    });
  }

  /** Handle asking a question */
  private handleAskQuestion(
    room: GameRoom,
    playerId: string,
    question: string
  ): void {
    const result = askQuestion(room.session, playerId, question);

    if (!result.success) {
      const socket = room.sockets.get(playerId);
      if (socket) this.sendError(socket, result.error);
      return;
    }

    // Broadcast to all players
    this.broadcast(room, {
      type: "question_asked",
      playerIndex: result.playerIndex,
      question,
    });
  }

  /** Handle answering a question */
  private handleAnswerQuestion(
    room: GameRoom,
    playerId: string,
    answer: boolean
  ): void {
    const result = answerQuestion(room.session, playerId, answer);

    if (!result.success) {
      const socket = room.sockets.get(playerId);
      if (socket) this.sendError(socket, result.error);
      return;
    }

    // Broadcast to all players
    this.broadcast(room, {
      type: "question_answered",
      playerIndex: result.playerIndex,
      answer: result.answer,
    });
  }

  /** Handle making a guess */
  private handleMakeGuess(
    room: GameRoom,
    playerId: string,
    word: string
  ): void {
    // In shared computer mode, make guess for whoever's turn it currently is
    let effectivePlayerId = playerId;
    if (room.session.sharedComputerMode && room.session.gameState) {
      const currentTurnPlayerIndex = room.session.gameState.currentTurn;
      effectivePlayerId =
        room.session.players[currentTurnPlayerIndex]?.id ?? playerId;
    }

    const result = makeGuess(room.session, effectivePlayerId, word);

    if (!result.success) {
      const socket = room.sockets.get(playerId);
      if (socket) this.sendError(socket, result.error);
      return;
    }

    // Broadcast guess result
    this.broadcast(room, {
      type: "guess_made",
      playerIndex: result.playerIndex,
      word,
      correct: result.correct,
    });

    // If game is over, send game over message
    if (result.gameOver) {
      const winner = room.session.players[result.playerIndex];
      const secretWords: [string, string] = [
        getPlayerSecretWord(room.session, 0) ?? "",
        getPlayerSecretWord(room.session, 1) ?? "",
      ];

      this.broadcast(room, {
        type: "game_over",
        winnerIndex: result.playerIndex,
        winnerName: winner.name,
        secretWords,
      });

      // Schedule room cleanup after game over
      this.scheduleExpiration(room.session.code, SESSION_TIMEOUT_MS);
    }
  }

  /** Handle secret word selection */
  private handleSelectSecretWord(
    room: GameRoom,
    playerId: string,
    cardIndex: number,
    forPlayerIndex?: number
  ): void {
    const result = selectSecretWord(
      room.session,
      playerId,
      cardIndex,
      forPlayerIndex
    );

    if (!result.success) {
      const socket = room.sockets.get(playerId);
      if (socket) this.sendError(socket, result.error);
      return;
    }

    // Send updated game state to the selecting socket (player 0's socket in shared mode)
    const selectingSocket = room.sockets.get(playerId);
    if (selectingSocket) {
      // In shared computer mode, always show as player 0's perspective
      // (since that's the only connected socket)
      const viewAsPlayerIndex = room.session.sharedComputerMode
        ? 0
        : result.playerIndex;
      this.sendGameState(selectingSocket, room.session, viewAsPlayerIndex);
    }

    // Notify opponent that this player has selected (without revealing which word)
    // In shared computer mode, no need to broadcast since there's only one socket
    if (!room.session.sharedComputerMode) {
      this.broadcastToOthers(room, playerId, {
        type: "word_selected",
        playerIndex: result.playerIndex,
      });
    }

    // If both players have selected, send full game state
    if (result.bothSelected) {
      if (room.session.sharedComputerMode) {
        // In shared computer mode, just send state to the only socket
        if (selectingSocket) {
          this.sendGameState(selectingSocket, room.session, 0);
        }
      } else {
        // Normal mode: send to both players
        for (let i = 0; i < room.session.players.length; i++) {
          const player = room.session.players[i];
          const socket = room.sockets.get(player.id);
          if (socket) {
            this.sendGameState(socket, room.session, i);
          }
        }
      }
    }
  }

  /** Handle ending turn (used in shared computer mode to pass the device) */
  private handleEndTurn(
    ws: ServerWebSocket<WebSocketData>,
    room: GameRoom,
    playerId: string
  ): void {
    // In shared computer mode, end turn for whoever's turn it currently is
    // (since the socket always belongs to player 1, but we act on behalf of current player)
    let effectivePlayerId = playerId;
    if (room.session.sharedComputerMode && room.session.gameState) {
      const currentTurnPlayerIndex = room.session.gameState.currentTurn;
      effectivePlayerId =
        room.session.players[currentTurnPlayerIndex]?.id ?? playerId;
    }

    const result = endTurn(room.session, effectivePlayerId);

    if (!result.success) {
      this.sendError(ws, result.error);
      return;
    }

    // In shared computer mode, send game state from the new player's perspective
    if (room.session.sharedComputerMode) {
      // Send turn_ended message first so client knows to switch
      this.send(ws, {
        type: "turn_ended",
        nextPlayerIndex: result.nextTurn,
      });
      // Then send the full game state from the new player's perspective
      this.sendGameState(ws, room.session, result.nextTurn);
    } else {
      // In normal mode, broadcast turn_ended to all players
      this.broadcast(room, {
        type: "turn_ended",
        nextPlayerIndex: result.nextTurn,
      });
    }
  }

  /** Handle player name updates (shared computer mode) */
  private handleUpdatePlayerName(
    room: GameRoom,
    playerId: string,
    playerIndex: number,
    playerName: string
  ): void {
    if (!room.session.sharedComputerMode) {
      const socket = room.sockets.get(playerId);
      if (socket) {
        this.sendError(socket, "Player name updates are only available in shared computer mode");
      }
      return;
    }

    const result = updatePlayerName(room.session, playerIndex, playerName);
    if (!result.success) {
      const socket = room.sockets.get(playerId);
      if (socket) this.sendError(socket, result.error);
      return;
    }

    this.broadcast(room, {
      type: "player_name_updated",
      playerIndex: result.playerIndex,
      playerName: result.playerName,
    });
  }

  /** Send full game state to a player */
  private sendGameState(
    ws: ServerWebSocket<WebSocketData>,
    session: GameSession,
    playerIndex: number
  ): void {
    if (!session.gameState) return;

    const player = session.players[playerIndex];
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = session.players[opponentIndex];

    const message: GameStateMessage = {
      type: "game_state",
      session: {
        code: session.code,
        configId: session.configId,
        isLocalMode: session.isLocalMode,
        showOnlyLastQuestion: session.showOnlyLastQuestion,
        randomSecretWords: session.randomSecretWords,
        sharedComputerMode: session.sharedComputerMode,
        phase: session.phase,
        players: session.players.map((p) => ({
          id: p.id,
          name: p.name,
          connected: p.connected,
        })),
        createdAt: session.createdAt,
      },
      playerIndex,
      cards: session.gameState.cards,
      myFlippedCards: player.flippedCards,
      opponentFlippedCards: opponent?.flippedCards ?? [],
      currentTurn: session.gameState.currentTurn,
      pendingQuestion: session.gameState.pendingQuestion,
      awaitingAnswer: session.gameState.awaitingAnswer,
      winner: session.gameState.winner,
      mySecretWord:
        player.secretWordIndex !== null
          ? session.gameState.cards[player.secretWordIndex].word
          : null,
      hasSelectedWord: player.hasSelectedWord,
      opponentHasSelected: opponent?.hasSelectedWord ?? false,
    };

    this.send(ws, message);
  }

  /** Send an error message */
  private sendError(ws: ServerWebSocket<WebSocketData>, message: string): void {
    this.send(ws, { type: "error", message });
  }

  /** Send a message to a single socket */
  private send(
    ws: ServerWebSocket<WebSocketData>,
    message: ServerMessage
  ): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Socket may be closed
    }
  }

  /** Broadcast a message to all players in a room */
  private broadcast(room: GameRoom, message: ServerMessage): void {
    const json = JSON.stringify(message);
    for (const socket of room.sockets.values()) {
      try {
        socket.send(json);
      } catch {
        // Socket may be closed
      }
    }
  }

  /** Broadcast a message to all players except one */
  private broadcastToOthers(
    room: GameRoom,
    excludePlayerId: string,
    message: ServerMessage
  ): void {
    const json = JSON.stringify(message);
    for (const [playerId, socket] of room.sockets) {
      if (playerId !== excludePlayerId) {
        try {
          socket.send(json);
        } catch {
          // Socket may be closed
        }
      }
    }
  }

  /** Schedule room expiration */
  private scheduleExpiration(gameCode: string, ms?: number): void {
    const room = this.rooms.get(gameCode);
    if (!room) return;

    // Clear existing timer
    if (room.expirationTimer) {
      clearTimeout(room.expirationTimer);
    }

    // Calculate time until expiration
    const expiresAt = new Date(room.session.expiresAt).getTime();
    const now = Date.now();
    const delay = ms ?? Math.max(0, expiresAt - now);

    room.expirationTimer = setTimeout(() => {
      this.expireRoom(gameCode);
    }, delay);
  }

  /** Expire a room and notify connected players */
  private expireRoom(gameCode: string): void {
    const room = this.rooms.get(gameCode);
    if (!room) return;

    // Notify all connected players
    this.broadcast(room, { type: "game_expired" });

    // Close all sockets
    for (const socket of room.sockets.values()) {
      try {
        socket.close();
      } catch {
        // Ignore close errors
      }
    }

    // Clean up
    this.cleanupRoom(gameCode);
  }

  /** Clean up a room */
  private cleanupRoom(gameCode: string): void {
    const room = this.rooms.get(gameCode);
    if (!room) return;

    if (room.expirationTimer) {
      clearTimeout(room.expirationTimer);
    }

    this.rooms.delete(gameCode);
  }

  /** Get all active session codes (for debugging) */
  getActiveSessions(): string[] {
    return Array.from(this.rooms.keys());
  }

  /** Get room count (for monitoring) */
  getRoomCount(): number {
    return this.rooms.size;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
