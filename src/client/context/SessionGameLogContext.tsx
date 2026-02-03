import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/** A single game result entry in the session log */
export interface GameLogEntry {
  id: string;
  opponentName: string;
  won: boolean;
}

interface SessionGameLogContextValue {
  /** List of games played in this session */
  gameLog: GameLogEntry[];
  /** Add a game result to the log */
  addGameResult: (opponentName: string, won: boolean) => void;
  /** Set of game codes that have been recorded */
  recordedGameCodes: Set<string>;
  /** Mark a game code as recorded */
  markGameRecorded: (code: string) => void;
}

const SessionGameLogContext = createContext<SessionGameLogContextValue | null>(
  null,
);

export function SessionGameLogProvider({ children }: { children: ReactNode }) {
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const [recordedGameCodes, setRecordedGameCodes] = useState<Set<string>>(
    () => new Set(),
  );

  const addGameResult = useCallback((opponentName: string, won: boolean) => {
    const entry: GameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      opponentName,
      won,
    };
    setGameLog((prev) => [...prev, entry]);
  }, []);

  const markGameRecorded = useCallback((code: string) => {
    setRecordedGameCodes((prev) => new Set(prev).add(code));
  }, []);

  const value: SessionGameLogContextValue = {
    gameLog,
    addGameResult,
    recordedGameCodes,
    markGameRecorded,
  };

  return (
    <SessionGameLogContext.Provider value={value}>
      {children}
    </SessionGameLogContext.Provider>
  );
}

export function useSessionGameLog(): SessionGameLogContextValue {
  const context = useContext(SessionGameLogContext);
  if (!context) {
    throw new Error(
      "useSessionGameLog must be used within a SessionGameLogProvider",
    );
  }
  return context;
}
