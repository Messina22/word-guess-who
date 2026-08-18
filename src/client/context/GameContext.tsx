import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { wsClient } from "@client/lib/websocket";
import type {
  ServerMessage,
  CardState,
  PublicGameSession,
  ClientMessage,
} from "@shared/types";

/** An entry in the question history log */
export interface QuestionLogEntry {
  question: string;
  answer: boolean | null; // null if not yet answered
  askerIndex: number;
}

interface GameContextState {
  connected: boolean;
  session: PublicGameSession | null;
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
  /** Last yes/no answer (so the asker can see what the opponent answered) */
  lastAnswer: boolean | null;
  error: string | null;
  revealedSecrets: [string, string] | null;
  /** History of all questions asked and their answers */
  questionHistory: QuestionLogEntry[];
  /** Whether the player has selected their secret word (selecting phase) */
  hasSelectedWord: boolean;
  /** Whether the opponent has selected their secret word (selecting phase) */
  opponentHasSelected: boolean;
  /** Whether to hide the secret word indicator (for shared computer mode privacy) */
  secretWordHidden: boolean;
}

type GameAction =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
  | { type: "HANDLE_MESSAGE"; message: ServerMessage }
  | { type: "SET_SECRET_WORD_HIDDEN"; hidden: boolean };

const initialState: GameContextState = {
  connected: false,
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

function gameReducer(
  state: GameContextState,
  action: GameAction,
): GameContextState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, connected: true };

    case "DISCONNECTED":
      return { ...state, connected: false };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    case "RESET":
      return { ...initialState, connected: state.connected };

    case "SET_SECRET_WORD_HIDDEN":
      return { ...state, secretWordHidden: action.hidden };

    case "HANDLE_MESSAGE": {
      const message = action.message;

      switch (message.type) {
        case "error":
          return { ...state, error: message.message };

        case "game_state":
          return {
            ...state,
            session: message.session,
            playerIndex: message.playerIndex,
            cards: message.cards,
            myFlippedCards: message.myFlippedCards,
            opponentFlippedCards: message.opponentFlippedCards,
            currentTurn: message.currentTurn,
            pendingQuestion: message.pendingQuestion,
            awaitingAnswer: message.awaitingAnswer,
            winner: message.winner,
            mySecretWord: message.mySecretWord,
            lastAnswer: null,
            error: null,
            // Reset question history on new game (or could preserve for reconnect)
            questionHistory: [],
            hasSelectedWord: message.hasSelectedWord ?? false,
            opponentHasSelected: message.opponentHasSelected ?? false,
            // Auto-hide secret word in shared computer mode for privacy
            secretWordHidden: message.session.sharedComputerMode ?? state.secretWordHidden,
          };

        case "player_joined":
          if (!state.session) return state;
          return {
            ...state,
            session: {
              ...state.session,
              players: [
                ...state.session.players,
                {
                  id: "",
                  name: message.playerName,
                  connected: true,
                },
              ],
            },
          };

        case "player_left":
          if (!state.session) return state;
          return {
            ...state,
            session: {
              ...state.session,
              players: state.session.players.map((p, i) =>
                i === message.playerIndex ? { ...p, connected: false } : p,
              ),
            },
          };

        case "player_reconnected":
          if (!state.session) return state;
          return {
            ...state,
            session: {
              ...state.session,
              players: state.session.players.map((p, i) =>
                i === message.playerIndex ? { ...p, connected: true } : p,
              ),
            },
          };

        case "player_name_updated":
          if (!state.session) return state;
          return {
            ...state,
            session: {
              ...state.session,
              players: state.session.players.map((player, index) =>
                index === message.playerIndex
                  ? { ...player, name: message.playerName }
                  : player
              ),
            },
          };

        case "card_flipped": {
          const isMyFlip = message.playerIndex === state.playerIndex;
          const toggleInList = (list: number[], index: number) =>
            list.includes(index)
              ? list.filter((i) => i !== index)
              : [...list, index];
          return {
            ...state,
            myFlippedCards: isMyFlip
              ? toggleInList(state.myFlippedCards, message.cardIndex)
              : state.myFlippedCards,
            opponentFlippedCards: !isMyFlip
              ? toggleInList(state.opponentFlippedCards, message.cardIndex)
              : state.opponentFlippedCards,
          };
        }

        case "question_asked":
          return {
            ...state,
            pendingQuestion: message.question,
            awaitingAnswer: true,
            lastAnswer: null,
            // Add the new question to history (answer is null until answered)
            questionHistory: [
              ...state.questionHistory,
              {
                question: message.question,
                answer: null,
                askerIndex: message.playerIndex,
              },
            ],
          };

        case "question_answered": {
          // Update the last question in history with the answer
          const updatedHistory = [...state.questionHistory];
          if (updatedHistory.length > 0) {
            const lastEntry = updatedHistory[updatedHistory.length - 1];
            updatedHistory[updatedHistory.length - 1] = {
              ...lastEntry,
              answer: message.answer,
            };
          }
          return {
            ...state,
            pendingQuestion: null,
            awaitingAnswer: false,
            currentTurn: state.currentTurn === 0 ? 1 : 0,
            lastAnswer: message.answer,
            questionHistory: updatedHistory,
          };
        }

        case "guess_made":
          return {
            ...state,
            lastGuess: {
              word: message.word,
              correct: message.correct,
              playerIndex: message.playerIndex,
            },
            currentTurn: message.correct
              ? state.currentTurn
              : state.currentTurn === 0
                ? 1
                : 0,
          };

        case "game_over":
          return {
            ...state,
            winner: message.winnerIndex,
            revealedSecrets: message.secretWords,
            session: state.session
              ? { ...state.session, phase: "finished" }
              : null,
          };

        case "game_expired":
          return {
            ...initialState,
            connected: state.connected,
            error: "Game session has expired",
          };

        case "word_selected":
          // Opponent has selected their word (we don't know which one)
          return {
            ...state,
            opponentHasSelected: true,
          };

        case "turn_ended":
          // Turn has ended, update current turn
          return {
            ...state,
            currentTurn: message.nextPlayerIndex,
          };

        default:
          return state;
      }
    }

    default:
      return state;
  }
}

