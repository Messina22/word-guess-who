import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface JoinGameFormProps {
  idPrefix?: string;
}

export function JoinGameForm({ idPrefix = "" }: JoinGameFormProps) {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("playerName") || "",
  );

  const playerNameId = `${idPrefix}joinPlayerName`;
  const gameCodeId = `${idPrefix}gameCode`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameCode.trim() || !playerName.trim()) return;

    localStorage.setItem("playerName", playerName.trim());
    navigate(`/game/${gameCode.trim().toUpperCase()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="paper-card p-6">
      <h2 className="font-display text-2xl text-pencil mb-6 text-center">
        Join a Game
      </h2>

      <div className="mb-4">
        <label
          htmlFor={playerNameId}
          className="block font-ui text-sm text-pencil/70 mb-1"
        >
          Your Name
        </label>
        <input
          id={playerNameId}
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="input-field"
          required
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor={gameCodeId}
          className="block font-ui text-sm text-pencil/70 mb-1"
        >
          Game Code
        </label>
        <input
          id={gameCodeId}
          type="text"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value.toUpperCase())}
          placeholder="Enter game code"
          className="input-field text-center text-2xl font-display tracking-widest uppercase"
          maxLength={6}
          required
        />
      </div>

      <button
        type="submit"
        disabled={!gameCode.trim() || !playerName.trim()}
        className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Join Game
      </button>
    </form>
  );
}
