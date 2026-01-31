import { useGameState } from "@client/hooks/useGameState";
import { useGameActions } from "@client/hooks/useGameActions";

export function ComputerPassScreen() {
  const { canClaimComputer, currentTurn, session, playerIndex } = useGameState();
  const { claimComputer } = useGameActions();

  const currentTurnPlayer = session?.players[currentTurn];
  const isMyTurn = currentTurn === playerIndex;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="paper-card p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-tangerine/20 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-tangerine"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-pencil mb-2">
            Pass the Computer
          </h2>
        </div>

        {canClaimComputer ? (
          <>
            <p className="font-ui text-pencil/70 mb-6">
              It's your turn, <span className="font-semibold text-pencil">{currentTurnPlayer?.name}</span>!
              <br />
              Make sure the other player can't see the screen, then tap the button below.
            </p>
            <button
              onClick={claimComputer}
              className="btn-primary w-full text-lg py-4"
            >
              I'm Ready - Start My Turn
            </button>
          </>
        ) : (
          <>
            <p className="font-ui text-pencil/70 mb-6">
              {isMyTurn ? (
                <>Waiting for you to claim the computer...</>
              ) : (
                <>
                  Please pass the computer to{" "}
                  <span className="font-semibold text-pencil">{currentTurnPlayer?.name}</span>
                </>
              )}
            </p>
            <div className="flex items-center justify-center gap-2">
              <div
                className="w-3 h-3 bg-tangerine rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-3 h-3 bg-tangerine rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-3 h-3 bg-tangerine rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
