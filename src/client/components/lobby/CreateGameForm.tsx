import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@client/lib/api";
import { useStudent } from "@client/context/StudentContext";
import { useAuth } from "@client/context/AuthContext";
import type { GameConfig } from "@shared/types";

type GameMode = "online" | "local" | "shared";

const GRADE_ORDER = [
  "grade-prek",
  "grade-k",
  "grade-1",
  "grade-2",
  "grade-3",
  "grade-4",
  "grade-5",
  "default",
];

export function CreateGameForm() {
  const navigate = useNavigate();
  const { student, isStudentAuthenticated } = useStudent();
  const { isAuthenticated: isInstructorAuthenticated } = useAuth();
  const [configs, setConfigs] = useState<GameConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [configsLoading, setConfigsLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [gameMode, setGameMode] = useState<GameMode>("shared");
  const [showOnlyLastQuestion, setShowOnlyLastQuestion] = useState(false);
  const [randomSecretWords, setRandomSecretWords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive API flags from gameMode
  const isLocalMode = gameMode === "local";
  const sharedComputerMode = gameMode === "shared";

  // Show Only Last Question is disabled for local game modes
  const showOnlyLastQuestionDisabled = gameMode !== "online";

  // Fetch configs on mount (passing classId if student is authenticated)
  useEffect(() => {
    let cancelled = false;
    async function fetchConfigs() {
      setConfigsLoading(true);
      const classId =
        isStudentAuthenticated && student ? student.classId : undefined;
      const response = await api.configs.list(classId);
      if (cancelled) return;
      if (response.success && response.data) {
        setConfigs(response.data);
        // Default to first grade-level config
        const defaultConfig = response.data.find((c) => c.id === "grade-prek");
        setSelectedConfigId(defaultConfig?.id ?? response.data[0]?.id ?? "");
      }
      setConfigsLoading(false);
    }
    fetchConfigs();
    return () => {
      cancelled = true;
    };
  }, [isStudentAuthenticated, student]);

  // Reset showOnlyLastQuestion when switching to a local mode
  useEffect(() => {
    if (showOnlyLastQuestionDisabled && showOnlyLastQuestion) {
      setShowOnlyLastQuestion(false);
    }
  }, [gameMode, showOnlyLastQuestionDisabled, showOnlyLastQuestion]);

  const gradeConfigs = configs
    .filter((c) => c.isSystemTemplate)
    .sort(
      (a, b) =>
        (GRADE_ORDER.indexOf(a.id) === -1 ? 999 : GRADE_ORDER.indexOf(a.id)) -
        (GRADE_ORDER.indexOf(b.id) === -1 ? 999 : GRADE_ORDER.indexOf(b.id))
    );

  const customConfigs = configs.filter((c) => !c.isSystemTemplate);

  const selectedConfig = configs.find((c) => c.id === selectedConfigId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfigId || !playerName.trim()) return;

    setLoading(true);
    setError(null);

    const response = await api.games.create({
      configId: selectedConfigId,
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
          htmlFor="wordList"
          className="block font-ui text-sm text-pencil/70 mb-1"
        >
          Word List
        </label>
        {configsLoading ? (
          <p className="text-xs text-pencil/60 mt-2">Loading word lists...</p>
        ) : (
          <select
            id="wordList"
            value={selectedConfigId}
            onChange={(e) => setSelectedConfigId(e.target.value)}
            className="input-field"
          >
            <optgroup label="Grade Level Word Lists">
              {gradeConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                </option>
              ))}
            </optgroup>
            {customConfigs.length > 0 && (
              <optgroup
                label={
                  isInstructorAuthenticated
                    ? "My Configs"
                    : isStudentAuthenticated
                      ? "Class Word Lists"
                      : "Custom Word Lists"
                }
              >
                {customConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}

        {selectedConfig && (
          <div className="mt-2 p-3 bg-grass/10 text-grass rounded-lg text-sm">
            <p className="font-medium">{selectedConfig.name}</p>
            <p className="text-xs opacity-80">
              {selectedConfig.wordBank.length} words |{" "}
              {selectedConfig.suggestedQuestions.length} questions
            </p>
            {selectedConfig.description && (
              <p className="text-xs opacity-70 mt-1">
                {selectedConfig.description}
              </p>
            )}
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
        disabled={loading || !selectedConfigId || !playerName.trim()}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create Game"}
      </button>
    </form>
  );
}