interface GameContextValue extends GameContextState {
  dispatch: React.Dispatch<GameAction>;
  send: (message: ClientMessage) => void;
  joinGame: (gameCode: string, playerName: string, playerId?: string, studentId?: string) => void;
  flipCard: (cardIndex: number) => void;
  askQuestion: (question: string) => void;
  answerQuestion: (answer: boolean) => void;
  makeGuess: (word: string) => void;
  leaveGame: () => void;
  selectSecretWord: (cardIndex: number, forPlayerIndex?: number) => void;
  /** End turn without guessing (pass the device in shared computer mode) */
  endTurn: () => void;
  /** Update a player's display name (shared computer mode) */
  updatePlayerName: (playerIndex: number, playerName: string) => void;
  /** Toggle visibility of the secret word indicator */
  setSecretWordHidden: (hidden: boolean) => void;
  /** Ref set when join_game is sent; used to avoid double-join (e.g. Strict Mode remount) */
  joinedGameCodeRef: React.MutableRefObject<string | null>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const joinedGameCodeRef = useRef<string | null>(null);

  useEffect(() => {
    wsClient.connect();

    const unsubMessage = wsClient.onMessage((message) => {
      dispatch({ type: "HANDLE_MESSAGE", message });
    });

    const unsubConnect = wsClient.onConnect(() => {
      dispatch({ type: "CONNECTED" });
    });

    const unsubDisconnect = wsClient.onDisconnect(() => {
      dispatch({ type: "DISCONNECTED" });
    });

    return () => {
      unsubMessage();
      unsubConnect();
      unsubDisconnect();
      wsClient.disconnect();
    };
  }, []);

  const send = useCallback((message: ClientMessage) => {
    wsClient.send(message);
  }, []);

  const joinGame = useCallback(
    (gameCode: string, playerName: string, playerId?: string, studentId?: string) => {
      joinedGameCodeRef.current = gameCode;
      send({
        type: "join_game",
        gameCode,
        playerName,
        playerId,
        studentId,
      });
    },
    [send],
  );

  const flipCard = useCallback(
    (cardIndex: number) => {
      send({ type: "flip_card", cardIndex });
    },
    [send],
  );

  const askQuestion = useCallback(
    (question: string) => {
      send({ type: "ask_question", question });
    },
    [send],
  );

  const answerQuestion = useCallback(
    (answer: boolean) => {
      send({ type: "answer_question", answer });
    },
    [send],
  );

  const makeGuess = useCallback(
    (word: string) => {
      send({ type: "make_guess", word });
    },
    [send],
  );

  const leaveGame = useCallback(() => {
    joinedGameCodeRef.current = null;
    send({ type: "leave_game" });
    dispatch({ type: "RESET" });
  }, [send]);

  const selectSecretWord = useCallback(
    (cardIndex: number, forPlayerIndex?: number) => {
      send({ type: "select_secret_word", cardIndex, forPlayerIndex });
    },
    [send],
  );

  const endTurn = useCallback(() => {
    send({ type: "end_turn" });
  }, [send]);

  const updatePlayerName = useCallback(
    (playerIndex: number, playerName: string) => {
      send({ type: "update_player_name", playerIndex, playerName });
    },
    [send]
  );

  const setSecretWordHidden = useCallback((hidden: boolean) => {
    dispatch({ type: "SET_SECRET_WORD_HIDDEN", hidden });
  }, []);

  const value: GameContextValue = {
    ...state,
    dispatch,
    send,
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
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
