import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@client/lib/api";
import type { GameConfig } from "@shared/types";

export function CreateGameForm() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.configs.list().then((response) => {
      if (response.success && response.data) {
        setConfigs(response.data);
        if (response.data.length > 0) {
          setSelectedConfig(response.data[0].id);
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig || !playerName.trim()) return;

    setLoading(true);
    setError(null);

    const response = await api.games.create({ configId: selectedConfig });

    if (response.success && response.data) {
      localStorage.setItem("playerName", playerName.trim());
      navigate(`/game/${response.data.code}`);
    } else {
      setError(response.error || "Failed to create game");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="paper-card p-6">
      <h2 className="font-display text-2xl text-pencil mb-6 text-center">
        Create a New Game
      </h2>

      <div className="mb-4">
        <label htmlFor="playerName" className="block font-ui text-sm text-pencil/70 mb-1">
          Your Name
        </label>
        <input
          id="playerName"
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          className="input-field"
          required
        />
      </div>

      <div className="mb-6">
        <label htmlFor="config" className="block font-ui text-sm text-pencil/70 mb-1">
          Word Set
        </label>
        <select
          id="config"
          value={selectedConfig}
          onChange={(e) => setSelectedConfig(e.target.value)}
          className="input-field"
          required
        >
          {configs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.name} ({config.wordBank.length} words)
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !selectedConfig || !playerName.trim()}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create Game"}
      </button>
    </form>
  );
}
