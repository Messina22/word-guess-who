import { useGameState } from "@client/hooks/useGameState";
import { useGameActions } from "@client/hooks/useGameActions";

export function TurnIndicator() {
  const { isMyTurn, myPlayer, opponent, mySecretWord, connected, secretWordHidden } = useGameState();
  const { setSecretWordHidden } = useGameActions();

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
        <div className="flex items-center gap-2 justify-center sm:justify-end">
          {secretWordHidden ? (
            <p className="font-word text-xl text-pencil/40">
              ******
            </p>
          ) : (
            <p className="font-word text-xl text-sunshine text-shadow">
              {mySecretWord || "..."}
            </p>
          )}
          <button
            onClick={() => setSecretWordHidden(!secretWordHidden)}
            className="p-1 rounded hover:bg-kraft/50 transition-colors"
            title={secretWordHidden ? "Show secret word" : "Hide secret word"}
            aria-label={secretWordHidden ? "Show secret word" : "Hide secret word"}
          >
            {secretWordHidden ? (
              <svg className="w-5 h-5 text-pencil/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-pencil/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
