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
  error: string | null;
  revealedSecrets: [string, string] | null;
}

type GameAction =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
  | { type: "HANDLE_MESSAGE"; message: ServerMessage };

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
  error: null,
  revealedSecrets: null,
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
            error: null,
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

        case "card_flipped": {
          const isMyFlip = message.playerIndex === state.playerIndex;
          return {
            ...state,
            myFlippedCards: isMyFlip
              ? [...state.myFlippedCards, message.cardIndex]
              : state.myFlippedCards,
            opponentFlippedCards: !isMyFlip
              ? [...state.opponentFlippedCards, message.cardIndex]
              : state.opponentFlippedCards,
          };
        }

        case "question_asked":
          return {
            ...state,
            pendingQuestion: message.question,
            awaitingAnswer: true,
          };

        case "question_answered":
          return {
            ...state,
            pendingQuestion: null,
            awaitingAnswer: false,
            currentTurn: state.currentTurn === 0 ? 1 : 0,
          };

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
  joinGame: (gameCode: string, playerName: string, playerId?: string) => void;
  flipCard: (cardIndex: number) => void;
  askQuestion: (question: string) => void;
  answerQuestion: (answer: boolean) => void;
  makeGuess: (word: string) => void;
  leaveGame: () => void;
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
    (gameCode: string, playerName: string, playerId?: string) => {
      joinedGameCodeRef.current = gameCode;
      send({
        type: "join_game",
        gameCode,
        playerName,
        playerId,
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
