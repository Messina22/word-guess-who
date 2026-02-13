import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@client/lib/api";
import { useStudent } from "@client/context/StudentContext";
import type { GameConfig } from "@shared/types";

type GameMode = "online" | "local" | "shared";

export function CreateGameForm() {
  const navigate = useNavigate();
  const { student, isStudentAuthenticated } = useStudent();
  const [configCode, setConfigCode] = useState("");
  const [configLookup, setConfigLookup] = useState<{
    loading: boolean;
    config: GameConfig | null;
    error: string | null;
  }>({ loading: false, config: null, error: null });
  const [playerName, setPlayerName] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("shared");
  const [showOnlyLastQuestion, setShowOnlyLastQuestion] = useState(false);
  const [randomSecretWords, setRandomSecretWords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track request freshness to ignore stale responses
  const requestIdRef = useRef(0);

  // Derive API flags from gameMode
  const isLocalMode = gameMode === "local";
  const sharedComputerMode = gameMode === "shared";

  // Show Only Last Question is disabled for local game modes
  const showOnlyLastQuestionDisabled = gameMode !== "online";

  // Debounced config lookup - uses "default" if code is empty
  const lookupConfig = useCallback(async (code: string) => {
    const codeToLookup = code.trim().toLowerCase() || "default";

    // Increment request ID and capture it for this request
    const currentRequestId = ++requestIdRef.current;

    setConfigLookup({ loading: true, config: null, error: null });

    const response = await api.configs.get(codeToLookup);

    // Ignore stale responses
    if (currentRequestId !== requestIdRef.current) {
      return;
    }

    if (response.success && response.data) {
      setConfigLookup({ loading: false, config: response.data, error: null });
    } else {
      setConfigLookup({
        loading: false,
        config: null,
        error: response.error || "Config not found",
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      lookupConfig(configCode);
    }, 300);

    return () => clearTimeout(timer);
  }, [configCode, lookupConfig]);

  // Reset showOnlyLastQuestion when switching to a local mode
  useEffect(() => {
    if (showOnlyLastQuestionDisabled && showOnlyLastQuestion) {
      setShowOnlyLastQuestion(false);
    }
  }, [gameMode, showOnlyLastQuestionDisabled, showOnlyLastQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configLookup.config || !playerName.trim()) return;

    setLoading(true);
    setError(null);

    const response = await api.games.create({
      configId: configLookup.config.id,
      isLocalMode,
      showOnlyLastQuestion: showOnlyLastQuestionDisabled
        ? false
        : showOnlyLastQuestion,
      randomSecretWords,
      sharedComputerMode,
      ...(isStudentAuthenticated && student
        ? { classId: student.classId, studentId: student.id }
        : {}),
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
        <label
          htmlFor="playerName"
          className="block font-ui text-sm text-pencil/70 mb-1"
        >
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
        <label
          htmlFor="configCode"
          className="block font-ui text-sm text-pencil/70 mb-1"
        >
          Config Code
        </label>
        <input
          id="configCode"
          type="text"
          value={configCode}
          onChange={(e) => setConfigCode(e.target.value)}
          placeholder="Leave blank for default"
          className="input-field"
        />
        <p className="text-xs text-pencil/60 mt-1">
          Leave blank to use the built-in word set, or enter a code from your
          instructor.
        </p>

        {configLookup.loading && (
          <p className="text-xs text-pencil/60 mt-2">Looking up config...</p>
        )}

        {configLookup.config && (
          <div className="mt-2 p-3 bg-grass/10 text-grass rounded-lg text-sm">
            <p className="font-medium">{configLookup.config.name}</p>
            <p className="text-xs opacity-80">
              {configLookup.config.wordBank.length} words |{" "}
              {configLookup.config.suggestedQuestions.length} questions
            </p>
          </div>
        )}

        {configLookup.error && !configLookup.loading && (
          <div className="mt-2 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
            {configLookup.error}
          </div>
        )}
      </div>

      {/* Game Mode Section */}
      <fieldset className="mb-4">
        <legend className="block font-ui text-sm text-pencil/70 mb-2">
          Game Mode
        </legend>
        <div className="space-y-3 pl-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="gameMode"
              value="shared"
              checked={gameMode === "shared"}
              onChange={() => setGameMode("shared")}
              className="w-5 h-5 border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
            />
            <div>
              <span className="font-ui text-sm text-pencil">
                Shared Computer Mode
              </span>
              <p className="font-ui text-xs text-pencil/60">
                Both players share one computer and pass it between turns
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="gameMode"
              value="local"
              checked={gameMode === "local"}
              onChange={() => setGameMode("local")}
              className="w-5 h-5 border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
            />
            <div>
              <span className="font-ui text-sm text-pencil">
                Local 2-Player Mode
              </span>
              <p className="font-ui text-xs text-pencil/60">
                Ask questions in person - only submit word guesses
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="gameMode"
              value="online"
              checked={gameMode === "online"}
              onChange={() => setGameMode("online")}
              className="w-5 h-5 border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
            />
            <div>
              <span className="font-ui text-sm text-pencil">Online Mode</span>
              <p className="font-ui text-xs text-pencil/60">
                Play online with another player on their own device
              </p>
            </div>
          </label>
        </div>
      </fieldset>

      {/* Additional Settings Section */}
      <fieldset className="mb-6">
        <legend className="block font-ui text-sm text-pencil/70 mb-2">
          Additional Settings
        </legend>
        <div className="space-y-3 pl-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={randomSecretWords}
              onChange={(e) => setRandomSecretWords(e.target.checked)}
              className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue"
            />
            <div>
              <span className="font-ui text-sm text-pencil">
                Random Secret Words
              </span>
              <p className="font-ui text-xs text-pencil/60">
                Automatically assign secret words (otherwise players choose)
              </p>
            </div>
          </label>

          <label
            className={`flex items-center gap-3 ${
              showOnlyLastQuestionDisabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            }`}
            title={
              showOnlyLastQuestionDisabled
                ? "Unavailable in local or shared computer mode"
                : undefined
            }
          >
            <input
              type="checkbox"
              checked={showOnlyLastQuestion}
              onChange={(e) => setShowOnlyLastQuestion(e.target.checked)}
              disabled={showOnlyLastQuestionDisabled}
              className="w-5 h-5 rounded border-pencil/30 text-crayon-blue focus:ring-crayon-blue disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div>
              <span className="font-ui text-sm text-pencil">
                Show Only Last Question
              </span>
              <p className="font-ui text-xs text-pencil/60">
                Only display the most recent question in the log
              </p>
            </div>
          </label>
        </div>
      </fieldset>

      {error && (
        <div className="mb-4 p-3 bg-paper-red/10 text-paper-red rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !configLookup.config || !playerName.trim()}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create Game"}
      </button>
    </form>
  );
}
