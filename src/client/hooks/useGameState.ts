import { useGame } from "@client/context/GameContext";

export function useGameState() {
  const {
    connected,
    session,
    playerIndex,
    cards,
    myFlippedCards,
    opponentFlippedCards,
    currentTurn,
    pendingQuestion,
    awaitingAnswer,
    winner,
    mySecretWord,
    lastGuess,
    lastAnswer,
    error,
    revealedSecrets,
    questionHistory,
    hasSelectedWord,
    opponentHasSelected,
    secretWordHidden,
  } = useGame();

  const isMyTurn = playerIndex !== null && currentTurn === playerIndex;
  const isPlaying = session?.phase === "playing";
  const isWaiting = session?.phase === "waiting";
  const isSelecting = session?.phase === "selecting";
  const isFinished = session?.phase === "finished";
  const iWon = winner !== null && winner === playerIndex;
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  const myPlayer = session?.players[playerIndex ?? 0];
  const opponent = session?.players[opponentIndex];

  const mustAnswer = awaitingAnswer && !isMyTurn;
  const waitingForAnswer = awaitingAnswer && isMyTurn;

  // Shared computer mode
  const sharedComputerMode = session?.sharedComputerMode ?? false;

  return {
    connected,
    session,
    playerIndex,
    cards,
    myFlippedCards,
    opponentFlippedCards,
    currentTurn,
    pendingQuestion,
    awaitingAnswer,
    winner,
    mySecretWord,
    lastGuess,
    lastAnswer,
    error,
    revealedSecrets,
    questionHistory,
    hasSelectedWord,
    opponentHasSelected,
    secretWordHidden,
    isMyTurn,
    isPlaying,
    isWaiting,
    isSelecting,
    isFinished,
    iWon,
    opponentIndex,
    myPlayer,
    opponent,
    mustAnswer,
    waitingForAnswer,
    // Shared computer mode
    sharedComputerMode,
  };
}
