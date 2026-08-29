import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@client/lib/supabase";
import { subscribeToGame, broadcastFlipCard, type FlipCardPayload } from "@client/lib/realtime";
import type { CardState } from "@shared/types";

// ─── API response shape (from /api/games/:code) ───────────────────────────

export interface GameApiPlayer {
  id: string;
  name: string;
  connected: boolean;
  hasSelectedWord: boolean;
  flippedCards: number[];
  secretWordIndex: number | null;
}

export interface GameApiQuestion {
  id: string;
  questionIndex: number;
  askerIndex: number;
  question: string;
  answer: boolean | null;
  isGuess: boolean;
  createdAt: string;
  answeredAt: string | null;
}

export interface GameApiResponse {
  code: string;
  configId: string | null;
  phase: string;
  isLocalMode: boolean;
  showOnlyLastQuestion: boolean;
  randomSecretWords: boolean;
  sharedComputerMode: boolean;
  players: GameApiPlayer[];
  gameState: {
    cards: CardState[];
    currentTurn: number | null;
    pendingQuestion: string | null;
    awaitingAnswer: boolean;
    winner: number | null;
  } | null;
  questionLog: GameApiQuestion[];
  myPlayerIndex: number | null;
  mySecretWord: string | null;
  createdAt: string;
  expiresAt: string;
}

// ─── Context state (same shape as before — drives all UI components) ───────

export interface QuestionLogEntry {
  question: string;
  answer: boolean | null;
  askerIndex: number;
}

interface GameContextState {
  connected: boolean;
  /** Tracks the game session ID (UUID) needed for Realtime filters */
  gameSessionId: string | null;
  session: {
    code: string;
    configId: string | null;
    isLocalMode: boolean;
    showOnlyLastQuestion: boolean;
    randomSecretWords: boolean;
    sharedComputerMode: boolean;
    phase: string;
    players: Array<{ id: string; name: string; connected: boolean }>;
    createdAt: string;
  } | null;
  playerIndex: number | null;
  cards: CardState[];
  myFlippedCards: number[];
  opponentFlippedCards: number[];
  currentTurn: number;
  pendingQuestion: string | null;
  awaitingAnswer: boolean;
  winner: number | null;
  mySecretWord: string | null;
  lastGuess: { word: string; correct: boolean; playerIndex: number } | null;
  lastAnswer: boolean | null;
  error: string | null;
  revealedSecrets: [string, string] | null;
  questionHistory: QuestionLogEntry[];
  hasSelectedWord: boolean;
  opponentHasSelected: boolean;
  secretWordHidden: boolean;
}

