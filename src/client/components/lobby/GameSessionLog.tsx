import { useSessionGameLog } from "@client/context/SessionGameLogContext";

export function GameSessionLog() {
  const { gameLog } = useSessionGameLog();

  return (
    <div className="paper-card p-6 flex flex-col h-full">
      <h2 className="font-display text-2xl text-pencil mb-4 text-center">
        Session Game Log
      </h2>

      {gameLog.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-pencil/50 text-sm text-center">
            No games played yet in this session.
            <br />
            Your game results will appear here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {gameLog.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                entry.won
                  ? "bg-grass/10 border border-grass/20"
                  : "bg-paper-red/10 border border-paper-red/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{entry.won ? "🏆" : "😔"}</span>
                <span className="font-ui text-sm text-pencil">
                  vs <span className="font-semibold">{entry.opponentName}</span>
                </span>
              </div>
              <span
                className={`font-ui text-sm font-semibold ${
                  entry.won ? "text-grass" : "text-paper-red"
                }`}
              >
                {entry.won ? "Won" : "Lost"}
              </span>
            </div>
          ))}
        </div>
      )}

      {gameLog.length > 0 && (
        <div className="mt-4 pt-3 border-t border-pencil/10">
          <div className="flex justify-between text-sm text-pencil/70">
            <span>
              Total: {gameLog.length} game{gameLog.length !== 1 ? "s" : ""}
            </span>
            <span>
              Wins: {gameLog.filter((g) => g.won).length} | Losses:{" "}
              {gameLog.filter((g) => !g.won).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
