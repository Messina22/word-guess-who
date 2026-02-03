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
  timestamp: Date;
}

interface SessionGameLogContextValue {
  /** List of games played in this session */
  gameLog: GameLogEntry[];
  /** Add a game result to the log */
  addGameResult: (opponentName: string, won: boolean) => void;
  /** Clear all game results */
  clearLog: () => void;
}

const SessionGameLogContext = createContext<SessionGameLogContextValue | null>(
  null
);

export function SessionGameLogProvider({ children }: { children: ReactNode }) {
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);

  const addGameResult = useCallback((opponentName: string, won: boolean) => {
    const entry: GameLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      opponentName,
      won,
      timestamp: new Date(),
    };
    setGameLog((prev) => [...prev, entry]);
  }, []);

  const clearLog = useCallback(() => {
    setGameLog([]);
  }, []);

  const value: SessionGameLogContextValue = {
    gameLog,
    addGameResult,
    clearLog,
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
      "useSessionGameLog must be used within a SessionGameLogProvider"
    );
  }
  return context;
}
