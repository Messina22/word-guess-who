import { WordCard } from "./WordCard";
import { useGameState } from "@client/hooks/useGameState";
import { useGameActions } from "@client/hooks/useGameActions";

export function GameBoard() {
  const { cards, myFlippedCards, opponentFlippedCards, mySecretWord, winner } =
    useGameState();
  const { flipCard } = useGameActions();

  const secretIndex = cards.findIndex((c) => c.word === mySecretWord);

  const gridCols =
    cards.length <= 12
      ? 4
      : cards.length <= 16
        ? 4
        : cards.length <= 20
          ? 5
          : 6;

  return (
    <div className="paper-card p-4 sm:p-6">
      <div
        className="grid gap-2 sm:gap-3"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card) => (
          <WordCard
            key={card.index}
            card={card}
            isFlipped={myFlippedCards.includes(card.index)}
            isSecret={card.index === secretIndex}
            isOpponentFlipped={opponentFlippedCards.includes(card.index)}
            onClick={() => flipCard(card.index)}
            disabled={winner !== null}
          />
        ))}
      </div>
    </div>
  );
}
