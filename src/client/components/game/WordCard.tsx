import { memo } from "react";
import type { CardState } from "@shared/types";

interface WordCardProps {
  card: CardState;
  isFlipped: boolean;
  isSecret: boolean;
  isOpponentFlipped: boolean;
  onClick: () => void;
  disabled: boolean;
}

export const WordCard = memo(function WordCard({
  card,
  isFlipped,
  isSecret,
  isOpponentFlipped,
  onClick,
  disabled,
}: WordCardProps) {
  const handleClick = () => {
    // Players can flip any card including their own secret word
    // (useful when a question eliminates their secret word as a possibility)
    if (!disabled) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const isClickable = !disabled;

  return (
    <div
      role="button"
      tabIndex={isClickable ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        word-card aspect-[4/3] p-2
        ${isFlipped ? "flipped" : ""}
        ${isSecret ? "secret" : ""}
        ${isOpponentFlipped ? "opacity-50" : ""}
        ${isClickable ? "cursor-pointer" : "cursor-default"}
      `}
      aria-label={`Word card: ${card.word}${isFlipped ? " (flipped - click to flip back)" : ""}${isSecret ? " (your secret word)" : ""}`}
    >
      <div className="word-card-inner">
        <div className="word-card-front bg-lined-paper p-2">
          <span className="font-word text-lg sm:text-xl md:text-2xl text-pencil text-center break-words">
            {card.word}
          </span>
          {isSecret && (
            <div className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center">
              <span className="text-2xl" role="img" aria-label="star">
                ⭐
              </span>
            </div>
          )}
        </div>
        <div className="word-card-back">
          <span className="font-display text-2xl text-pencil/40">X</span>
        </div>
      </div>
    </div>
  );
});