type GameAction =
  | { type: "SET_GAME_STATE"; apiResponse: GameApiResponse }
  | { type: "FLIP_CARD"; cardIndex: number; playerIndex: number }
  | { type: "SET_CONNECTED"; connected: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
  | { type: "SET_SECRET_WORD_HIDDEN"; hidden: boolean };

const initialState: GameContextState = {
  connected: false,
  gameSessionId: null,
  session: null,
  playerIndex: null,
  cards: [],
  myFlippedCards: [],
  opponentFlippedCards: [],
  currentTurn: 0,
  pendingQuestion: null,
  awaitingAnswer: false,
  winner: null,
  mySecretWord: null,
  lastGuess: null,
  lastAnswer: null,
  error: null,
  revealedSecrets: null,
  questionHistory: [],
  hasSelectedWord: false,
  opponentHasSelected: false,
  secretWordHidden: false,
};

function apiResponseToState(
  apiResponse: GameApiResponse,
  prevState: GameContextState,
): Partial<GameContextState> {
  const myIndex = apiResponse.myPlayerIndex;
  const opponentIndex = myIndex === 0 ? 1 : 0;

  const myFlippedCards = myIndex !== null ? (apiResponse.players[myIndex]?.flippedCards ?? []) : [];
  const opponentFlippedCards = myIndex !== null ? (apiResponse.players[opponentIndex]?.flippedCards ?? []) : [];

  const nonGuessQuestions = apiResponse.questionLog.filter((q) => !q.isGuess);
  const questionHistory: QuestionLogEntry[] = nonGuessQuestions.map((q) => ({
    question: q.question,
    answer: q.answer,
    askerIndex: q.askerIndex,
  }));

  // Track last answer for the "answer revealed" UI
  const lastAnsweredQ = [...nonGuessQuestions].reverse().find((q) => q.answer !== null);
  const lastAnswer = lastAnsweredQ?.answer ?? null;

  // Track last guess (for both players' guess history)
  const lastGuessEntry = [...apiResponse.questionLog].reverse().find((q) => q.isGuess);
  const lastGuess = lastGuessEntry
    ? { word: lastGuessEntry.question, correct: lastGuessEntry.answer === true, playerIndex: lastGuessEntry.askerIndex }
    : prevState.lastGuess;

  const session = {
    code: apiResponse.code,
    configId: apiResponse.configId,
    isLocalMode: apiResponse.isLocalMode,
    showOnlyLastQuestion: apiResponse.showOnlyLastQuestion,
    randomSecretWords: apiResponse.randomSecretWords,
    sharedComputerMode: apiResponse.sharedComputerMode,
    phase: apiResponse.phase,
    players: apiResponse.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
    createdAt: apiResponse.createdAt,
  };

  return {
    session,
    playerIndex: myIndex,
    cards: apiResponse.gameState?.cards ?? prevState.cards,
    myFlippedCards,
    opponentFlippedCards,
    currentTurn: apiResponse.gameState?.currentTurn ?? 0,
    pendingQuestion: apiResponse.gameState?.pendingQuestion ?? null,
    awaitingAnswer: apiResponse.gameState?.awaitingAnswer ?? false,
    winner: apiResponse.gameState?.winner ?? null,
    mySecretWord: apiResponse.mySecretWord,
    questionHistory,
    lastGuess: lastGuess ?? null,
    lastAnswer,
    hasSelectedWord: myIndex !== null ? (apiResponse.players[myIndex]?.hasSelectedWord ?? false) : false,
    opponentHasSelected: myIndex !== null ? (apiResponse.players[opponentIndex]?.hasSelectedWord ?? false) : false,
    error: null,
    secretWordHidden: apiResponse.sharedComputerMode ? prevState.secretWordHidden : false,
  };
}

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case "SET_CONNECTED":
      return { ...state, connected: action.connected };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "RESET":
      return initialState;

    case "SET_SECRET_WORD_HIDDEN":
      return { ...state, secretWordHidden: action.hidden };

    case "SET_GAME_STATE": {
      const updates = apiResponseToState(action.apiResponse, state);
      // If session ID changed (new game), store it for Realtime filter
      const gameSessionId = state.gameSessionId; // set separately via useState
      return { ...state, gameSessionId, ...updates };
    }

    case "FLIP_CARD": {
      const isMyFlip = action.playerIndex === state.playerIndex;
      const toggle = (list: number[], idx: number) =>
        list.includes(idx) ? list.filter((i) => i !== idx) : [...list, idx];
      return {
        ...state,
        myFlippedCards: isMyFlip ? toggle(state.myFlippedCards, action.cardIndex) : state.myFlippedCards,
        opponentFlippedCards: !isMyFlip ? toggle(state.opponentFlippedCards, action.cardIndex) : state.opponentFlippedCards,
      };
    }

    default:
      return state;
  }
}

// ─── Context value ──────────────────────────────────────────────────────────

