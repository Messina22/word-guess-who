import { useState } from "react";
import { useGameState } from "@client/hooks/useGameState";
import { useGameActions } from "@client/hooks/useGameActions";

export function QuestionPanel() {
  const {
    session,
    pendingQuestion,
    isMyTurn,
    mustAnswer,
    waitingForAnswer,
    opponent,
    lastGuess,
    lastAnswer,
    playerIndex,
  } = useGameState();
  const { askQuestion, answerQuestion, makeGuess } = useGameActions();

  const [question, setQuestion] = useState("");
  const [guessWord, setGuessWord] = useState("");
  const [mode, setMode] = useState<"question" | "guess">("question");

  const isLocalMode = session?.isLocalMode ?? false;

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askQuestion(question.trim());
      setQuestion("");
    }
  };

  const handleMakeGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guessWord.trim()) {
      makeGuess(guessWord.trim());
      setGuessWord("");
      setMode("question");
    }
  };

  // In online mode, handle answering opponent's questions
  if (!isLocalMode && mustAnswer && pendingQuestion) {
    return (
      <div className="paper-card p-4 sm:p-6">
        <h3 className="font-display text-xl text-pencil mb-4">
          {opponent?.name || "Opponent"} asks:
        </h3>
        <p className="text-lg font-ui text-pencil mb-6 p-4 bg-sunshine/20 rounded-lg">
          "{pendingQuestion}"
        </p>
        <p className="text-sm text-pencil/70 mb-4">
          Think about YOUR secret word. Does it match this question?
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => answerQuestion(true)}
            className="btn-secondary flex-1"
          >
            Yes
          </button>
          <button
            onClick={() => answerQuestion(false)}
            className="btn-danger flex-1"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  // In online mode, show waiting for answer state
  if (!isLocalMode && waitingForAnswer && pendingQuestion) {
    return (
      <div className="paper-card p-4 sm:p-6">
        <h3 className="font-display text-xl text-pencil mb-4">You asked:</h3>
        <p className="text-lg font-ui text-pencil mb-4 p-4 bg-crayon-blue/20 rounded-lg">
          "{pendingQuestion}"
        </p>
        <div className="flex items-center gap-2 text-pencil/70">
          <div className="animate-pulse w-2 h-2 bg-grass rounded-full"></div>
          <span>Waiting for {opponent?.name || "opponent"} to answer...</span>
        </div>
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="paper-card p-4 sm:p-6">
        <div className="flex items-center gap-2 text-pencil">
          <div className="animate-pulse w-2 h-2 bg-tangerine rounded-full"></div>
          <span className="font-display text-xl">
            {opponent?.name || "Opponent"}'s turn...
          </span>
        </div>
        {!isLocalMode && lastAnswer !== null && (
          <div className="mt-4 p-3 bg-crayon-blue/10 rounded-lg">
            <p className="text-sm text-pencil">
              {opponent?.name || "They"} answered:{" "}
              <strong>{lastAnswer ? "Yes" : "No"}</strong>
            </p>
          </div>
        )}
        {lastGuess && lastGuess.playerIndex !== playerIndex && (
          <div className="mt-4 p-3 bg-paper-red/10 rounded-lg">
            <p className="text-sm text-pencil">
              {opponent?.name} guessed "{lastGuess.word}" -{" "}
              {lastGuess.correct ? "Correct!" : "Wrong!"}
            </p>
          </div>
        )}
        {isLocalMode && (
          <p className="mt-4 text-sm text-pencil/60">
            Ask questions in person, then submit your guess when ready.
          </p>
        )}
      </div>
    );
  }

  // Local mode: only show guess form (questions asked in person)
  if (isLocalMode) {
    return (
      <div className="paper-card p-4 sm:p-6">
        <div className="mb-4 p-3 bg-sunshine/20 rounded-lg">
          <p className="text-sm text-pencil">
            <strong>Local Mode:</strong> Ask questions in person, then submit your guess to win!
          </p>
        </div>

        <form onSubmit={handleMakeGuess}>
          <label
            htmlFor="guess-input"
            className="block font-display text-lg text-pencil mb-2"
          >
            Guess the secret word:
          </label>
          <input
            id="guess-input"
            type="text"
            value={guessWord}
            onChange={(e) => setGuessWord(e.target.value)}
            placeholder="Enter your guess..."
            className="input-field mb-4"
          />
          <button
            type="submit"
            disabled={!guessWord.trim()}
            className="btn-primary w-full bg-grape hover:bg-grape/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Make Guess
          </button>
          <p className="text-xs text-pencil/60 mt-2 text-center">
            Warning: Wrong guesses end your turn!
          </p>
        </form>

        {lastGuess && lastGuess.playerIndex === playerIndex && (
          <div
            className={`mt-4 p-3 rounded-lg ${lastGuess.correct ? "bg-grass/20" : "bg-paper-red/10"}`}
          >
            <p className="text-sm text-pencil">
              You guessed "{lastGuess.word}" -{" "}
              {lastGuess.correct ? "Correct!" : "Wrong!"}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Online mode: show question/guess tabs
  return (
    <div className="paper-card p-4 sm:p-6">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("question")}
          className={`flex-1 py-2 px-4 rounded-lg font-ui font-semibold transition-colors ${
            mode === "question"
              ? "bg-crayon-blue text-white"
              : "bg-kraft/50 text-pencil hover:bg-kraft"
          }`}
        >
          Ask Question
        </button>
        <button
          onClick={() => setMode("guess")}
          className={`flex-1 py-2 px-4 rounded-lg font-ui font-semibold transition-colors ${
            mode === "guess"
              ? "bg-grape text-white"
              : "bg-kraft/50 text-pencil hover:bg-kraft"
          }`}
        >
          Make Guess
        </button>
      </div>

      {mode === "question" ? (
        <form onSubmit={handleAskQuestion}>
          <label
            htmlFor="question-input"
            className="block font-display text-lg text-pencil mb-2"
          >
            Ask a yes/no question:
          </label>
          <input
            id="question-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Does your word start with 'S'?"
            className="input-field mb-4"
          />
          <button
            type="submit"
            disabled={!question.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Ask Question
          </button>
        </form>
      ) : (
        <form onSubmit={handleMakeGuess}>
          <label
            htmlFor="guess-input"
            className="block font-display text-lg text-pencil mb-2"
          >
            Guess the secret word:
          </label>
          <input
            id="guess-input"
            type="text"
            value={guessWord}
            onChange={(e) => setGuessWord(e.target.value)}
            placeholder="Enter your guess..."
            className="input-field mb-4"
          />
          <button
            type="submit"
            disabled={!guessWord.trim()}
            className="btn-primary w-full bg-grape hover:bg-grape/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Make Guess
          </button>
          <p className="text-xs text-pencil/60 mt-2 text-center">
            Warning: Wrong guesses end your turn!
          </p>
        </form>
      )}

      {lastGuess && lastGuess.playerIndex === playerIndex && (
        <div
          className={`mt-4 p-3 rounded-lg ${lastGuess.correct ? "bg-grass/20" : "bg-paper-red/10"}`}
        >
          <p className="text-sm text-pencil">
            You guessed "{lastGuess.word}" -{" "}
            {lastGuess.correct ? "Correct!" : "Wrong!"}
          </p>
        </div>
      )}
    </div>
  );
}
