import { useGameState } from "@client/hooks/useGameState";

interface WaitingRoomProps {
  gameCode: string;
}

export function WaitingRoom({ gameCode }: WaitingRoomProps) {
  const { session, myPlayer, connected } = useGameState();

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = gameCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="paper-card p-8 text-center max-w-md mx-auto">
      <h2 className="font-display text-2xl text-pencil mb-2">
        Waiting for Opponent
      </h2>

      <p className="font-ui text-pencil/70 mb-6">
        Share this code with a friend to start the game!
      </p>

      <div className="bg-kraft/30 rounded-lg p-6 mb-6">
        <p className="text-sm text-pencil/60 mb-2">Game Code</p>
        <div className="flex items-center justify-center gap-4">
          <span className="font-display text-4xl tracking-widest text-pencil">
            {gameCode}
          </span>
          <button
            onClick={copyCode}
            className="p-2 rounded-lg bg-crayon-blue/10 hover:bg-crayon-blue/20 transition-colors"
            title="Copy code"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-crayon-blue"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-pencil/70">
        <div className={`w-2 h-2 rounded-full ${connected ? "bg-grass animate-pulse" : "bg-paper-red"}`} />
        <span className="font-ui">
          {connected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {session?.players && session.players.length > 0 && (
        <div className="mt-6 pt-6 border-t border-kraft">
          <p className="text-sm text-pencil/60 mb-2">Players in lobby:</p>
          <div className="flex justify-center gap-4">
            {session.players.map((player, index) => (
              <div
                key={index}
                className={`px-4 py-2 rounded-lg ${
                  player.name === myPlayer?.name
                    ? "bg-sunshine/30"
                    : "bg-kraft/30"
                }`}
              >
                <span className="font-ui text-pencil">{player.name}</span>
                {player.name === myPlayer?.name && (
                  <span className="text-xs text-pencil/50 ml-1">(you)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-tangerine rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-tangerine rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-tangerine rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
