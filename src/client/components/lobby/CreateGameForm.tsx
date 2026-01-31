import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@client/lib/api";
import type { GameConfig } from "@shared/types";

type ToggleKey =
  | "isLocalMode"
  | "showOnlyLastQuestion"
  | "randomSecretWords"
  | "sharedComputerMode";

type ToggleState = Record<ToggleKey, boolean>;

const toggleDependencies: Partial<
  Record<ToggleKey, { disabledWhen: (state: ToggleState) => boolean; reason: string }>
> = {
  showOnlyLastQuestion: {
    disabledWhen: (state) => state.isLocalMode || state.sharedComputerMode,
    reason: "Unavailable in local or shared computer mode.",
  },
};

export function CreateGameForm() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [showOnlyLastQuestion, setShowOnlyLastQuestion] = useState(false);
  const [randomSecretWords, setRandomSecretWords] = useState(false);
  const [sharedComputerMode, setSharedComputerMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleState: ToggleState = {
    isLocalMode,
    showOnlyLastQuestion,
    randomSecretWords,
    sharedComputerMode,
  };

  const toggleSetters: Record<ToggleKey, Dispatch<SetStateAction<boolean>>> = {
    isLocalMode: setIsLocalMode,
    showOnlyLastQuestion: setShowOnlyLastQuestion,
    randomSecretWords: setRandomSecretWords,
    sharedComputerMode: setSharedComputerMode,
  };

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

  const isToggleDisabled = (key: ToggleKey) => {
    const rule = toggleDependencies[key];
    return rule ? rule.disabledWhen(toggleState) : false;
  };

  const getToggleReason = (key: ToggleKey) => toggleDependencies[key]?.reason;

  useEffect(() => {
    (Object.keys(toggleDependencies) as ToggleKey[]).forEach((key) => {
      if (isToggleDisabled(key) && toggleState[key]) {
        toggleSetters[key](false);
      }
    });
  }, [isLocalMode, showOnlyLastQuestion, randomSecretWords, sharedComputerMode]);

  const showOnlyLastQuestionDisabled = isToggleDisabled("showOnlyLastQuestion");
  const showOnlyLastQuestionReason = getToggleReason("showOnlyLastQuestion");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig || !playerName.trim()) return;

    setLoading(true);
    setError(null);

    const response = await api.games.create({
      configId: selectedConfig,
      isLocalMode,
      showOnlyLastQuestion: showOnlyLastQuestionDisabled ? false : showOnlyLastQuestion,
      randomSecretWords,
      sharedComputerMode,
    });

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

      <div className="mb-4">
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

      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isLocalMode}
            onChange={(e) => setIsLocalMode(e.target.checked)}
            className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
          />
          <div>
            <span className="font-ui text-sm text-pencil">Local 2-Player Mode</span>
            <p className="font-ui text-xs text-pencil/60">
              Ask questions in person - only submit word guesses
            </p>
          </div>
        </label>
      </div>

      <div className="mb-4">
        <label
          className={`flex items-center gap-3 ${
            showOnlyLastQuestionDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          }`}
          title={showOnlyLastQuestionDisabled ? showOnlyLastQuestionReason : undefined}
        >
          <input
            type="checkbox"
            checked={showOnlyLastQuestion}
            onChange={(e) => setShowOnlyLastQuestion(e.target.checked)}
            disabled={showOnlyLastQuestionDisabled}
            className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div>
            <span className="font-ui text-sm text-pencil">Show Only Last Question</span>
            <p className="font-ui text-xs text-pencil/60">
              Only display the most recent question in the log
            </p>
          </div>
        </label>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={randomSecretWords}
            onChange={(e) => setRandomSecretWords(e.target.checked)}
            className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
          />
          <div>
            <span className="font-ui text-sm text-pencil">Random Secret Words</span>
            <p className="font-ui text-xs text-pencil/60">
              Automatically assign secret words (otherwise players choose)
            </p>
          </div>
        </label>
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sharedComputerMode}
            onChange={(e) => setSharedComputerMode(e.target.checked)}
            className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
          />
          <div>
            <span className="font-ui text-sm text-pencil">Shared Computer Mode</span>
            <p className="font-ui text-xs text-pencil/60">
              Both players share one computer and pass it between turns
            </p>
          </div>
        </label>
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
