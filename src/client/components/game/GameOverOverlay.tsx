import { useEffect, useState } from "react";
import { useGameState } from "@client/hooks/useGameState";
import { useNavigate } from "react-router-dom";

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  color: string;
}

const CONFETTI_COLORS = [
  "bg-paper-red",
  "bg-crayon-blue",
  "bg-sunshine",
  "bg-grass",
  "bg-grape",
  "bg-tangerine",
];

export function GameOverOverlay() {
  const { winner, iWon, myPlayer, opponent, revealedSecrets, playerIndex } = useGameState();
  const navigate = useNavigate();
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (winner !== null && iWon) {
      const pieces: ConfettiPiece[] = [];
      for (let i = 0; i < 50; i++) {
        pieces.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.5,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        });
      }
      setConfetti(pieces);
    }
  }, [winner, iWon]);

  if (winner === null) return null;

  const winnerName = iWon ? myPlayer?.name : opponent?.name;
  const mySecret = revealedSecrets?.[playerIndex ?? 0];
  const opponentSecret = revealedSecrets?.[playerIndex === 0 ? 1 : 0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {iWon && confetti.map((piece) => (
        <div
          key={piece.id}
          className={`confetti-piece ${piece.color}`}
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            top: "-20px",
          }}
        />
      ))}

      <div className="paper-card p-8 max-w-md w-full text-center animate-bounce-in">
        <div className="text-6xl mb-4">
          {iWon ? "🎉" : "😢"}
        </div>

        <h2 className="font-display text-3xl text-pencil mb-2">
          {iWon ? "You Won!" : "Game Over"}
        </h2>

        <p className="font-ui text-lg text-pencil/80 mb-6">
          {iWon
            ? "Congratulations! You guessed the word!"
            : `${winnerName} guessed your word!`}
        </p>

        <div className="bg-kraft/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-pencil/70 mb-2">The secret words were:</p>
          <div className="flex justify-around">
            <div>
              <p className="text-xs text-pencil/50">{myPlayer?.name}</p>
              <p className="font-word text-xl text-pencil">{mySecret}</p>
            </div>
            <div>
              <p className="text-xs text-pencil/50">{opponent?.name}</p>
              <p className="font-word text-xl text-pencil">{opponentSecret}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="btn-primary w-full"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
