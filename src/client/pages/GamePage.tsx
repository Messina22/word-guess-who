import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameState } from "@client/hooks/useGameState";
import { useGameActions } from "@client/hooks/useGameActions";
import { GameBoard } from "@client/components/game/GameBoard";
import { QuestionPanel } from "@client/components/game/QuestionPanel";
import { TurnIndicator } from "@client/components/game/TurnIndicator";
import { GameOverOverlay } from "@client/components/game/GameOverOverlay";
import { WaitingRoom } from "@client/components/lobby/WaitingRoom";

export function GamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { session, connected, error, isWaiting, isFinished } =
    useGameState();
  const { joinGame, leaveGame, clearError } = useGameActions();
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (!code) {
      navigate("/");
      return;
    }

    const playerName = localStorage.getItem("playerName");
    if (!playerName) {
      navigate("/");
      return;
    }

    if (connected && !hasJoined) {
      const savedPlayerId = localStorage.getItem(`playerId_${code}`);
      joinGame(code, playerName, savedPlayerId || undefined);
      setHasJoined(true);
    }
  }, [code, connected, hasJoined, joinGame, navigate]);

  useEffect(() => {
    if (session && code) {
      const myPlayer = session.players.find(
        (p) => p.name === localStorage.getItem("playerName")
      );
      if (myPlayer) {
        localStorage.setItem(`playerId_${code}`, myPlayer.id);
      }
    }
  }, [session, code]);

  const handleLeave = () => {
    leaveGame();
    if (code) {
      localStorage.removeItem(`playerId_${code}`);
    }
    navigate("/");
  };

  if (!code) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="paper-card p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😕</div>
          <h2 className="font-display text-2xl text-pencil mb-2">Oops!</h2>
          <p className="font-ui text-pencil/70 mb-6">{error}</p>
          <button onClick={() => { clearError(); navigate("/"); }} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="paper-card p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 bg-tangerine rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-tangerine rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-tangerine rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="font-display text-xl text-pencil">Connecting...</p>
        </div>
      </div>
    );
  }

  if (isWaiting || !session || session.phase === "waiting") {
    return (
      <div className="min-h-screen p-4 flex flex-col">
        <header className="text-center mb-8">
          <h1 className="font-display text-3xl text-pencil text-shadow">
            Sight Word Guess Who
          </h1>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <WaitingRoom gameCode={code} />
        </main>
        <footer className="text-center mt-8">
          <button onClick={handleLeave} className="text-pencil/50 hover:text-pencil underline">
            Leave Game
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-pencil text-shadow">
          Sight Word Guess Who
        </h1>
        <button onClick={handleLeave} className="text-sm text-pencil/50 hover:text-pencil underline">
          Leave
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-4">
        <TurnIndicator />

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <GameBoard />
          </div>
          <div>
            <QuestionPanel />
          </div>
        </div>
      </main>

      {isFinished && <GameOverOverlay />}
    </div>
  );
}
