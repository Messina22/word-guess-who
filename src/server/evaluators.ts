/**
 * Question evaluators for auto-answering yes/no questions about words
 */

/** Evaluator function type */
export type Evaluator = (word: string, params?: Record<string, unknown>) => boolean;

/** Check if word contains a specific letter (case-insensitive) */
export function containsLetter(word: string, params?: Record<string, unknown>): boolean {
  const letter = params?.letter;
  if (typeof letter !== "string" || letter.length !== 1) {
    return false;
  }
  return word.toLowerCase().includes(letter.toLowerCase());
}

/** Check if word length is greater than a specified value */
export function lengthGreaterThan(word: string, params?: Record<string, unknown>): boolean {
  const length = params?.length;
  if (typeof length !== "number") {
    return false;
  }
  return word.length > length;
}

/** Check if word length is less than a specified value */
export function lengthLessThan(word: string, params?: Record<string, unknown>): boolean {
  const length = params?.length;
  if (typeof length !== "number") {
    return false;
  }
  return word.length < length;
}

/** Check if word length equals a specified value */
export function lengthEquals(word: string, params?: Record<string, unknown>): boolean {
  const length = params?.length;
  if (typeof length !== "number") {
    return false;
  }
  return word.length === length;
}

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/** Check if word starts with a vowel */
export function startsWithVowel(word: string): boolean {
  if (word.length === 0) return false;
  return VOWELS.has(word[0].toLowerCase());
}

/** Check if word starts with a consonant */
export function startsWithConsonant(word: string): boolean {
  if (word.length === 0) return false;
  const firstChar = word[0].toLowerCase();
  return /[a-z]/.test(firstChar) && !VOWELS.has(firstChar);
}

/** Check if word ends with a vowel */
export function endsWithVowel(word: string): boolean {
  if (word.length === 0) return false;
  return VOWELS.has(word[word.length - 1].toLowerCase());
}

/** Check if word ends with a consonant */
export function endsWithConsonant(word: string): boolean {
  if (word.length === 0) return false;
  const lastChar = word[word.length - 1].toLowerCase();
  return /[a-z]/.test(lastChar) && !VOWELS.has(lastChar);
}

/** Check if word has any double letters (consecutive same letters) */
export function hasDoubleLetters(word: string): boolean {
  const lower = word.toLowerCase();
  for (let i = 0; i < lower.length - 1; i++) {
    if (lower[i] === lower[i + 1]) {
      return true;
    }
  }
  return false;
}

/** Check if word starts with a specific letter (case-insensitive) */
export function startsWithLetter(word: string, params?: Record<string, unknown>): boolean {
  const letter = params?.letter;
  if (typeof letter !== "string" || letter.length !== 1) {
    return false;
  }
  return word.length > 0 && word[0].toLowerCase() === letter.toLowerCase();
}

/** Check if word ends with a specific letter (case-insensitive) */
export function endsWithLetter(word: string, params?: Record<string, unknown>): boolean {
  const letter = params?.letter;
  if (typeof letter !== "string" || letter.length !== 1) {
    return false;
  }
  return word.length > 0 && word[word.length - 1].toLowerCase() === letter.toLowerCase();
}

/** Count vowels in word */
export function vowelCountGreaterThan(word: string, params?: Record<string, unknown>): boolean {
  const count = params?.count;
  if (typeof count !== "number") {
    return false;
  }
  const vowelCount = word.toLowerCase().split("").filter((c) => VOWELS.has(c)).length;
  return vowelCount > count;
}

/** Check if word has exactly one syllable (approximation: count vowel groups) */
export function hasOneSyllable(word: string): boolean {
  // Simple approximation: count groups of consecutive vowels
  const vowelGroups = word.toLowerCase().match(/[aeiou]+/g);
  return vowelGroups !== null && vowelGroups.length === 1;
}

/** Check if word has more than one syllable */
export function hasMultipleSyllables(word: string): boolean {
  const vowelGroups = word.toLowerCase().match(/[aeiou]+/g);
  return vowelGroups !== null && vowelGroups.length > 1;
}

/** Check if word contains a specific pattern/substring (case-insensitive) */
export function containsPattern(word: string, params?: Record<string, unknown>): boolean {
  const pattern = params?.pattern;
  if (typeof pattern !== "string") {
    return false;
  }
  return word.toLowerCase().includes(pattern.toLowerCase());
}

/** Registry of all evaluators by name */
export const evaluators: Record<string, Evaluator> = {
  containsLetter,
  lengthGreaterThan,
  lengthLessThan,
  lengthEquals,
  startsWithVowel,
  startsWithConsonant,
  endsWithVowel,
  endsWithConsonant,
  hasDoubleLetters,
  startsWithLetter,
  endsWithLetter,
  vowelCountGreaterThan,
  hasOneSyllable,
  hasMultipleSyllables,
  containsPattern,
};

/**
 * Evaluate a question against a word using the specified evaluator
 * @param word The word to evaluate
 * @param evaluatorName The name of the evaluator function
 * @param params Optional parameters for the evaluator
 * @returns The boolean result, or null if evaluator not found
 */
export function evaluate(
  word: string,
  evaluatorName: string,
  params?: Record<string, unknown>
): boolean | null {
  const evaluator = evaluators[evaluatorName];
  if (!evaluator) {
    return null;
  }
  return evaluator(word, params);
}
