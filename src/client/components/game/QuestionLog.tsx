import { useState } from "react";
import { useGameState } from "@client/hooks/useGameState";
import type { QuestionLogEntry } from "@client/context/GameContext";

export function QuestionLog() {
  const { questionHistory, playerIndex, session } = useGameState();
  const [isExpanded, setIsExpanded] = useState(true);

  if (questionHistory.length === 0) {
    return null;
  }

  const getPlayerName = (askerIndex: number): string => {
    if (askerIndex === playerIndex) {
      return "You";
    }
    return session?.players[askerIndex]?.name || "Opponent";
  };

  return (
    <div className="paper-card p-4 sm:p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="font-display text-lg text-pencil">
          Question Log ({questionHistory.length})
        </h3>
        <span className="text-pencil/60">{isExpanded ? "−" : "+"}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
          {questionHistory.map((entry: QuestionLogEntry, index: number) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                entry.askerIndex === playerIndex
                  ? "bg-crayon-blue/10"
                  : "bg-sunshine/20"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-ui text-pencil/60 whitespace-nowrap">
                  {getPlayerName(entry.askerIndex)}:
                </span>
                <p className="text-sm font-ui text-pencil flex-1">
                  "{entry.question}"
                </p>
              </div>
              <div className="mt-1 text-right">
                {entry.answer !== null ? (
                  <span
                    className={`text-xs font-semibold ${
                      entry.answer ? "text-grass" : "text-paper-red"
                    }`}
                  >
                    {entry.answer ? "Yes" : "No"}
                  </span>
                ) : (
                  <span className="text-xs text-pencil/50 italic">
                    Waiting...
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