interface GameContextValue extends GameContextState {
  dispatch: React.Dispatch<GameAction>;
  /** Load game state and set up Realtime subscriptions */
  joinGame: (gameCode: string, playerName?: string) => Promise<void>;
  flipCard: (cardIndex: number) => void;
  askQuestion: (question: string) => Promise<void>;
  answerQuestion: (answer: boolean) => Promise<void>;
  makeGuess: (word: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  selectSecretWord: (word: string) => Promise<void>;
  endTurn: () => Promise<void>;
  updatePlayerName: (playerIndex: number, playerName: string) => Promise<void>;
  setSecretWordHidden: (hidden: boolean) => void;
  joinedGameCodeRef: React.MutableRefObject<string | null>;
  refreshGameState: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

// ─── Fetch helper ───────────────────────────────────────────────────────────

async function fetchGame(code: string): Promise<GameApiResponse | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const res = await fetch(`/api/games/${code.toUpperCase()}`, { headers });
  const json = await res.json();
  return json.success ? json.data : null;
}

async function gameAction(
  code: string,
  path: string,
  method: string,
  body?: object,
): Promise<{ success: boolean; data?: GameApiResponse; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const res = await fetch(`/api/games/${code.toUpperCase()}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const currentCodeRef = useRef<string | null>(null);
  const joinedGameCodeRef = useRef<string | null>(null);

  const refreshGameState = useCallback(async () => {
    const code = currentCodeRef.current;
    if (!code) return;
    const data = await fetchGame(code);
    if (data) dispatch({ type: "SET_GAME_STATE", apiResponse: data });
  }, []);

  // Set up Realtime when we have both code and session ID
  useEffect(() => {
    const code = currentCodeRef.current;
    if (!code || !gameSessionId) return;

    const cleanup = subscribeToGame(
      code,
      gameSessionId,
      refreshGameState,
      (payload: FlipCardPayload) => {
        dispatch({ type: "FLIP_CARD", cardIndex: payload.cardIndex, playerIndex: payload.playerIndex });
      },
    );

    dispatch({ type: "SET_CONNECTED", connected: true });
    return () => {
      cleanup();
      dispatch({ type: "SET_CONNECTED", connected: false });
    };
  }, [gameSessionId, refreshGameState]);

  const joinGame = useCallback(async (gameCode: string, _playerName?: string) => {
    const code = gameCode.toUpperCase();
    currentCodeRef.current = code;
    joinedGameCodeRef.current = code;

    const data = await fetchGame(code);
    if (!data) {
      dispatch({ type: "SET_ERROR", error: "Game not found" });
      return;
    }
    dispatch({ type: "SET_GAME_STATE", apiResponse: data });

    // We need the game's internal UUID for Realtime filters.
    // The API response doesn't expose it, so we look it up via the public Supabase client.
    const { data: row } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (row?.id) setGameSessionId(row.id);
  }, []);

  const flipCard = useCallback((cardIndex: number) => {
    const code = currentCodeRef.current;
    if (!code || state.playerIndex === null) return;
    // Broadcast ephemeral flip — no HTTP call, no DB write
    broadcastFlipCard(code, { cardIndex, playerIndex: state.playerIndex });
    // Apply locally immediately
    dispatch({ type: "FLIP_CARD", cardIndex, playerIndex: state.playerIndex });
  }, [state.playerIndex]);

  const askQuestion = useCallback(async (question: string) => {
    const code = currentCodeRef.current;
    if (!code) return;
    const result = await gameAction(code, 'ask', 'POST', { question });
    if (result.success && result.data) dispatch({ type: "SET_GAME_STATE", apiResponse: result.data });
    else dispatch({ type: "SET_ERROR", error: result.error ?? "Failed to ask question" });
  }, []);

  const answerQuestion = useCallback(async (answer: boolean) => {
    const code = currentCodeRef.current;
    if (!code) return;
    const result = await gameAction(code, 'answer', 'POST', { answer });
    if (result.success && result.data) dispatch({ type: "SET_GAME_STATE", apiResponse: result.data });
    else dispatch({ type: "SET_ERROR", error: result.error ?? "Failed to submit answer" });
  }, []);

  const makeGuess = useCallback(async (word: string) => {
    const code = currentCodeRef.current;
    if (!code) return;
    const result = await gameAction(code, 'guess', 'POST', { word });
    if (result.success && result.data) dispatch({ type: "SET_GAME_STATE", apiResponse: result.data });
    else dispatch({ type: "SET_ERROR", error: result.error ?? "Failed to submit guess" });
  }, []);

  const leaveGame = useCallback(async () => {
    const code = currentCodeRef.current;
    if (code) {
      await gameAction(code, 'player', 'DELETE');
    }
    currentCodeRef.current = null;
    joinedGameCodeRef.current = null;
    setGameSessionId(null);
    dispatch({ type: "RESET" });
  }, []);

  const selectSecretWord = useCallback(async (word: string) => {
    const code = currentCodeRef.current;
    if (!code) return;
    const result = await gameAction(code, 'select-word', 'POST', { word });
    if (result.success && result.data) dispatch({ type: "SET_GAME_STATE", apiResponse: result.data });
    else dispatch({ type: "SET_ERROR", error: result.error ?? "Failed to select word" });
  }, []);

  const endTurn = useCallback(async () => {
    const code = currentCodeRef.current;
    if (!code) return;
    const result = await gameAction(code, 'end-turn', 'POST');
    if (result.success && result.data) dispatch({ type: "SET_GAME_STATE", apiResponse: result.data });
    else dispatch({ type: "SET_ERROR", error: result.error ?? "Failed to end turn" });
  }, []);

  const updatePlayerName = useCallback(async (_playerIndex: number, playerName: string) => {
    const code = currentCodeRef.current;
    if (!code) return;
    const result = await gameAction(code, 'player', 'PATCH', { name: playerName });
    if (result.success && result.data) dispatch({ type: "SET_GAME_STATE", apiResponse: result.data });
    else dispatch({ type: "SET_ERROR", error: result.error ?? "Failed to update name" });
  }, []);

  const setSecretWordHidden = useCallback((hidden: boolean) => {
    dispatch({ type: "SET_SECRET_WORD_HIDDEN", hidden });
  }, []);

  const value: GameContextValue = {
    ...state,
    gameSessionId,
    dispatch,
    joinGame,
    flipCard,
    askQuestion,
    answerQuestion,
    makeGuess,
    leaveGame,
    selectSecretWord,
    endTurn,
    updatePlayerName,
    setSecretWordHidden,
    joinedGameCodeRef,
    refreshGameState,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
}
