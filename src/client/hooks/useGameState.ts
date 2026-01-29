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
    error,
    revealedSecrets,
  } = useGame();

  const isMyTurn = playerIndex !== null && currentTurn === playerIndex;
  const isPlaying = session?.phase === "playing";
  const isWaiting = session?.phase === "waiting";
  const isFinished = session?.phase === "finished";
  const iWon = winner !== null && winner === playerIndex;
  const opponentIndex = playerIndex === 0 ? 1 : 0;

  const myPlayer = session?.players[playerIndex ?? 0];
  const opponent = session?.players[opponentIndex];

  const mustAnswer = awaitingAnswer && !isMyTurn;
  const waitingForAnswer = awaitingAnswer && isMyTurn;

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
    error,
    revealedSecrets,
    isMyTurn,
    isPlaying,
    isWaiting,
    isFinished,
    iWon,
    opponentIndex,
    myPlayer,
    opponent,
    mustAnswer,
    waitingForAnswer,
  };
}
