import { useState } from "react";
import { useGameState } from "@client/hooks/useGameState";
import type { QuestionLogEntry } from "@client/context/GameContext";

export function QuestionLog() {
  const { questionHistory, playerIndex, session } = useGameState();
  const [isExpanded, setIsExpanded] = useState(true);

  // Hide in local mode (questions asked in person, not tracked)
  if (session?.isLocalMode) {
    return null;
  }

  // Filter to only show questions asked by the current player
  const myQuestions = questionHistory.filter(
    (entry) => entry.askerIndex === playerIndex
  );

  if (myQuestions.length === 0) {
    return null;
  }

  // Apply the "show only last question" setting
  const showOnlyLastQuestion = session?.showOnlyLastQuestion ?? false;
  const displayedQuestions = showOnlyLastQuestion
    ? myQuestions.slice(-1)
    : myQuestions;

  // Get opponent's name for answer display
  const opponentName =
    session?.players[playerIndex === 0 ? 1 : 0]?.name || "Opponent";

  return (
    <div className="paper-card p-4 sm:p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="font-display text-lg text-pencil">
          Question Log ({displayedQuestions.length}{showOnlyLastQuestion && myQuestions.length > 1 ? ` of ${myQuestions.length}` : ""})
        </h3>
        <span className="text-pencil/60">{isExpanded ? "−" : "+"}</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
          {displayedQuestions.map((entry: QuestionLogEntry, index: number) => (
            <div key={index} className="p-3 rounded-lg bg-crayon-blue/10">
              <p className="text-sm font-ui text-pencil">"{entry.question}"</p>
              <div className="mt-1 text-right">
                {entry.answer !== null ? (
                  <span
                    className={`text-xs font-semibold ${
                      entry.answer ? "text-grass" : "text-paper-red"
                    }`}
                  >
                    {opponentName}: {entry.answer ? "Yes" : "No"}
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
