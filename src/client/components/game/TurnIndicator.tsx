import { useGameState } from "@client/hooks/useGameState";

export function TurnIndicator() {
  const { isMyTurn, myPlayer, opponent, mySecretWord, connected } = useGameState();

  return (
    <div className="paper-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div
          className={`w-3 h-3 rounded-full ${
            connected ? "bg-grass" : "bg-paper-red"
          }`}
          title={connected ? "Connected" : "Disconnected"}
        />
        <div className="text-center sm:text-left">
          <p className="text-sm text-pencil/70 font-ui">You are</p>
          <p className="font-display text-xl text-pencil">{myPlayer?.name || "Player"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`px-4 py-2 rounded-full font-ui font-semibold transition-colors ${
            isMyTurn
              ? "bg-grass text-white animate-pulse"
              : "bg-kraft text-pencil"
          }`}
        >
          {isMyTurn ? "Your Turn!" : `${opponent?.name || "Opponent"}'s Turn`}
        </div>
      </div>

      <div className="text-center sm:text-right">
        <p className="text-sm text-pencil/70 font-ui">Your secret word</p>
        <p className="font-word text-xl text-sunshine text-shadow">
          {mySecretWord || "..."}
        </p>
      </div>
    </div>
  );
}
