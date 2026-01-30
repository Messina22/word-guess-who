import { useGameState } from "@client/hooks/useGameState";
import { useGameActions } from "@client/hooks/useGameActions";
import type { CardState } from "@shared/types";

interface SelectionCardProps {
  card: CardState;
  onClick: () => void;
}

function SelectionCard({ card, onClick }: SelectionCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="word-card aspect-[4/3] p-2 cursor-pointer hover:scale-105 transition-transform"
      aria-label={`Select ${card.word} as your secret word`}
    >
      <div className="word-card-inner">
        <div className="word-card-front bg-lined-paper p-2">
          <span className="font-word text-lg sm:text-xl md:text-2xl text-pencil text-center break-words">
            {card.word}
          </span>
        </div>
      </div>
    </div>
  );
}

export function WordSelectionScreen() {
  const { cards, hasSelectedWord, opponentHasSelected, mySecretWord, opponent } =
    useGameState();
  const { selectSecretWord } = useGameActions();

  const gridCols =
    cards.length <= 12
      ? 4
      : cards.length <= 16
        ? 4
        : cards.length <= 20
          ? 5
          : 6;

  if (hasSelectedWord) {
    return (
      <div className="paper-card p-8 max-w-md mx-auto text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">⭐</span>
          </div>
          <h2 className="font-display text-2xl text-pencil mb-2">
            Your Secret Word
          </h2>
          <div className="inline-block bg-lined-paper rounded-lg p-4 shadow-md">
            <span className="font-word text-3xl text-pencil">{mySecretWord}</span>
          </div>
        </div>

        <div className="border-t border-pencil/20 pt-6">
          {opponentHasSelected ? (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <p className="font-ui text-pencil/70">
                {opponent?.name ?? "Opponent"} has selected. Starting game...
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div
                  className="w-2 h-2 bg-tangerine rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-tangerine rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-tangerine rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <p className="font-ui text-pencil/70">
                Waiting for {opponent?.name ?? "opponent"} to select their word...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-display text-2xl text-pencil mb-2">
          Choose Your Secret Word
        </h2>
        <p className="font-ui text-pencil/70">
          Click on a word to select it as your secret word. Your opponent will try to guess it!
        </p>
        {opponentHasSelected && (
          <p className="font-ui text-sm text-green-600 mt-2">
            {opponent?.name ?? "Opponent"} has selected their word
          </p>
        )}
      </div>

      <div className="paper-card p-4 sm:p-6">
        <div
          className="grid gap-2 sm:gap-3"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
          }}
        >
          {cards.map((card) => (
            <SelectionCard
              key={card.index}
              card={card}
              onClick={() => selectSecretWord(card.index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
