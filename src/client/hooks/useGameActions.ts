import { useGame } from "@client/context/GameContext";

export function useGameActions() {
  const {
    joinGame,
    flipCard,
    askQuestion,
    answerQuestion,
    makeGuess,
    leaveGame,
    selectSecretWord,
    endTurn,
    updatePlayerName,
    setSecretWordHidden,
    dispatch,
    joinedGameCodeRef,
  } = useGame();

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const reset = () => {
    dispatch({ type: "RESET" });
  };

  return {
    joinGame,
    flipCard,
    askQuestion,
    answerQuestion,
    makeGuess,
    leaveGame,
    selectSecretWord,
    endTurn,
    updatePlayerName,
    setSecretWordHidden,
    clearError,
    reset,
    joinedGameCodeRef,
  };
}
